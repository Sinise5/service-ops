# ServiceOps — Alert Rules Guide

**Version:** 1.0 | **Updated:** June 2026

---

## Overview

Alert Rules mendefinisikan kondisi kapan ServiceOps harus membuat incident dan mengirim notifikasi. Setiap rule terikat ke satu monitoring check. Evaluasi terjadi otomatis setiap kali check selesai dieksekusi.

```
Monitoring Check → Alert Rule → Incident Created → Notification Sent
```

---

## Alert Flow

```
1. Monitoring check executes (every 30-300s)
2. Result saved to check_results
3. Alert Rule conditions evaluated against result
4. If condition met → Incident created
5. If notification channel linked → Message sent
```

---

## Creating Alert Rules

### Step-by-Step

1. Buka halaman **Alerts** (sidebar)
2. Klik **+ New Rule**
3. Isi:

| Field | Description |
|-------|-------------|
| Name | Label rule (e.g. "Nginx Down Alert") |
| Check | Pilih monitoring check yang sudah ada |
| Condition(s) | Rules untuk trigger |
| Logic | AND / OR (multi-condition rules) |
| Severity | info / warning / critical |
| Enabled | Switch ON untuk aktif |

4. Klik **Save**

### Single-Condition Rules

**Contoh — Alert jika status check bukan 200:**
```
Condition Type: threshold_exceeded
Field: status
Operator: !=
Value: 200
```

**Contoh — Alert jika response time > 2 detik:**
```
Condition Type: threshold_exceeded
Field: response_time_ms
Operator: >
Value: 2000
```

### Multi-Condition Rules (AND / OR)

**AND — semua kondisi harus terpenuhi:**
```
Condition 1: response_time_ms > 1000
Condition 2: status == "failed"
Logic: AND
→ Alert hanya jika response time > 1s DAN status failed
```

**OR — salah satu kondisi terpenuhi:**
```
Condition 1: response_time_ms > 2000
Condition 2: status == "failed"
Logic: OR
→ Alert jika response time > 2s ATAU status failed
```

### Available Condition Fields

| Field | Type | Description |
|-------|------|-------------|
| `response_time_ms` | number | Response time in milliseconds |
| `status` | string | Check status (e.g. "200", "failed", "500") |
| `output` | string | Raw output from check |

### Operators

| Operator | Meaning | Used With |
|----------|---------|-----------|
| `>` | Greater than | number fields |
| `<` | Less than | number fields |
| `>=` | Greater or equal | number fields |
| `<=` | Less or equal | number fields |
| `==` | Equals | string / number fields |
| `!=` | Not equals | string / number fields |

---

## Incidents

### Lifecycle

| Status | Description |
|--------|-------------|
| `open` | Incident created by alert rule trigger |
| `acknowledged` | Someone has seen it |
| `resolved` | Fixed and closed |

### Actions

- **Acknowledge** — mark incident sebagai "diketahui tim" (tanpa close)
- **Resolve** — tutup incident dengan komentar penyebab
- **Add comment** — tiap komentar masuk ke timeline

### Incident vs Alert

- **Alert Rule** — defines the *condition* (if this happens...)
- **Incident** — the actual *event* (happened!)

Jika alert rule disabled, incident tidak terkunci — incident yang sudah open tetap bisa di-resolve manual.

---

## Linking Notifications

Alert rules bisa otomatis kirim notifikasi ke Telegram, Discord, Email, atau Webhook.

### Steps

1. Buka **Notifications** page
2. Buat channel (Telegram / Discord / Email / Webhook)
3. Di **Alert Rules**, pilih channel di field "Notification Channel"
4. Save rule

### Testing

Klik **Test** di Notification channel untuk verifikasi bahwa credential bener.

---

## Examples

### HTTP Check — Alert on 5xx

```
Check: GET https://api.example.com/health
Condition: status >= 500
Severity: critical
Trigger: jika API return 500+
```

### Ping Check — Server Unreachable

```
Check: Ping 10.10.10.200
Condition: status == "failed"
Severity: warning
Trigger: jika server tidak reachable
```

### SSL Check — Certificate Expiring

```
Check: SSL example.com:443
Condition: response_time_ms > 5000
Severity: warning
Trigger: jika response time lambat
```

### Complex — Multi-Condition

```
Check: GET https://api.example.com/users
Condition 1: response_time_ms > 5000
Condition 2: status >= 500
Logic: OR
Severity: critical
Trigger: timeout ATAU 5xx error
```

---

## Troubleshooting

### Incident not created but rule is on

1. Check status monitoring check — apakah check executing?
2. Check hasil di Monitoring > View Results
3. Pastikan rule condition match dengan actual result
4. Cek backend log: `docker logs serviceops-backend`

### Notification not sent

1. Channel connected? Test button
2. Channel assigned to alert rule?
3. Check notification_logs — ada entry failed?

### False positives

Adjust threshold:
- Response time: cari baseline normal dulu
- Status: exclude maintenance window

### Rule not evaluating

- Rule must be **enabled** (switch ON)
- Check must be **enabled**
- Check must have recent results (within last 10 minutes)

---

## API Reference

```
GET    /alert-rules             — List all rules
POST   /alert-rules             — Create rule
PUT    /alert-rules/:id         — Update rule
DELETE /alert-rules/:id         — Delete rule
PATCH  /alert-rules/:id/status  — Enable/disable

GET    /incidents               — List incidents
PUT    /incidents/:id/status    — Acknowledge / Resolve
POST   /incidents/:id/comments  — Add comment
```

**Request body (create rule):**
```json
{
  "name": "API Timeout Alert",
  "monitoring_check_id": "uuid",
  "conditions": [
    {"field": "response_time_ms", "operator": ">", "value": "5000"}
  ],
  "condition_logic": "AND",
  "severity": "critical",
  "notification_channel_id": "uuid",
  "enabled": true
}
```
