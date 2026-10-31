# Integration Guide

Panduan ini merangkum cara menghubungkan fitur ServiceOps dengan environment dan layanan eksternal. Setup lokal ada di [README](README.md) dan [Deployment Guide](docs/DEPLOYMENT.md).

## Alur operasional

```text
Asset → Monitoring check → Alert rule → Incident → Notification channel
```

1. Buat asset untuk resource yang ingin dicatat.
2. Buat HTTP atau Ping check, lalu pastikan hasilnya sesuai.
3. Tambahkan alert rule dan pilih kondisi yang perlu ditindaklanjuti.
4. Tambahkan notification channel jika tim perlu menerima alert di provider lain.
5. Jalankan fitur Test pada channel, lalu periksa event/incident dari UI.

Alert rule dan jumlah check adalah konfigurasi; keduanya tidak membuktikan target sedang sehat atau incident sedang aktif.

## Notification providers

ServiceOps menyediakan adapter Telegram, Discord, Email (SMTP), dan Webhook. Buat channel pada halaman **Notifications**, pilih provider, masukkan nilai kredensial/URL milik organisasi, gunakan **Test**, lalu simpan.

Kredensial provider berasal dari administrator layanan masing-masing. Simpan secara privat dan gunakan hak akses minimum. Pastikan host backend dapat mengakses endpoint provider atau SMTP yang dipilih.

## Remote Docker host

Fitur Docker terhubung ke Docker Engine pada host jarak jauh melalui SSH dari backend.

1. Pastikan host target menjalankan SSH dan Docker CLI.
2. Pastikan jaringan container/host backend dapat mencapai host dan port SSH.
3. Tambahkan host di halaman **Docker**, simpan kredensial SSH atau private key.
4. Gunakan **Test Connection** sebelum melakukan tindakan.
5. Kelola resource hanya setelah memeriksa target host yang dipilih.

Operasi remove, prune, Compose down, dan deploy dapat mengubah atau menghapus resource di mesin target. Baca konfirmasi UI dan pastikan backup/data yang diperlukan tersedia.

## API

API berjalan di port 9080 pada setup lokal. UI memakai `/api` sebagai proxy agar browser tidak perlu mengakses hostname container.

```bash
curl http://localhost:9080/health
```

Login mengembalikan token bearer:

```bash
curl -X POST http://localhost:9080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"your-password"}'
```

Kirim token pada route yang memerlukan autentikasi:

```bash
curl http://localhost:9080/assets \
  -H 'Authorization: Bearer <access-token>'
```

Route dan skema OpenAPI dapat dilihat pada `http://localhost:9080/docs` saat backend berjalan. Ganti email/password contoh dengan akun yang dikelola di environment Anda.

## Verifikasi integrasi

- API health merespons `200`.
- UI dapat memuat aset dan monitoring check setelah login.
- Notification channel melaporkan keberhasilan pada tes dan pesan sampai ke tujuan.
- Remote Docker host berhasil melewati tes SSH dan menampilkan data target yang dipilih.
- Cek log backend untuk error koneksi, provider, atau autentikasi.

Lihat [User Guide](docs/USER_GUIDE.md), [Monitoring Guide](MONITORING_GUIDE.md), [Alert Rules Guide](ALERT_RULES_GUIDE.md), dan [Docker Management Guide](docs/DOCKER_MANAGEMENT_GUIDE.md) untuk petunjuk per area.
