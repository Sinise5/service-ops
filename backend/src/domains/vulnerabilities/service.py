import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from ...config import settings
from ...database import db
from ..notifications.service import NotificationService
from .repository import VulnerabilityRepository

logger = logging.getLogger(__name__)

NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _normalize_cve(item: dict) -> dict | None:
    cve = item.get("cve") or {}
    cve_id = cve.get("id")
    if not cve_id or (cve.get("vulnStatus") or "").lower() in {"rejected", "reject"}:
        return None

    descriptions = cve.get("descriptions") or []
    description = next((d.get("value", "") for d in descriptions if d.get("lang") == "en"), "")

    metrics = cve.get("metrics") or {}
    preferred_metrics = ("cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2")
    score = None
    severity = "unknown"
    cvss_version = None
    for metric_name in preferred_metrics:
        metric_rows = metrics.get(metric_name) or []
        if not metric_rows:
            continue
        cvss = metric_rows[0].get("cvssData") or {}
        if cvss.get("baseScore") is not None:
            score = cvss["baseScore"]
            severity = (cvss.get("baseSeverity") or metric_rows[0].get("baseSeverity") or "unknown").lower()
            cvss_version = cvss.get("version")
            break

    cwe_ids = []
    for weakness in cve.get("weaknesses") or []:
        for description_item in weakness.get("description") or []:
            value = description_item.get("value", "")
            if value.startswith("CWE-") and value not in cwe_ids:
                cwe_ids.append(value)

    references = [
        {"url": reference.get("url"), "tags": reference.get("tags", [])}
        for reference in (cve.get("references") or [])[:20]
        if reference.get("url")
    ]

    return {
        "cve_id": cve_id,
        "description": description,
        "published_at": _parse_datetime(cve.get("published")),
        "last_modified_at": _parse_datetime(cve.get("lastModified")),
        "severity": severity,
        "cvss_score": score,
        "cvss_version": cvss_version,
        "source_identifier": cve.get("sourceIdentifier"),
        "vuln_status": cve.get("vulnStatus"),
        "cwe_ids": cwe_ids,
        "reference_urls": references,
        "raw_data": item,
    }


class VulnerabilityFeedService:
    def __init__(self):
        self.repository = VulnerabilityRepository()
        self.notification_service = NotificationService()
        self._sync_lock = asyncio.Lock()

    async def _fetch_kev(self, client: httpx.AsyncClient) -> dict[str, dict]:
        response = await client.get(KEV_URL)
        response.raise_for_status()
        payload = response.json()
        vulnerabilities = payload.get("vulnerabilities")
        if not isinstance(vulnerabilities, list) or not vulnerabilities:
            raise ValueError("CISA KEV response does not contain a non-empty vulnerabilities list")
        return {
            item["cveID"]: item
            for item in vulnerabilities
            if isinstance(item, dict)
            if item.get("cveID")
        }

    async def _fetch_nvd(self, client: httpx.AsyncClient, start: datetime, end: datetime) -> list[dict]:
        start_index = 0
        records: list[dict] = []
        headers = {"apiKey": settings.nvd_api_key} if settings.nvd_api_key else None

        while True:
            params = {
                "lastModStartDate": start.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "lastModEndDate": end.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "resultsPerPage": 2000,
                "startIndex": start_index,
            }
            response = await client.get(NVD_URL, params=params, headers=headers)
            response.raise_for_status()
            payload = response.json()
            vulnerabilities = payload.get("vulnerabilities") or []
            if not isinstance(vulnerabilities, list):
                raise ValueError("NVD response does not contain a vulnerabilities list")
            records.extend(
                normalized for raw in vulnerabilities
                if (normalized := _normalize_cve(raw)) is not None
            )
            total = int(payload.get("totalResults", len(records)))
            start_index += len(vulnerabilities)
            if start_index >= total or not vulnerabilities:
                break
            # NVD's unauthenticated request limit is lower; pace pagination conservatively.
            await asyncio.sleep(6)

        return records

    async def sync(self, force: bool = False) -> dict[str, Any]:
        if self._sync_lock.locked():
            return {"success": False, "message": "A CVE feed sync is already running."}

        async with self._sync_lock:
            now = datetime.now(timezone.utc)
            await self.repository.save_attempt(now)
            state = await self.repository.get_state()
            kev_entries: dict[str, dict] = {}
            newly_kept: list[dict] = []
            headers = {"User-Agent": "ServiceOps-CVE-Feed/1.0"}

            async with httpx.AsyncClient(timeout=httpx.Timeout(25.0), headers=headers) as client:
                last_kev_sync = _parse_datetime(state.get("last_kev_sync_at"))
                kev_due = force or last_kev_sync is None or (
                    now - last_kev_sync >= timedelta(seconds=max(60, settings.kev_refresh_interval_seconds))
                )
                if kev_due:
                    try:
                        kev_entries = await self._fetch_kev(client)
                        newly_kept = await self.repository.save_kev(kev_entries, now)
                    except Exception as error:
                        logger.warning("CISA KEV refresh failed: %s", error)
                        await self.repository.save_kev_error(str(error))
                        if force:
                            # Still proceed with NVD so a CISA outage cannot block CVE updates.
                            pass
                else:
                    # Include already known KEVs on new NVD records without refetching the catalog.
                    async with db.get_connection() as conn:
                        result = await conn.execute("SELECT cve_id, kev_date_added, kev_due_date FROM vulnerability_feed WHERE known_exploited = TRUE")
                        rows = await result.fetchall()
                        kev_entries = {
                            row["cve_id"]: {
                                "dateAdded": row["kev_date_added"].isoformat() if row["kev_date_added"] else None,
                                "dueDate": row["kev_due_date"].isoformat() if row["kev_due_date"] else None,
                            }
                            for row in rows
                        }

                last_synced = _parse_datetime(state.get("last_synced_at"))
                start = (last_synced - timedelta(minutes=30)) if last_synced else (now - timedelta(hours=1))
                try:
                    records = await self._fetch_nvd(client, start, now)
                    alert_candidates, inserted_count, processed = await self.repository.save_records(records, now, kev_entries)
                except Exception as error:
                    logger.exception("NVD CVE feed sync failed")
                    await self.repository.save_error(str(error))
                    if state.get("initialized") and newly_kept:
                        await self._notify_new_records(newly_kept)
                    return {"success": False, "message": str(error), "records_processed": 0}

            notify_by_id = {record["cve_id"]: record for record in [*newly_kept, *alert_candidates]}
            notify = list(notify_by_id.values())
            # The first successful pass populates the feed without sending a backlog of alerts.
            if not state.get("initialized"):
                notify = []
            if notify:
                await self._notify_new_records(notify)

            return {
                "success": True,
                "records_processed": processed,
                "new_records": inserted_count,
                "notifications_queued": len(notify),
                "checked_at": now.isoformat(),
            }

    async def _notify_new_records(self, records: list[dict]) -> None:
        records.sort(key=lambda record: (
            record["severity"] != "critical",
            -(record["published_at"].timestamp() if record["published_at"] else 0),
        ))
        lines = [f"ServiceOps: {len(records)} CVE baru terdeteksi (High/Critical atau CISA KEV)."]
        for record in records[:10]:
            score = f" ({record['cvss_score']})" if record["cvss_score"] is not None else ""
            kev = " — CISA KEV" if record["is_kev"] else ""
            lines.append(f"• {record['cve_id']} | {record['severity'].upper()}{score}{kev}")
        if len(records) > 10:
            lines.append(f"…dan {len(records) - 10} CVE lainnya. Buka CVE Feed di ServiceOps untuk detail.")
        await self.notification_service.send_to_all_channels("\n".join(lines))


vulnerability_feed_service = VulnerabilityFeedService()
