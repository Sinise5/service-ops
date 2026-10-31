# Ringkasan proyek

ServiceOps adalah aplikasi untuk mengelola operasi infrastruktur dari satu UI: inventaris aset, pemeriksaan monitoring, alert dan incident, kanal notifikasi, uptime/SLA, dependency aset, log, serta resource Docker pada mesin remote.

## Teknologi

- **Frontend:** SolidJS, TypeScript, Tailwind CSS, Vite
- **Backend:** Python, Robyn, psycopg v3
- **Penyimpanan:** PostgreSQL; Redis sebagai dependency backend
- **Remote Docker:** SSH dengan `asyncssh` dan command Docker pada host target
- **Local orchestration:** Docker Compose

## Struktur repository

```text
backend/
  src/domains/       # auth, assets, monitoring, alerts, notifications, SLA, topology, logs, Docker, audit
  migrations/        # migration SQL backend
  run_server.py      # startup koneksi DB/Redis dan scheduler
frontend/
  src/pages/         # halaman aplikasi
  src/components/    # layout dan komponen domain
docker-compose.yml   # stack lokal
init.sql             # schema utama untuk volume PostgreSQL baru
seed.sql             # data awal development
docker-migration.sql # schema tambahan untuk Docker/host alert
```

## Repository

GitHub: [Sinise5/service-ops](https://github.com/Sinise5/service-ops).

Lihat [README utama](../README.md) untuk quick start, [Arsitektur](ARCHITECTURE.md) untuk alur teknis, dan [Indeks dokumentasi](README.md) untuk panduan per fitur.
