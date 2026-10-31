# ServiceOps

ServiceOps adalah aplikasi operasi infrastruktur untuk mengelola inventaris aset (CMDB), menjalankan pemeriksaan monitoring, mengatur alert dan incident, melihat log, melacak SLA, serta mengelola Docker di host jarak jauh melalui SSH.

Frontend menggunakan SolidJS dan Vite. Backend menggunakan Python, Robyn, PostgreSQL, dan Redis.


## Fitur

| Area | Fungsi |
| --- | --- |
| Dashboard | Ringkasan jumlah aset, check monitoring, aturan alert, dan incident |
| Assets | CRUD aset dan tipe aset untuk inventaris CMDB |
| Monitoring | HTTP dan Ping check terjadwal dari UI; backend juga memiliki plugin SSL, tetapi form UI SSL belum lengkap |
| Alerts & Incidents | Aturan alert, siklus incident, komentar, dan notifikasi |
| CVE Feed | CVE terbaru dari NVD, penanda CISA KEV, pencarian, filter, dan notifikasi prioritas |
| Notifications | Kanal Telegram, Discord, Email, dan Webhook |
| SLA | Target uptime, ringkasan, dan laporan |
| Topology | Relasi dependensi antar aset dan analisis dampak |
| Logs | Pencarian dan statistik log |
| Docker | Host SSH, container, image, volume, Compose, deploy, dan monitor host |
| Settings & Help | Profil, API key, panduan aplikasi |

> Integrasi eksternal seperti notifikasi dan host Docker memerlukan konfigurasi kredensial masing-masing. Fitur yang terlihat di UI tidak berarti sudah terhubung ke layanan eksternal.

## Persyaratan

- Docker Engine dengan Docker Compose, atau Docker Engine dengan executable `docker-compose`
- Git
- Untuk pengembangan tanpa container aplikasi: Python 3.11+, [uv](https://docs.astral.sh/uv/), dan Node.js 20+

## Mulai dengan Docker

Clone repository dan jalankan seluruh stack:

```bash
git clone https://github.com/Sinise5/service-ops.git
cd service-ops
cp .env.example .env
docker-compose up -d --build
```

Jika instalasi Docker Anda memiliki plugin Compose, gunakan `docker compose` sebagai pengganti `docker-compose`.

Alamat lokal:

| Layanan | Alamat |
| --- | --- |
| Aplikasi | http://localhost:5173 |
| Backend API | http://localhost:9080 |
| Health check | http://localhost:9080/health |
| PostgreSQL dari host | `localhost:15433` |
| Redis dari host | `localhost:16379` |

Database disiapkan oleh `init.sql` dan `seed.sql`; service `migrate` kemudian menerapkan tabel tambahan dari `docker-migration.sql`. Login seed untuk pengembangan: `admin@serviceops.local` / `admin123`. Jangan gunakan kredensial atau secret contoh untuk deployment.

Perintah umum:

```bash
docker-compose ps
docker-compose logs -f backend
docker-compose logs -f migrate
docker-compose down
```

`docker-compose down` mempertahankan volume database. Hindari `down -v` kecuali memang ingin menghapus seluruh data lokal.

## Pengembangan lokal

Jalankan PostgreSQL dan Redis melalui Compose:

```bash
cp .env.example .env
docker-compose up -d --build postgres redis
docker-compose run --build --rm migrate
```

Siapkan backend di terminal pertama:

```bash
cp backend/.env.example backend/.env
cd backend
uv sync
uv run python run_server.py
```

Siapkan frontend di terminal kedua:

```bash
cd frontend
npm ci
npm run dev
```

Buka http://localhost:5173. Vite meneruskan API melalui `/api`; backend tersedia di port 9080. Jika port lokal telah dipakai, ubah port host di `.env` dan sesuaikan `DATABASE_URL` dalam `backend/.env`.

## Perintah pengembangan

```bash
cd frontend
npm run dev       # server UI
npm run build     # build produksi
```

```bash
cd backend
uv sync           # pasang dependensi
uv run python run_server.py
```

`make help` menampilkan target Makefile. Target `make local-test` memerlukan test suite backend.

## Dokumentasi

Mulai dari [indeks dokumentasi](docs/README.md). Panduan utama:

- [Instalasi, konfigurasi, Docker, dan troubleshooting](docs/DEPLOYMENT.md)
- [Panduan penggunaan](docs/USER_GUIDE.md)
- [CVE Feed](docs/VULNERABILITY_FEED.md)
- [Arsitektur](docs/ARCHITECTURE.md)
- [Status proyek](docs/PROJECT_STATUS.md)
- [Monitoring](MONITORING_GUIDE.md)
- [Alert rules](ALERT_RULES_GUIDE.md)
- [Docker jarak jauh](docs/DOCKER_MANAGEMENT_GUIDE.md)

## Catatan konfigurasi

- `.env` pada root mengatur nilai Compose. Gunakan `.env.example` sebagai templat lokal.
- `backend/.env` hanya dibutuhkan jika menjalankan backend langsung di mesin host; templatnya tersedia di `backend/.env.example`.
- `.env` dan file lokal lain diabaikan Git. Jangan commit secret, key SSH, atau kredensial layanan.
- Compose saat ini ditujukan untuk pengembangan lokal. Tambahkan secret manager, TLS/reverse proxy, backup, dan hardening sebelum penggunaan production.

### Interval pembaruan CVE

Secara default, backend memeriksa NVD setiap 5 menit (`VULNERABILITY_FEED_INTERVAL_SECONDS=300`) dan katalog CISA KEV setiap 1 jam (`KEV_REFRESH_INTERVAL_SECONDS=3600`). Halaman CVE Feed mengambil ulang data dari backend setiap 60 detik. Atur dua variabel pertama di `.env` root, misalnya untuk sinkronisasi NVD tiap 10 menit:

```env
VULNERABILITY_FEED_INTERVAL_SECONDS=600
```

Setelah mengubah `.env`, terapkan nilai baru dengan membuat ulang container backend:

```bash
docker-compose up -d --force-recreate backend
```

Nilai interval minimum efektif adalah 60 detik. Sinkronisasi tetap bergantung pada waktu publikasi dan pengindeksan sumber CVE. Lihat [panduan CVE Feed](docs/VULNERABILITY_FEED.md#konfigurasi) untuk pengaturan CISA, API key NVD, dan detail lainnya.

## Lisensi

ServiceOps dilisensikan di bawah [Apache License 2.0](LICENSE). Lisensi ini berlaku untuk kode dan dokumentasi proyek; dependency pihak ketiga tetap mengikuti lisensinya masing-masing.
