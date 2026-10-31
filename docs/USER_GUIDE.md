# Panduan penggunaan ServiceOps

Panduan ini menjelaskan alur kerja utama setelah aplikasi berjalan. Untuk instalasi dan konfigurasi, lihat [Deployment](DEPLOYMENT.md).

## Login

Untuk database development yang baru diinisialisasi dari `seed.sql`:

- Email: `admin@serviceops.local`
- Password: `admin123`

Kredensial tersebut hanya untuk development. Jangan mengekspos instance dengan akun seed ke jaringan umum. Buat akun sesuai prosedur organisasi sebelum penggunaan bersama.

## Alur awal yang disarankan

1. **Daftarkan aset** di halaman Assets. Pilih tipe aset dan isi nama serta deskripsi yang membantu tim mengenalinya.
2. **Buat monitoring check** untuk aset. Form saat ini menyediakan HTTP dan Ping dengan interval minimal 60 detik.
3. **Tinjau hasil monitoring** di halaman Monitoring untuk melihat hasil check dan error yang dilaporkan.
4. **Buat alert rule** untuk kondisi yang perlu ditindaklanjuti. Alert rule adalah konfigurasi; incident merupakan kejadian yang tercatat ketika evaluasi memicu aturan.
5. **Atur kanal notifikasi** jika tim perlu menerima event di luar aplikasi. Isi kredensial provider, gunakan tombol test, lalu simpan kanal.
6. **Tinjau incident, SLA, dan log** untuk memahami dampak serta riwayat operasi.

## Halaman aplikasi

| Halaman | Kegunaan |
| --- | --- |
| Dashboard | Melihat jumlah aset, monitoring check, alert rule, dan incident yang tercatat |
| Assets | Membuat, mencari, mengubah, atau menghapus entri aset dan tipe aset |
| Monitoring | Mengelola pemeriksaan dan melihat hasilnya |
| Alert rules | Mengatur kondisi dan tingkat keparahan alert |
| Incidents | Melihat event, acknowledge, resolve, dan meninjau timeline/komentar yang tersedia |
| Notifications | Mengelola kanal notifikasi dan menguji pengiriman |
| SLA | Menentukan target uptime dan membuka laporan |
| Topology | Mengelola relasi aset serta melihat dependency graph/impact analysis |
| Logs | Mencari entri log yang telah masuk ke ServiceOps |
| Docker | Menghubungkan host Docker jarak jauh melalui SSH dan mengelola resource host |
| Settings | Memperbarui profil dan menampilkan alat pembuat API key |
| Help | Membaca ringkasan fitur dan panduan terpilih |

Nama atau opsi di halaman dapat berubah mengikuti versi yang dijalankan. Jika panduan per fitur berbeda dari UI, gunakan perilaku UI dan API pada checkout aktif sebagai acuan.

## Aset dan monitoring

Asset merupakan entri inventaris, bukan hasil health check. Menambahkan aset tidak otomatis mengaktifkan pemantauan. Buat monitoring check tersendiri dan tautkan ke aset bila formulir memintanya.

Untuk HTTP check, pilih aset lalu masukkan endpoint yang dapat dijangkau backend. Untuk Ping, masukkan host/IP yang dapat dijangkau dari lingkungan backend. Backend memiliki plugin SSL, tetapi form belum menyediakan field host dan port yang dibutuhkan plugin tersebut. Scheduler backend menjalankan check aktif.

## Alert dan incident

Aturan alert menjelaskan kondisi yang dievaluasi. Incident adalah catatan event dan memiliki status yang dapat ditindaklanjuti. Atur tingkat keparahan dan kondisi dengan hati-hati, kemudian pastikan kanal notifikasi berfungsi dengan memakai fitur Test.

Alert threshold untuk pemakaian CPU, memori, dan disk host berlaku pada fitur host monitor Docker; fitur itu membutuhkan host SSH yang berhasil dihubungi.

## Kanal notifikasi

ServiceOps menyediakan adapter untuk Telegram, Discord, Email, dan Webhook. Siapkan token/URL atau konfigurasi SMTP pada halaman Notifications. Kredensial provider tidak disediakan oleh ServiceOps; jaga nilainya tetap privat dan uji kanal sebelum mengandalkannya untuk incident penting.

## Docker jarak jauh

Fitur Docker mengakses mesin target lewat SSH, bukan melalui Docker Engine lokal aplikasi. Sebelum menambahkan host:

- Pastikan backend dapat mencapai host dan port SSH.
- Gunakan akun SSH dengan hak Docker yang sesuai dan seminimal mungkin.
- Uji koneksi sebelum menyimpan host.
- Pahami efek tindakan start/stop/remove, Compose up/down, prune, dan deploy sebelum menjalankannya.

Panduan rinci ada di [Docker Management Guide](DOCKER_MANAGEMENT_GUIDE.md).

## Batasan yang perlu diketahui

- Dashboard menampilkan total konfigurasi dan catatan, bukan jaminan semua service sehat.
- Monitoring hanya mencakup jenis check yang diimplementasikan dan bergantung pada konektivitas dari backend.
- SLA dan log hanya bermakna jika data historis telah masuk dan tersimpan.
- Notifikasi dan operasi remote membutuhkan konfigurasi eksternal yang benar.
- API key yang dibuat halaman Settings saat ini tidak disimpan permanen oleh backend; jangan mengandalkannya untuk integrasi.

## Bantuan

Lihat [indeks dokumentasi](README.md), [Monitoring Guide](../MONITORING_GUIDE.md), [Alert Rules Guide](../ALERT_RULES_GUIDE.md), serta [Docker Management Guide](DOCKER_MANAGEMENT_GUIDE.md).
