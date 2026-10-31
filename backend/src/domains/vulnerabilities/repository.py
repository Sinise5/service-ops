from datetime import datetime
import json
from typing import Any

from ...database import db


class VulnerabilityRepository:
    async def list_feed(
        self,
        limit: int = 50,
        offset: int = 0,
        query: str = "",
        severity: str = "",
        kev_only: bool = False,
        days: int = 30,
    ) -> dict[str, Any]:
        filters = ["published_at >= NOW() - (%s * INTERVAL '1 day')"]
        values: list[Any] = [days]

        if query:
            filters.append("(cve_id ILIKE %s OR description ILIKE %s)")
            values.extend([f"%{query}%", f"%{query}%"])
        if severity:
            filters.append("severity = %s")
            values.append(severity)
        if kev_only:
            filters.append("known_exploited = TRUE")

        where_sql = " AND ".join(filters)
        async with db.get_connection() as conn:
            count_result = await conn.execute(
                f"SELECT COUNT(*) AS total FROM vulnerability_feed WHERE {where_sql}",
                tuple(values),
            )
            count_row = await count_result.fetchone()
            summary_result = await conn.execute(
                """SELECT COUNT(*) AS total,
                          COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
                          COUNT(*) FILTER (WHERE severity = 'high') AS high,
                          COUNT(*) FILTER (WHERE known_exploited = TRUE) AS kev
                   FROM vulnerability_feed
                   WHERE published_at >= NOW() - (%s * INTERVAL '1 day')""",
                (days,),
            )
            summary_row = await summary_result.fetchone()

            rows_result = await conn.execute(
                f"""SELECT cve_id, description, published_at, last_modified_at,
                           severity, cvss_score, cvss_version, source_identifier,
                           vuln_status, cwe_ids, reference_urls, known_exploited,
                           kev_date_added, kev_due_date, first_seen_at
                    FROM vulnerability_feed
                    WHERE {where_sql}
                    ORDER BY known_exploited DESC,
                             CASE severity
                                 WHEN 'critical' THEN 0
                                 WHEN 'high' THEN 1
                                 WHEN 'medium' THEN 2
                                 WHEN 'low' THEN 3
                                 ELSE 4
                             END,
                             published_at DESC NULLS LAST
                    LIMIT %s OFFSET %s""",
                tuple(values + [limit, offset]),
            )
            rows = await rows_result.fetchall()

        items = []
        for row in rows:
            item = dict(row)
            if item.get("cvss_score") is not None:
                item["cvss_score"] = float(item["cvss_score"])
            for key in ("published_at", "last_modified_at", "first_seen_at", "kev_date_added", "kev_due_date"):
                value = item.get(key)
                if value is not None:
                    item[key] = value.isoformat()
            item["nvd_url"] = f"https://nvd.nist.gov/vuln/detail/{item['cve_id']}"
            items.append(item)

        return {
            "items": items,
            "total": count_row["total"],
            "limit": limit,
            "offset": offset,
            "summary": dict(summary_row),
        }

    async def get_state(self) -> dict[str, Any]:
        async with db.get_connection() as conn:
            result = await conn.execute("SELECT * FROM vulnerability_feed_state WHERE id = 1")
            row = await result.fetchone()

        state = dict(row) if row else {}
        for key in ("last_synced_at", "last_success_at", "last_attempt_at", "last_kev_sync_at"):
            value = state.get(key)
            if value is not None:
                state[key] = value.isoformat()
        return state

    async def save_attempt(self, attempted_at: datetime) -> None:
        async with db.get_connection() as conn:
            await conn.execute(
                "UPDATE vulnerability_feed_state SET last_attempt_at = %s, last_error = NULL WHERE id = 1",
                (attempted_at,),
            )

    async def save_error(self, error: str) -> None:
        async with db.get_connection() as conn:
            await conn.execute(
                "UPDATE vulnerability_feed_state SET last_error = %s WHERE id = 1",
                (error[:1000],),
            )

    async def save_kev(self, entries: dict[str, dict], synced_at: datetime) -> list[dict]:
        async with db.get_connection() as conn:
            newly_listed_result = await conn.execute(
                """SELECT cve_id, description, published_at, severity, cvss_score
                   FROM vulnerability_feed
                   WHERE known_exploited = FALSE AND cve_id = ANY(%s)""",
                (list(entries),),
            )
            newly_listed = [dict(row) for row in await newly_listed_result.fetchall()]
            await conn.execute(
                "UPDATE vulnerability_feed SET known_exploited = FALSE, kev_date_added = NULL, kev_due_date = NULL WHERE known_exploited = TRUE"
            )
            for cve_id, entry in entries.items():
                await conn.execute(
                    """UPDATE vulnerability_feed
                       SET known_exploited = TRUE, kev_date_added = %s, kev_due_date = %s,
                           updated_at = NOW()
                       WHERE cve_id = %s""",
                    (entry.get("dateAdded"), entry.get("dueDate"), cve_id),
                )
            await conn.execute(
                "UPDATE vulnerability_feed_state SET last_kev_sync_at = %s, kev_last_error = NULL WHERE id = 1",
                (synced_at,),
            )
        for record in newly_listed:
            record["is_kev"] = True
        return newly_listed

    async def save_kev_error(self, error: str) -> None:
        async with db.get_connection() as conn:
            await conn.execute(
                "UPDATE vulnerability_feed_state SET kev_last_error = %s WHERE id = 1",
                (error[:1000],),
            )

    async def save_records(
        self,
        records: list[dict],
        synced_at: datetime,
        kev_entries: dict[str, dict],
    ) -> tuple[list[dict], int, int]:
        if not records:
            async with db.get_connection() as conn:
                await conn.execute(
                    """UPDATE vulnerability_feed_state
                       SET last_synced_at = %s, last_success_at = %s,
                           last_record_count = 0, last_error = NULL, initialized = TRUE
                       WHERE id = 1""",
                    (synced_at, synced_at),
                )
            return [], 0, 0

        alert_candidates: list[dict] = []
        inserted_count = 0
        async with db.get_connection() as conn:
            # Serialize concurrent syncs so insert detection and notifications remain idempotent.
            await conn.execute("SELECT pg_advisory_xact_lock(731905, 1)")
            cve_ids = [record["cve_id"] for record in records]
            existing_result = await conn.execute(
                "SELECT cve_id, severity, known_exploited FROM vulnerability_feed WHERE cve_id = ANY(%s)",
                (cve_ids,),
            )
            existing = {row["cve_id"]: dict(row) for row in await existing_result.fetchall()}

            for record in records:
                kev = kev_entries.get(record["cve_id"], {})
                previous = existing.get(record["cve_id"])
                is_new = previous is None
                if is_new:
                    inserted_count += 1
                current_is_kev = record["cve_id"] in kev_entries
                current_is_alertable = record["severity"] in {"high", "critical"} or current_is_kev
                became_kev = current_is_kev and previous is not None and not previous["known_exploited"]
                escalated_to_critical = (
                    record["severity"] == "critical"
                    and previous is not None
                    and previous["severity"] != "critical"
                )
                await conn.execute(
                    """INSERT INTO vulnerability_feed (
                           cve_id, description, published_at, last_modified_at,
                           severity, cvss_score, cvss_version, source_identifier,
                           vuln_status, cwe_ids, reference_urls, known_exploited,
                           kev_date_added, kev_due_date, raw_data, updated_at
                       ) VALUES (
                           %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb,
                           %s, %s, %s, %s::jsonb, NOW()
                       )
                       ON CONFLICT (cve_id) DO UPDATE SET
                           description = EXCLUDED.description,
                           published_at = EXCLUDED.published_at,
                           last_modified_at = EXCLUDED.last_modified_at,
                           severity = EXCLUDED.severity,
                           cvss_score = EXCLUDED.cvss_score,
                           cvss_version = EXCLUDED.cvss_version,
                           source_identifier = EXCLUDED.source_identifier,
                           vuln_status = EXCLUDED.vuln_status,
                           cwe_ids = EXCLUDED.cwe_ids,
                           reference_urls = EXCLUDED.reference_urls,
                           known_exploited = CASE WHEN EXCLUDED.known_exploited THEN TRUE ELSE vulnerability_feed.known_exploited END,
                           kev_date_added = COALESCE(EXCLUDED.kev_date_added, vulnerability_feed.kev_date_added),
                           kev_due_date = COALESCE(EXCLUDED.kev_due_date, vulnerability_feed.kev_due_date),
                           raw_data = EXCLUDED.raw_data,
                           updated_at = NOW()""",
                    (
                        record["cve_id"], record["description"], record["published_at"],
                        record["last_modified_at"], record["severity"], record["cvss_score"],
                        record["cvss_version"], record["source_identifier"], record["vuln_status"],
                        record["cwe_ids"], json.dumps(record["reference_urls"]),
                        record["cve_id"] in kev_entries, kev.get("dateAdded"), kev.get("dueDate"),
                        json.dumps(record["raw_data"]),
                    ),
                )
                if (is_new and current_is_alertable) or became_kev or escalated_to_critical:
                    alert_candidates.append({**record, "is_kev": current_is_kev})

            await conn.execute(
                """UPDATE vulnerability_feed_state
                   SET last_synced_at = %s, last_success_at = %s,
                       last_record_count = %s, last_error = NULL, initialized = TRUE
                   WHERE id = 1""",
                (synced_at, synced_at, len(records)),
            )

        return alert_candidates, inserted_count, len(records)
