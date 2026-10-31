# Monitoring Guide

Panduan ini sesuai dengan halaman Monitoring pada UI saat ini. Periksa [Status Proyek](docs/PROJECT_STATUS.md) bila ingin membedakan kemampuan yang tersedia di backend dari field yang tersedia di UI.

## Cara kerja

1. Buat aset di **Assets**.
2. Buka **Monitoring**, pilih **Add Check**, pilih aset, lalu pilih jenis pemeriksaan.
3. Isi target dan interval. Interval minimum pada UI adalah 60 detik.
4. Simpan check. UI mencoba menjalankan check segera setelah dibuat.
5. Gunakan tombol **Run** untuk menjalankan ulang atau **Logs** untuk melihat hasil yang tersimpan.

Scheduler juga menjalankan check aktif sesuai intervalnya. Check dan hasil hanya menunjukkan apa yang bisa dijangkau oleh proses backend.

## HTTP check

Form meminta URL dan menggunakan metode GET serta expected status 200 sebagai nilai awal. Backend melakukan request HTTP dari host/container backend.

Contoh target:

```text
https://api.example.com/health
```

Pastikan URL dapat dijangkau dari jaringan backend. Endpoint yang hanya bisa dibuka dari browser pengguna belum tentu dapat dijangkau oleh backend.

## Ping check

Form meminta host atau alamat IP. Backend menjalankan perintah `ping`; ICMP harus diizinkan oleh jaringan dan image/host backend harus menyediakan program ping.

Contoh target dokumentasi:

```text
192.0.2.20
```

`192.0.2.0/24` adalah rentang untuk contoh dokumentasi; ganti dengan host milik Anda.

## SSL check

Backend memiliki plugin SSL yang menerima `host`, `port` (default 443), dan `warning_days` (default 30). Namun form UI saat ini belum menampilkan field konfigurasi host/port SSL. Karena itu opsi SSL belum dapat dikonfigurasi dengan benar lewat form saat ini. Hindari mengandalkannya sampai field UI atau alur konfigurasi API tersedia.

## Memahami hasil

- **success** berarti pemeriksaan memenuhi kondisi yang dikonfigurasi.
- **warning/failure** dapat menunjukkan respons yang tidak sesuai, target tidak dapat dicapai, DNS/TLS bermasalah, atau dependency jaringan.
- Response time dan output berasal dari eksekusi yang tercatat; hasil terbaru bisa berubah pada eksekusi berikutnya.
- Dashboard menghitung jumlah konfigurasi check, bukan jumlah service yang sehat.

## Troubleshooting

| Gejala | Periksa |
| --- | --- |
| HTTP check gagal | URL, TLS/sertifikat, status yang diharapkan, firewall, dan akses dari backend |
| Ping gagal | Host benar, ICMP diizinkan, dan `ping` tersedia di lingkungan backend |
| Hasil tidak berubah | Check aktif, interval, waktu eksekusi berikutnya, dan log backend |
| Tidak ada hasil | Status API/DB, scheduler backend, dan error di log container |

Untuk memeriksa backend pada setup lokal:

```bash
curl http://localhost:9080/health
docker-compose logs -f backend
```

Untuk membuat aturan dan menghubungkan notifikasi, lanjutkan ke [Alert Rules Guide](ALERT_RULES_GUIDE.md) dan [Panduan Penggunaan](docs/USER_GUIDE.md).
