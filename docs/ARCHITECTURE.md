# Arsitektur ServiceOps

## Komponen

```text
Browser
  └─ SolidJS + Vite (development) / Nginx (container)
       └─ /api proxy
            └─ Python + Robyn API
                 ├─ PostgreSQL — data aset, monitoring, alert, incident, dan konfigurasi
                 ├─ Redis — dependency cache/backend
                 └─ asyncssh — operasi host Docker remote
```

Frontend berada di `frontend/src/`; route aplikasi didaftarkan pada `frontend/src/App.tsx`. Komponen `Layout` membungkus halaman terproteksi dan `lib/api.ts` menambahkan token bearer untuk request API.

Backend dimulai dari `backend/run_server.py`, yang menginisialisasi koneksi database, Redis, dan scheduler sebelum Robyn menerima request. Route HTTP berada di `backend/src/main.py` dan domain terkait di `backend/src/domains/`.

## Domain backend

| Domain | Tanggung jawab |
| --- | --- |
| `auth` | Login, verifikasi token, user, dan role |
| `assets` | Data inventaris serta tipe aset |
| `monitoring` | Plugin checks, penyimpanan hasil, dan scheduler |
| `alerts` | Evaluasi alert, incident, timeline, dan notifikasi terkait |
| `notifications` | Konfigurasi kanal dan adapter provider |
| `sla` | Target dan laporan uptime |
| `topology` | Dependency antar aset dan impact analysis |
| `logs` | Penerimaan dan pencarian log |
| `docker` | Data host, SSH, perintah Docker remote, monitoring, dan rule host |
| `audit` | Route audit, health, metrics, dan backup |

## Request frontend

Frontend memakai base URL `/api` secara default. Pada mode development, Vite meneruskan request ke `localhost:9080`; route API utama di backend berada pada root path (misalnya `/assets`), jadi proxy menghapus prefix `/api`. Endpoint panduan `/api/guides/...` mempertahankan prefixnya. Nginx container menerapkan aturan yang sama.

Token login disimpan di local storage dan dikirim sebagai header `Authorization: Bearer ...`. Backend memvalidasi token pada route yang memerlukan autentikasi.

## Database dan migration

- `init.sql` membentuk schema utama saat volume PostgreSQL pertama kali dibuat.
- `seed.sql` membuat data awal untuk development, termasuk akun admin lokal dan tipe aset.
- `docker-migration.sql` memuat DDL tambahan yang dijalankan service `migrate` pada startup Compose.
- PostgreSQL berjalan di jaringan Compose; port host default dipetakan ke 15433.

Jika schema utama berubah, siapkan migration yang aman untuk database berisi data; init script PostgreSQL tidak dijalankan ulang pada volume lama.

## Operasi Docker jarak jauh

ServiceOps menyimpan konfigurasi host lalu membuka koneksi SSH dari backend ke mesin target. Operasi menggunakan command Docker/Compose pada host tersebut. Kredensial host harus dilindungi dan akses jaringan/SSH disediakan oleh lingkungan yang menjalankan backend.

## Referensi implementasi

- [Source backend](../backend/src/)
- [Source frontend](../frontend/src/)
- [Docker Compose](../docker-compose.yml)
- [Panduan instalasi dan konfigurasi](DEPLOYMENT.md)
