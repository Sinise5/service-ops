# ServiceOps Platform — Project Overview & Complete Documentation

**Version:** 1.0.0  
**Status:** Production Ready (Phase 14)  
**Last Updated:** 19 Juni 2026  
**Repository:** [gitlab.com/QTI/QTI-Research/service-ops](https://gitlab.com/QTI/QTI-Research/service-ops)

---

## 📋 Daftar Isi

1. [Apa itu ServiceOps?](#1-apa-itu-serviceops)
2. [Masalah yang Dipecahkan](#2-masalah-yang-dipecahkan)
3. [Goal & Vision](#3-goal--vision)
4. [Fitur Utama](#4-fitur-utama)
5. [Arsitektur Sistem](#5-arsitektur-sistem)
6. [Tech Stack](#6-tech-stack)
7. [Use Case & Skenario](#7-use-case--skenario)
8. [Cara Menggunakan](#8-cara-menggunakan)
9. [Roadmap & Future Plans](#9-roadmap--future-plans)
10. [Perbandingan dengan Tools Lain](#10-perbandingan-dengan-tools-lain)

---

## 1. Apa itu ServiceOps?

**ServiceOps** adalah platform monitoring dan observability open-source yang dirancang untuk tim DevOps dan SRE. Platform ini menggabungkan:

- **CMDB (Configuration Management Database)** — Katalog lengkap infrastruktur IT
- **Monitoring & Health Checks** — Pemantauan otomatis HTTP, Ping, SSL, TCP
- **Alerting & Incident Management** — Deteksi masalah dan pengelolaan insiden
- **Notifications** — Integrasi Telegram, Discord, Email, Webhook
- **SLA Tracking** — Pelacakan uptime dan target SLA
- **Topology Mapping** — Visualisasi dependency antar aset

### Analoginya

ServiceOps seperti **"mission control center"** untuk infrastruktur IT:
- Seperti **Datadog/New Relic** tapi open-source dan self-hosted
- Seperti **Nagios/Zabbix** tapi dengan UI modern dan mudah digunakan
- Seperti **PagerDuty** tapi terintegrasi langsung dengan monitoring

---

## 2. Masalah yang Dipecahkan

### Masalah Umum Tim DevOps

**Sebelum ServiceOps:**
- ❌ Tim tidak tahu server mana yang down sampai user komplain
- ❌ Dokumentasi infrastruktur tidak lengkap atau outdated
- ❌ Monitoring tersebar di berbagai tools (Pingdom, UptimeRobot, script custom)
- ❌ Notifikasi alert tidak real-time atau tidak terorganisir
- ❌ Tidak ada tracking SLA — laporan uptime manual via Excel
- ❌ Dependency antar service tidak terdokumentasi
- ❌ Log tersebar di berbagai tempat, sulit dicari

**Setelah ServiceOps:**
- ✅ Monitoring otomatis setiap 30-300 detik untuk semua aset
- ✅ CMDB sebagai single source of truth untuk infrastruktur
- ✅ Alert langsung ke Telegram/Discord/Email saat ada masalah
- ✅ Incident management dengan timeline dan resolusi tracking
- ✅ SLA tracking otomatis dengan laporan bulanan
- ✅ Dependency graph untuk analisis dampak kegagalan
- ✅ Centralized logging dengan full-text search

### Problem Statement

**"Bagaimana tim kecil (2-10 orang) bisa monitoring ratusan server/API/database tanpa dedicated SRE dan tanpa budget tools enterprise seperti Datadog ($15-31/host/bulan)?"**

**Jawaban:** ServiceOps — self-hosted, open-source, gratis, dan mudah di-setup.

---

## 3. Goal & Vision

### Goal Jangka Pendek (2026)

1. **Production-ready platform** untuk monitoring 100-500 aset ✅
2. **Multi-tenant support** untuk multiple teams/projects
3. **Plugin ecosystem** untuk custom check types
4. **Mobile app** (React Native) untuk on-call engineers
5. **Advanced analytics** — trend analysis, anomaly detection

### Vision Jangka Panjang (2027-2028)

**"Menjadi platform observability terpadu yang demokratis — accessible untuk tim kecil, powerful untuk enterprise."**

- **Open-source alternative** untuk Datadog/New Relic
- **Community-driven** dengan plugin marketplace
- **AI-powered insights** — auto-remediation, root cause analysis
- **Multi-cloud support** — AWS, GCP, Azure, bare-metal
- **Cost optimization** — track infrastructure cost vs. SLA

---

## 4. Fitur Utama

### 4.1 Asset Management (CMDB)

**Apa itu:** Katalog lengkap semua resource IT yang perlu dimonitor.

**8 Tipe Asset:**
- **Server** — Physical/virtual machines, VPS, bare-metal
- **Database** — PostgreSQL, MySQL, MongoDB, Redis
- **API** — REST/GraphQL endpoints
- **Cache** — Redis, Memcached
- **Queue** — RabbitMQ, Kafka, SQS
- **Load Balancer** — nginx, HAProxy, AWS ALB
- **Storage** — S3, NFS, SAN
- **Other** — Custom assets (CDN, DNS, etc.)

**Fitur:**
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Metadata tags — environment (prod/staging), region, owner, cost center
- ✅ CSV bulk import — upload ratusan aset sekaligus
- ✅ Asset relationships — dependency mapping
- ✅ Status tracking — healthy/warning/critical
- ✅ Contact management — siapa PIC per aset

**Contoh Use Case:**
```
Asset: Production API Server
Type: Server
Environment: production
Region: jakarta
Owner: devops-team
Status: healthy
IP: 10.10.10.5
```

---

### 4.2 Monitoring & Health Checks

**Apa itu:** Automated testing untuk memastikan aset berjalan normal.

**4 Tipe Check:**

**1. HTTP Check**
- Test endpoint REST API
- Verify status code (200, 201, 204, dll)
- Measure response time (milliseconds)
- Check response body (regex match)

**Contoh:**
```
Check: API Health
Type: HTTP
URL: https://api.example.com/health
Method: GET
Expected Status: 200
Timeout: 5 seconds
Interval: 60 seconds (setiap 1 menit)
```

**2. Ping Check**
- ICMP connectivity test
- Measure latency (ms)
- Detect packet loss

**Contoh:**
```
Check: Server Ping
Type: Ping
Target: 192.168.1.100
Timeout: 5 seconds
Interval: 300 seconds (setiap 5 menit)
```

**3. SSL Certificate Check**
- Monitor certificate expiry
- Alert 30 days before expiration
- Validate certificate chain

**Contoh:**
```
Check: API SSL Certificate
Type: SSL
Host: api.example.com
Port: 443
Interval: 3600 seconds (setiap 1 jam)
```

**4. TCP Port Check**
- Verify port is open and accepting connections
- Test database ports, custom services

**Contoh:**
```
Check: PostgreSQL Port
Type: TCP
Host: db.example.com
Port: 5432
Timeout: 5 seconds
Interval: 120 seconds (setiap 2 menit)
```

**Fitur Monitoring:**
- ✅ Auto-scheduling — background worker executes checks automatically
- ✅ Result history — last 50 executions per check
- ✅ Response time tracking — graph performance over time
- ✅ Enable/disable toggle — pause monitoring without deleting
- ✅ Retry logic — 3 retries before marking as failed
- ✅ Concurrent execution — multiple checks run in parallel

---

### 4.3 Alerting & Incident Management

**Apa itu:** Rule-based system untuk deteksi masalah dan pengelolaan insiden.

**Alert Rule Components:**
- **Condition** — kapan alert trigger (e.g., `status_code != 200`)
- **Severity** — info/warning/critical
- **Threshold** — berapa kali failure sebelum trigger (1-10)
- **Check** — monitoring check yang di-watch

**Contoh Alert Rule:**
```
Rule: API Critical Alert
Check: API Health Check
Condition: status_code != 200
Severity: critical
Threshold: 1 (trigger on first failure)
Enabled: true
```

**Incident Lifecycle:**

```
1. TRIGGERED
   └─> Alert rule condition met
   └─> Incident auto-created
   └─> Status: open
   └─> Notification sent

2. ACKNOWLEDGED
   └─> Team member marks as "seen"
   └─> Status: acknowledged
   └─> Optional note: "Investigating..."

3. RESOLVED
   └─> Issue fixed
   └─> Status: resolved
   └─> Resolution note: "Restarted service"
   └─> Downtime calculated for SLA
```

**Fitur Incident Management:**
- ✅ Timeline tracking — full audit trail of actions
- ✅ Comments — team collaboration on incidents
- ✅ Assignment — assign incident to specific user
- ✅ Priority — reorder by severity
- ✅ Batch actions — acknowledge/resolve multiple incidents
- ✅ Export — CSV export for reporting

---

### 4.4 Notifications

**Apa itu:** Multi-channel delivery system untuk alert notifications.

**4 Channel Types:**

**1. Telegram**
- Bot-based instant alerts
- Group chat support
- Inline buttons for acknowledge/resolve

**Setup:**
```
1. Create bot via @BotFather
2. Get bot token
3. Add bot to group
4. Get chat ID
5. Configure in ServiceOps
6. Test delivery
```

**2. Discord**
- Webhook integration
- Rich embed messages
- Channel-specific routing

**3. Email**
- SMTP support (Gmail, Outlook, SendGrid)
- HTML templates
- Attachment support (incident reports)

**4. Webhooks**
- Custom HTTP callbacks
- JSON payload
- Integration with PagerDuty, Slack, custom apps

**Fitur Notifications:**
- ✅ Test channel — verify before going live
- ✅ Delivery logs — track success/failure
- ✅ Retry logic — 3 retries for failed deliveries
- ✅ Rate limiting — prevent spam
- ✅ Channel status — enabled/disabled toggle

---

### 4.5 SLA Tracking

**Apa itu:** Automated uptime tracking dan reporting.

**SLA Targets:**
- 99% = 7 jam 20 menit downtime/bulan
- 99.9% = 43 menit 50 detik downtime/bulan
- 99.99% = 4 menit 23 detik downtime/bulan
- 99.999% = 26 detik downtime/bulan

**Cara Kerja:**
```
1. Set target uptime per asset (e.g., 99.9%)
2. System tracks actual downtime dari incidents
3. Downtime = sum of (resolved_time - created_time)
4. Monthly report auto-generated
5. Pass/fail status based on target
```

**Contoh:**
```
Asset: Production API
Target: 99.9% uptime
Period: Monthly (Juni 2026)

Incidents:
- 2026-06-05 10:00-10:30 (30 min)
- 2026-06-12 14:00-14:15 (15 min)

Total downtime: 45 minutes
Monthly minutes: 43,200 (30 days)
Actual uptime: (43,200 - 45) / 43,200 = 99.896%

Result: ✅ PASS (99.896% > 99.9% target)
```

**Fitur SLA:**
- ✅ Per-asset targets
- ✅ Monthly/quarterly reports
- ✅ Trend charts
- ✅ Export to CSV/PDF
- ✅ Email reports — automatic monthly delivery

---

### 4.6 Topology & Dependency Mapping

**Apa itu:** Visual graph showing asset relationships.

**Dependency Types:**
- **depends_on** — A depends on B (A fails if B fails)
- **serves** — A serves B (A provides service to B)
- **backs_up** — A backs up B

**Contoh:**
```
Frontend App (depends_on) → API Server
API Server (depends_on) → Database
API Server (depends_on) → Redis Cache
Database (backs_up) → Backup Server
```

**Impact Analysis:**
```
If Database fails:
  Direct impact: API Server (1 hop)
  Indirect impact: Frontend App (2 hops)
  Total affected: 3 assets
```

**Fitur Topology:**
- ✅ Visual graph — interactive D3.js visualization
- ✅ Impact analysis — cascade failure simulation
- ✅ Shortest path — find dependency chain
- ✅ Export — graph data as JSON/GraphML

---

### 4.7 Centralized Logging

**Apa itu:** Log aggregation dan search platform.

**Log Ingestion:**
```bash
# Via API
curl -X POST http://localhost:9080/logs/ingest \
  -H "Authorization: Bearer ***  "Content-Type: application/json" \
  -d '{
    "asset_id": "uuid",
    "level": "error",
    "message": "Connection timeout to database",
    "metadata": {"service": "api", "trace_id": "abc123"}
  }'
```

**Log Levels:**
- **error** — Critical errors (red)
- **warn** — Warnings (yellow)
- **info** — Information (blue)
- **debug** — Debug messages (gray)

**Fitur Logging:**
- ✅ Full-text search — search across all logs
- ✅ Filter by asset — see logs per service
- ✅ Filter by level — error/warn/info/debug
- ✅ Time range — last 1h, 24h, 7d, custom
- ✅ Pagination — handle millions of logs
- ✅ Export — CSV export for analysis

