# Instalasi dan deployment

Panduan ini ditujukan untuk development lokal. Compose memakai password dan secret contoh, memublikasikan port database ke host, dan belum menyediakan TLS atau secret manager. Lakukan hardening sebelum membuka layanan ke jaringan lain.

## Jalankan seluruh aplikasi dengan Docker

Prasyarat: Docker Engine aktif serta Compose tersedia sebagai `docker compose` atau `docker-compose`.

```bash
git clone https://github.com/Sinise5/service-ops.git
cd service-ops
cp .env.example .env
docker-compose config --quiet
docker-compose up -d --build
docker-compose ps
```

Jika instalasi Anda memakai plugin resmi Docker, ganti `docker-compose` dengan `docker compose`.

Compose menjalankan layanan berikut:

| Service | Fungsi | Port host default |
| --- | --- | --- |
| `postgres` | Database PostgreSQL; memuat `init.sql` dan `seed.sql` pada volume baru | 15433 |
| `redis` | Cache dan layanan backend | 16379 |
| `migrate` | Menerapkan `docker-migration.sql`, lalu berhenti | — |
| `backend` | API Robyn pada port container 9080 | 9080 |
| `frontend` | UI statis lewat Nginx; `/api` diproxy ke backend | 5173 |

Buka http://localhost:5173. Health check API: `curl http://localhost:9080/health`.

Login seed lokal: `admin@serviceops.local` / `admin123`. Akun tersebut hanya untuk lingkungan development yang dibuat dari seed database.

## Variabel lingkungan

Salin `.env.example` menjadi `.env`. Nilai berikut dipakai Compose:

| Variabel | Default lokal | Keterangan |
| --- | --- | --- |
| `POSTGRES_USER` | `postgres` | Pengguna database |
| `POSTGRES_PASSWORD` | `postgres` | Password database development |
| `POSTGRES_DB` | `serviceops_dev` | Nama database |
| `POSTGRES_HOST_PORT` | `15433` | Port PostgreSQL yang dipublikasikan ke host |
| `REDIS_HOST_PORT` | `16379` | Port Redis yang dipublikasikan ke host |
| `BACKEND_PORT` | `9080` | Port API yang dipublikasikan ke host |
| `FRONTEND_PORT` | `5173` | Port UI yang dipublikasikan ke host |
| `JWT_SECRET` | placeholder | Ganti dengan secret acak sebelum penggunaan bersama |
| `VULNERABILITY_FEED_INTERVAL_SECONDS` | `300` | Jeda sinkron CVE NVD dalam detik; minimum efektif 60 detik |
| `KEV_REFRESH_INTERVAL_SECONDS` | `3600` | Jeda pembaruan katalog CISA KEV dalam detik; minimum efektif 60 detik |
| `NVD_API_KEY` | kosong | Opsional; API key NVD untuk kuota API yang lebih longgar |

Contoh membuat secret: `python3 -c 'import secrets; print(secrets.token_urlsafe(48))'`.
Jika mengganti port PostgreSQL/Redis untuk development native, samakan port tersebut dengan URL pada `backend/.env`.

CVE Feed membutuhkan akses internet keluar dari backend ke NVD dan CISA. `NVD_API_KEY` opsional; salin nilainya ke `backend/.env` saat menjalankan backend native, atau ke `.env` root saat memakai Compose.

Untuk mengatur jadwal feed, ubah `VULNERABILITY_FEED_INTERVAL_SECONDS` (NVD, default 300 detik) atau `KEV_REFRESH_INTERVAL_SECONDS` (CISA KEV, default 3600 detik) di file env yang digunakan. Setelah mengubah env Compose, jalankan `docker-compose up -d --force-recreate backend` agar container membaca nilai baru. Contoh dan langkah lengkap tersedia di [Panduan CVE Feed](VULNERABILITY_FEED.md#konfigurasi).

## Pengembangan dengan backend/frontend native

Jalankan dependency terlebih dahulu:

```bash
cp .env.example .env
docker-compose up -d --build postgres redis
docker-compose run --build --rm migrate
```

Terminal backend:

```bash
cp backend/.env.example backend/.env
cd backend
uv sync
uv run python run_server.py
```

Terminal frontend:

```bash
cd frontend
npm ci
npm run dev
```

Frontend memakai Vite proxy pada `/api`. Proxy mempertahankan prefix untuk endpoint panduan (`/api/guides/...`) dan menghapus prefix untuk route API lain yang didaftarkan backend di root.

## Operasi harian

```bash
docker-compose ps
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs migrate
docker-compose restart backend
docker-compose down
```

`down` menghentikan dan menghapus container/network proyek tetapi mempertahankan volume. `docker-compose down -v` menghapus volume PostgreSQL dan Redis beserta datanya; gunakan hanya bila ingin reset database development.

Perubahan `init.sql` hanya otomatis diterapkan saat volume PostgreSQL baru dibuat. Perubahan skema untuk database yang sudah ada harus diberikan melalui migration SQL yang sesuai lalu dijalankan dengan prosedur migration proyek.

## Build image terpisah

```bash
docker-compose build backend frontend
```

Build context menggunakan `.dockerignore` pada root agar tidak mengirim `.env`, `.git`, dependency lokal, cache, atau database lokal ke Docker daemon. Dokumentasi panduan yang dibaca Help UI disalin ke image backend secara eksplisit.

## Troubleshooting

### Compose command tidak ditemukan

Gunakan `docker-compose` jika instalasi tidak memasang plugin `docker compose`. Periksa dengan `docker-compose version`.

### Port host sudah dipakai

Ubah `POSTGRES_HOST_PORT`, `REDIS_HOST_PORT`, `BACKEND_PORT`, atau `FRONTEND_PORT` dalam `.env`, lalu jalankan ulang Compose. Port antar-container tetap menggunakan port internal yang ditentukan Compose.

### Backend berhenti saat startup

Periksa dependency dan log:

```bash
docker-compose ps -a
docker-compose logs postgres redis migrate backend
```

Backend menunggu PostgreSQL, Redis, dan migration selesai. Migration berhenti pada error SQL supaya backend tidak berjalan dengan skema parsial.

### Halaman terbuka tetapi API gagal

```bash
curl http://localhost:9080/health
docker-compose logs -f frontend backend
```

UI container mengirim `/api` melalui Nginx pada jaringan Compose. Jangan mengatur `VITE_API_URL` ke nama host container pada browser pengguna; hostname `backend` hanya tersedia di jaringan Docker.

### Panduan Help tidak terbuka

Endpoint `/api/guides/<nama-file>.md` menyajikan beberapa berkas panduan Markdown. Pastikan frontend memakai proxy yang disertakan dan image backend dibangun ulang sesudah mengubah Dockerfile atau panduan.

## Keamanan sebelum deployment

- Ganti password database, `JWT_SECRET`, dan kredensial seed.
- Jangan publikasikan PostgreSQL/Redis ke jaringan publik; batasi port host atau hapus port mapping.
- Tambahkan TLS/reverse proxy, backup database, logging/retensi, dan secret manager sesuai lingkungan.
- Batasi akses SSH host Docker dan gunakan key/kredensial dengan hak minimum.
- Verifikasi status, backup, dan restore di lingkungan target sebelum menerima beban produksi.
