# Owner Console — Kafra Guard & Mobile RO

Username: **tatanugraha** (`KAFRA_ADMIN_USER` di `wrangler.kafra.jsonc`). Tidak ada password default dalam source. Worker khusus
`kafra-guard-owner` memakai konfigurasi `wrangler.kafra.jsonc`; login Discord
dan Worker website yang lama tidak diubah. Frontend berada di `../kafra`.
GitHub Pages hanya menjadi pintu masuk; halaman tersebut mengarah ke Worker
owner agar cookie admin berada pada origin yang sama dengan API.
Target custom domain yang disarankan: `guard.dartfapper.pro` pada Worker owner.

## Kredensial

Jalankan Node 24 dari root repo website untuk membuat password acak, salt,
pepper dan kunci gate read-only di direktori privat di luar repo:

```powershell
node worker/tools/create-kafra-admin.mjs E:\gameshield\.local\kafra-owner-admin
```

Command menolak menimpa file yang sudah ada dan tidak mencetak password.
`super-admin.txt` berisi username/password; `worker-secrets.json` berisi hash,
pepper, dan kunci gate. `gate-owner-config.json` berisi ownerKey yang harus
ditambahkan ke private config gate VPS. Jangan masukkan ketiganya ke Git.
Password minimum 12 karakter bila diberikan melalui KAFRA_NEW_PASSWORD.

Hash memakai PBKDF2-SHA256 100.000 iterasi, salt acak dan HMAC pepper server.
Cookie admin `__Host-kafra_admin` berumur 8 jam, HttpOnly/Secure/SameSite=Strict;
D1 hanya menyimpan hash token. Password/pepper/username yang berubah
membatalkan sesi lama. Login dibatasi per IP dan global; POST wajib same-origin.
Tidak ada registrasi publik atau promosi user Discord menjadi Super Admin.

## Peran dan produk

Satu halaman sign-in umum (Owner Console). Hanya **Super Admin** (akun env di
atas) yang dibedakan; semua akun lain adalah **Server Owner** yang dibuat Super
Admin lewat menu *Servers & owners* (tidak ada registrasi publik).

- Tiap server punya produk opt-in: **Kafra Guard** dan **Mobile RO**. Server
  baru dibuat tanpa produk; owner-nya hanya melihat "No products yet" sampai
  Super Admin menyalakan produk lewat **Manage**.
- Server Owner read-only ke satu server, dan hanya ke produk yang menyala.
  `/api/admin/*`, server lain, dan produk mati menolak (403/404).
- Kafra Guard: URL root HTTPS gate + ownerKey 64 hex dari
  `gate-owner-config.json` VPS server itu. OwnerKey disegel AES-GCM dengan
  `KAFRA_DATA_KEY` (AAD = id server) sebelum masuk D1. Gate utama env
  (`KAFRA_GATE_URL`) muncul sebagai "Main server" hanya untuk Super Admin.
- Mobile RO: Super Admin mengisi plan, tanggal kedaluwarsa lisensi, dan
  mempublikasikan build APK (URL HTTPS). Owner melihat lisensi, build, pemain
  online, versi app, dan crash.
- Password owner minimal 12 karakter, di-hash seperti Super Admin. Menghapus
  owner/server, mengganti password, atau mengganti pepper membatalkan sesinya.

### Kontrak laporan Mobile RO (app → Worker)

Menyalakan Mobile RO mengeluarkan **ingest key** sekali (hanya hash SHA-256
yang disimpan). Masukkan ke konfigurasi build MoRo server tersebut; centang
"Issue a new ingest key" untuk merotasi (build lama berhenti melapor).
Data ini dilaporkan client, bukan bukti tak terpalsukan.

```
POST /api/ingest/moro/heartbeat   Authorization: Bearer <ingest key>
{"deviceId":"<id stabil per instalasi>","appVersion":"1.4.2","os":"Android 14"}

POST /api/ingest/moro/crash       Authorization: Bearer <ingest key>
{"appVersion":"1.4.2","os":"Android 14","model":"Pixel 8","message":"...","stack":"..."}
```

Heartbeat disarankan tiap 1–2 menit selama app dibuka; "Players online" =
heartbeat 5 menit terakhir. deviceId di-hash per server sebelum disimpan,
perangkat >30 hari dihapus, crash disimpan maksimal 500 terbaru per server.
Batas: 1200 heartbeat dan 60 crash per menit per server; body 1 KB / 16 KB.
Bagian app Android belum dibuat — sampai MoRo mengirim laporan, angka tetap 0.

`KAFRA_DATA_KEY` sudah dibuat oleh `create-kafra-admin.mjs`. Untuk folder
kredensial lama, tambahkan sekali saja (jangan dirotasi; key lama dibutuhkan
untuk membuka ownerKey yang sudah tersimpan):

```powershell
node worker/tools/add-kafra-data-key.mjs E:\gameshield\.local\kafra-owner-admin
```

## Deployment yang belum dijalankan

1. Review binding D1 pada `wrangler.kafra.jsonc`. Default menggunakan D1 auth
   yang sudah ada, dengan tabel admin terpisah; tidak memakai database game.
2. Terapkan tabel baru (aman diulang; juga menambah tabel server & owner): `npx wrangler d1 execute dartfapper-auth --remote --file worker/kafra-schema.sql --config worker/wrangler.kafra.jsonc`.
3. Set secrets: `npx wrangler secret bulk E:\gameshield\.local\kafra-owner-admin\worker-secrets.json --config worker/wrangler.kafra.jsonc`.
4. Set `KAFRA_GATE_URL` pada vars Worker ke root HTTPS gate VPS. Tambahkan
   ownerKey yang sesuai di private config gate, lalu restart gate.
5. Deploy dengan `npx wrangler deploy --config worker/wrangler.kafra.jsonc`.
6. Tambahkan custom domain guard.dartfapper.pro ke Worker owner. Setelah domain
   aktif, sesuaikan redirect `kafra/admin.js` bila memakai domain tersebut.

Tidak ada deployment, DNS change, migrasi D1 remote atau koneksi VPS yang
dilakukan oleh implementasi lokal ini. Deploy Worker lama tidak otomatis
menerbitkan panel baru. Push website juga bukan deployment Worker owner.

## Data yang ditampilkan

Sesi aktif, IP yang dilihat gate, unique ID perangkat bernamespace, build hash,
heartbeat terakhir, serta modul yang dilaporkan client. Endpoint read-only owner
memakai ownerKey terpisah; kunci kontrol internal rAthena tidak diberikan ke
browser/Worker. Tidak tersedia remote command, ban otomatis, atau kendali PC.

Modul dikumpulkan dari proses RO sendiri, dibatasi 128 entry, berupa basename,
SHA-256 file, dan status trust Authenticode dengan pemeriksaan offline/cache.
Path penuh, file pribadi, dan daftar aplikasi lain tidak dikirim. Trust belum
terverifikasi tidak berarti cheat. Enumerasi loader dapat melewatkan manual-map
atau memory-only injection; file hash tidak membuktikan integritas semua memori.
Laporan dibuat pertama setelah 6 detik, diperiksa tiap 60 detik dan dikirim hanya
saat berubah. Transport diautentikasi per sesi dan dilindungi dari replay.
Report berasal dari client dan bukan remote attestation yang kebal pemalsuan.
Sesi/modul aktif ada di memori gate; saat client berhenti, modul tidak muncul lagi.
Riwayat startup IP/device dapat disimpan MySQL melalui konfigurasi SQL gate;
riwayat modul ke SQL dan audit login akun game belum dibuat.

## Verifikasi lokal

```powershell
node --test worker/tests/kafra-admin.test.mjs
node worker/tools/preview-kafra.mjs E:\gameshield\.local\kafra-owner-admin 'D:\Data2026\RO 2026\RO-Next.exe'
```

Preview hanya bind loopback pada http://localhost:4178 dan memakai SQLite lokal
in-memory sebagai adapter tes D1. Untuk membaca gate lab client owner, simpan
kunci read-only yang sama sebagai `KafraGuard/owner-read.key` di folder client.
Client harus berjalan dengan payload gate lab terbaru. Jangan menyalin key ini
ke paket distribusi pemain. Browser sudah diuji untuk login Super Admin;
unit test menguji penolakan login palsu, CSRF, rate limit, logout, dan rotasi.

Dry-run Wrangler memverifikasi bundling Worker+assets; itu bukan deployment
atau bukti bahwa D1 remote/gate VPS sudah dikonfigurasi.
