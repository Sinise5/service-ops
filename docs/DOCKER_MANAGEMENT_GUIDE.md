# ServiceOps — Docker Management Guide

**Version:** 1.0 | **Updated:** June 2026

---

## Overview

Docker Management adalah modul untuk mengelola Docker containers, images, volumes, dan Compose projects di remote VM langsung dari UI ServiceOps. Semua operasi Docker dijalankan via SSH ke VM target — ServiceOps backend menjalankan command Docker CLI (`docker ps`, `docker logs`, dll.) melalui SSH connection.

```
Browser (ServiceOps UI)
    ↓ HTTP
ServiceOps Backend (port 9080)
    ↓ SSH (port 22)
Remote VM (Docker Host)
    ↓
Docker Engine (CLI)
```

---

## Requirements

- Remote VM dengan SSH access (password atau SSH key)
- Docker Engine terinstall di remote VM
- Docker CLI tersedia di `$PATH` remote VM

---

## Adding a Docker Host

### Step-by-Step

1. Buka halaman **Docker** (sidebar: 🐳 Docker)
2. Klik **+ Add Host**
3. Isi form:

| Field | Description |
|-------|-------------|
| Display Name | Label tampil di UI (e.g. "Production API Server") |
| Host / IP | IP address atau hostname remote VM |
| SSH Port | Default: 22 |
| Username | SSH username di remote VM |
| Auth Method | **Password** atau **SSH Key** |
| Password / SSH Key | Credential untuk autentikasi |
| Default Path | Path default untuk Docker operations (e.g. `/opt/docker`) |
| Tags | Label opsional (comma-separated) |

4. Klik **Test Connection** — memastikan SSH + Docker accessible
5. Klik **Save Host**

### SSH Authentication

**Password Auth:**
- Masukkan username + password
- Password di-encrypt AES-128 (Fernet) sebelum disimpan ke database
- Show/hide toggle tersedia

**SSH Key Auth:**
- Paste private key content (PEM format)
- Jika key ter-encrypt dengan passphrase, masukkan passphrase
- Key juga di-encrypt sebelum disimpan

### Connection Test

Klik **Test Connection** sebelum save untuk memverifikasi:
- SSH handshake berhasil
- Docker CLI accessible
- Mendapat Docker version info

Jika gagal, error message menunjukkan penyebabnya:
- `Permission denied` — username/password salah
- `Connection refused` — SSH port salah atau VM offline
- `docker: command not found` — Docker CLI tidak ada di remote

---

## Managing Containers

### List Containers

Setelah pilih host, tab **Containers** menampilkan semua container via `docker ps -a`.

**Filter:**
- **All** — semua container (running + stopped + exited)
- **Running** — hanya container dengan state "running"
- **Stopped** — semua container yang tidak running

Filter applied secara client-side (tidak re-fetch dari API).

**Kolom:**
- Name — nama container
- Image — Docker image
- Status — running/stopped/exited
- Ports — port mappings (host→container)

### Container Actions

| Action | Endpoint | Description |
|--------|----------|-------------|
| Start | `POST /docker/hosts/:id/containers/:cid/start` | Start stopped container |
| Stop | `POST /docker/hosts/:id/containers/:cid/stop` | Stop running container |
| Restart | `POST /docker/hosts/:id/containers/:cid/restart` | Stop + start |
| Remove | `DELETE /docker/hosts/:id/containers/:cid` | Hapus container (stop dulu jika running) |

### Removing Containers

Delete container membutuhkan **SSH password** dari host (via header `X-SSH-Password`). Ini untuk memverifikasi bahwa user punya akses ke VM target.

Jika container sedang running, stop dulu sebelum remove — atau gunakan force flag.

### View Logs

Klik **Logs** di container row untuk membuka live log viewer:
- Tailing last 100 lines default
- Toggle auto-scroll
- Copy all / download
- Streaming mode via SSE (Server-Sent Events)

---

## Managing Images

Tab **Images** menampilkan semua Docker images di host via `docker images`.

**Actions:**
- **Pull Image** — pull dari Docker registry
- **Remove Image** — hapus image lokal (membutuhkan SSH password)

### Pull New Image

1. Klik **+ Pull Image**
2. Masukkan image name (e.g. `nginx:alpine`, `postgres:16`)
3. Klik Pull — backend jalankan `docker pull <image>`
4. Image muncul di list setelah pull selesai

### Bulk Actions

- **Select multiple images** — checkbox di kiri
- **Bulk Delete** — hapus beberapa image sekaligus (membutuhkan SSH password)

---

## Managing Volumes

Tab **Volumes** menampilkan Docker volumes via `docker volume ls`.

**Actions:**
- **Inspect** — lihat detail volume (driver, mountpoint, options)
- **Remove** — hapus volume (membutuhkan SSH password, harus tidak dipakai container aktif)

---

## Docker Compose

Tab **Compose** mengelola Docker Compose projects di host.

### Add Compose Project

1. Klik **+ Add Project**
2. Masukkan:
   - **Name** — label project
   - **Path** — absolute path ke directory yang ada `docker-compose.yml`
3. Backend deteksi services otomatis via `docker compose -f <path> config --services`

### Compose Actions

| Action | Command |
|--------|---------|
| Up | `docker compose -f <path> up -d` |
| Down | `docker compose -f <path> down` |
| Restart | `docker compose -f <path> restart` |
| Scale | `docker compose -f <path> up --scale <service>=<replicas>` |
| Edit | Edit `docker-compose.yml` via embedded editor |

### Scaling Replicas

1. Klik **Scale** di compose project
2. Pilih service
3. Set jumlah replicas
4. Klik **Apply**

---

## Prune / Cleanup

Tab **Cleanup** menyediakan:
- **Prune Containers** — hapus semua stopped containers
- **Prune Images** — hapus dangling images
- **Prune Volumes** — hapus unused volumes
- **Prune All** — kombinasi ketiganya

Semua prune operations membutuhkan SSH password.

---

## Security

### Credential Storage

- SSH password di-encrypt dengan **Fernet (AES-128)** sebelum simpan ke PostgreSQL
- SSH private key di-encrypt juga
- Encryption key tersimpan di `backend/.docker_enc_key` (file, mode 0600)
- Key tidak pernah muncul di response API — selalu di-mask

### Delete Operations

- **Delete host** — butuh login password ServiceOps (bcrypt verified)
- **Delete container/image/volume/compose** — butuh SSH password host (decrypted from DB, passed via `X-SSH-Password` header)

Ini memastikan user yang bisa hapus resource Docker punya akses SSH ke VM target.

### RBAC

Secara default semua authenticated users bisa akses Docker menu. Untuk membatasi:
- User perlu role dengan permission `docker:manage` (implementasi masa depan)
- Host-level access control (implementasi masa depan)

---

## Troubleshooting

### "Permission denied for user X on host Y.Y.Y.Y"

**Penyebab:** SSH authentication gagal.

**Cek:**
1. Username + password di record host sudah bener
2. User punya SSH access ke VM
3. SSH password tidak berubah setelah host di-add

**Fix:**
1. Edit host → update password → save
2. Test connection lagi

### "docker: command not found"

**Penyebab:** Docker CLI tidak terinstall atau tidak ada di `$PATH` remote VM.

**Fix:**
1. SSH ke VM langsung
2. Install Docker CLI: `apt install docker-cli` atau sesuai OS
3. Pastikan `docker` accessible via SSH session

### Container 500 error

**Penyebab:** Kemungkinan encryption key di backend berganti (file dihapus/regenerated).

**Fix:**
1. Restart backend — key akan di-load ulang
2. Jika key berganti, semua password host perlu di-update (karena decrypt akan gagal)

### "SSH connection timeout"

**Penyebab:** VM offline atau firewall block SSH port.

**Fix:**
1. Ping VM: `ping Y.Y.Y.Y`
2. Cek SSH port: `nc -zv Y.Y.Y.Y 22`
3. Pastikan firewall allow port 22 inbound

### Host shows "Offline"

**Penyebab:** Test connection gagal — SSH handshake gagal atau Docker tidak accessible.

**Cek:**
1. VM online? (ping)
2. SSH port open? (nc)
3. Docker service running di VM? (`systemctl status docker` di VM)
4. User punya permission akses Docker socket?

---

## API Reference

### Host Endpoints

```
GET    /docker/hosts              — List all hosts
POST   /docker/hosts              — Add host
GET    /docker/hosts/:id         — Get host detail
PUT    /docker/hosts/:id         — Update host
DELETE /docker/hosts/:id         — Delete host (needs X-Password header)
POST   /docker/hosts/:id/test    — Test connection
```

### Container Endpoints

```
GET    /docker/hosts/:id/containers                    — List containers (all=true)
POST   /docker/hosts/:id/containers/:cid/start        — Start
POST   /docker/hosts/:id/containers/:cid/stop         — Stop
POST   /docker/hosts/:id/containers/:cid/restart      — Restart
DELETE /docker/hosts/:id/containers/:cid               — Remove (needs X-SSH-Password)
GET    /docker/hosts/:id/containers/:cid/inspect       — Inspect JSON
GET    /docker/hosts/:id/containers/:cid/stats         — Real-time stats
GET    /docker/hosts/:id/containers/:cid/logs          — Logs (tail param)
```

### Image Endpoints

```
GET    /docker/hosts/:id/images              — List images
POST   /docker/hosts/:id/images/pull         — Pull image
DELETE /docker/hosts/:id/images/:image_id    — Remove (needs X-SSH-Password)
POST   /docker/hosts/:id/images/prune        — Prune dangling (needs X-SSH-Password)
```

### Volume Endpoints

```
GET    /docker/hosts/:id/volumes             — List volumes
GET    /docker/hosts/:id/volumes/:name      — Inspect volume
DELETE /docker/hosts/:id/volumes/:name       — Remove (needs X-SSH-Password)
```

### Compose Endpoints

```
GET    /docker/hosts/:id/compose/projects         — List projects
POST   /docker/hosts/:id/compose/projects          — Add project
GET    /docker/hosts/:id/compose/:project_id       — Project detail
POST   /docker/hosts/:id/compose/:project_id/up    — Compose up
POST   /docker/hosts/:id/compose/:project_id/down  — Compose down
POST   /docker/hosts/:id/compose/:project_id/restart
PUT    /docker/hosts/:id/compose/:project_id/files — Edit compose file
```

---

## Configuration

### Encryption Key

File: `backend/.docker_enc_key`
- Auto-generated pada backend start pertama kali
- Jangan hapus atau modify manual
- Backup file ini jika ingin preserve semua credential

### SSH Connection Timeout

Default: 30 detik untuk command biasa, 60 detik untuk operasi panjang (compose up/down).

Konfigurasi ada di `backend/src/domains/docker/service.py` — parameter `timeout` di `docker_command()`.

### Docker CLI Path

Default: `docker` (asumsi di PATH). Jika Docker CLI ada di path berbeda, ubah di `service.py`.
