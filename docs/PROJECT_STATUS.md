# Status proyek

Dokumen ini merangkum struktur yang ada pada source aktif di repository. Ini bukan sertifikasi kualitas, laporan uptime, atau bukti deployment ke server tertentu.

## Area produk

| Area | Source utama | Keterangan |
| --- | --- | --- |
| Authentication | `backend/src/domains/auth/` | Login berbasis JWT dan password bcrypt; halaman terlindungi memakai token |
| Assets / CMDB | `backend/src/domains/assets/` | Aset dan tipe aset |
| Monitoring | `backend/src/domains/monitoring/` | Plugin HTTP, Ping, SSL dan scheduler; form UI saat ini hanya menyediakan field konfigurasi HTTP/Ping |
| Alerts / Incidents | `backend/src/domains/alerts/` | Alert rule, event incident, status, timeline, dan komentar |
| CVE Feed | `backend/src/domains/vulnerabilities/` | Sinkronisasi incremental NVD, katalog CISA KEV, feed terfilter, dan notifikasi untuk CVE High/Critical atau KEV baru |
| Notifications | `backend/src/domains/notifications/` | Adapter Telegram, Discord, Email, dan Webhook |
| SLA | `backend/src/domains/sla/` | Target uptime dan laporan |
| Topology | `backend/src/domains/topology/` | Relasi dan graph dependency aset |
| Logs | `backend/src/domains/logs/` | Ingest, pencarian, dan statistik log |
| Docker | `backend/src/domains/docker/` | SSH host, operasi Docker/Compose, monitor host, dan alert threshold |
| Audit | `backend/src/domains/audit/` | Route dan layanan audit/health/metrics |

UI memiliki halaman untuk dashboard, assets, monitoring, alerts, incidents, CVE Feed, notifications, SLA, topology, logs, Docker, settings, dan help.

## Cara membaca status ini

- Baris di atas menunjukkan kemampuan yang memiliki source; statusnya belum diverifikasi ulang terhadap semua skenario runtime.
- Service eksternal seperti Telegram, SMTP, webhook, SSH, dan Redis memerlukan konfigurasi di lingkungan pemakai.
- Data health, SLA, incident, dan log bergantung pada konektivitas, scheduler, retensi, dan volume data.
- Compose adalah setup lokal/development dan belum mewakili deployment production yang hardened.

## Area yang perlu validasi sebelum rilis

1. Jalankan build frontend dan pemeriksaan backend pada lingkungan CI.
2. Uji migrasi pada database kosong dan database yang telah berisi data.
3. Uji alur login, CRUD aset/check/alert, incident, kanal notifikasi, dan Docker SSH.
4. Siapkan pengelolaan secret, TLS, backup/restore, kebijakan akses, dan monitoring aplikasi untuk deployment target.

Untuk struktur source lihat [Arsitektur](ARCHITECTURE.md); untuk prosedur lokal lihat [Deployment](DEPLOYMENT.md).
