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

## Sign-in Google / Discord (SSO)

Tombol "Log in" di header dartfapper.pro membuka halaman login ini (login global). Username/password untuk akun yang
dibuat Super Admin; di bawahnya Google/Discord. Google/Discord yang belum tertaut otomatis membuat akun **Member**
(`member-xxxxxxxxxxxx`, tanpa password, tidak melihat server apa pun). Owner/Super Admin menautkan Google/Discord di
**Settings → Connected accounts** agar SSO masuk ke akun mereka. Tombol provider yang belum dikonfigurasi tampil abu-abu.

- Google: buat OAuth client (Web) di Google Cloud, redirect URI
  `https://kafra-guard-owner.tatagpriyanugraha.workers.dev/api/oauth/google/callback`. Isi `GOOGLE_CLIENT_ID` di vars,
  lalu `npx wrangler secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.kafra.jsonc`.
- Discord: di app `1376624589630738492` tambahkan redirect
  `https://kafra-guard-owner.tatagpriyanugraha.workers.dev/api/oauth/discord/callback`, lalu
  `npx wrangler secret put DISCORD_CLIENT_SECRET --config worker/wrangler.kafra.jsonc`.

## Deployment yang belum dijalankan

1. Review binding D1 pada `wrangler.kafra.jsonc`. Default menggunakan D1 auth
   yang sudah ada, dengan tabel admin terpisah; tidak memakai database game.
2. Terapkan tabel baru (aman diulang; juga menambah tabel server & owner): `npx wrangler d1 execute dartfapper-auth --remote --file worker/kafra-schema.sql --config worker/wrangler.kafra.jsonc`.
   Lalu daftarkan server yang sudah ada (Lepak RO & OTTi RO sebagai Mobile RO; aman diulang):
   `npx wrangler d1 execute dartfapper-auth --remote --file worker/kafra-seed.sql --config worker/wrangler.kafra.jsonc`.
   Ragna Next (Kafra Guard) adalah gate milik Super Admin (`KAFRA_GATE_NAME`), selalu tampil, dan aktif setelah `KAFRA_GATE_URL` di-set.
3. Set secrets: `npx wrangler secret bulk E:\gameshield\.local\kafra-owner-admin\worker-secrets.json --config worker/wrangler.kafra.jsonc`.
4. Set `KAFRA_GATE_URL` pada vars Worker ke root HTTPS gate VPS. Tambahkan
   ownerKey yang sesuai di private config gate, lalu restart gate.
5. Deploy dengan `npx wrangler deploy --config worker/wrangler.kafra.jsonc`.
6. Tambahkan custom domain guard.dartfapper.pro ke Worker owner. Setelah domain
   aktif, sesuaikan redirect `kafra/admin.js` bila memakai domain tersebut.

Tidak ada deployment, DNS change, migrasi D1 remote atau koneksi VPS yang
dilakukan oleh implementasi lokal ini. Deploy Worker lama tidak otomatis
menerbitkan panel baru. Push website juga bukan deployment Worker owner.

## Disable protection (mode tes)

Panel **Protection** di dashboard Kafra Guard mematikan proteksi per server
(disimpan di `kafra_policy`, nama `protection`, 1/0). Saat off, client tetap
menampilkan splash lalu langsung masuk game tanpa handshake gate, heartbeat
atau laporan modul, dan `/internal/authorize` gate mengizinkan semua login.
Berlaku untuk game yang dibuka setelah diubah; client yang sedang berjalan
tetap pada modenya sampai di-restart. Butuh gate + GameShield.dll versi baru.

## Paket Kafra Guard vs Kafra Guard Pro

Super Admin memilih paket per server di **Servers & owners → Manage → Plan**
(kolom `kafra_servers.kafra_plan`: `basic` / `pro`).

- **Kafra Guard (basic)**: client terverifikasi, kick/ban, module rules, Client builds.
- **Kafra Guard Pro**: semua itu + switch Protection (mode tes), Client limits,
  dan melihat laporan modul pemain (View modules).

Server basic melihat kartu "Upgrade to Pro" di tempat fitur Pro. Worker juga
menolak API-nya (`pro_required`), jadi tidak bisa diakali dari browser. Server
yang turun dari Pro ke basic otomatis dikembalikan ke protection ON (best effort).
Saat Worker baru pertama jalan, kolom `kafra_plan` ditambahkan otomatis dan
server yang sudah memakai Kafra Guard diset **Pro**, supaya tidak ada fitur yang hilang.

Batas per paket (satu tabel `planLimits` di `worker/src/kafra-admin.js`):

| | Kafra Guard (basic) | Kafra Guard Pro |
|---|---|---|
| Sub-server per lisensi (realm) | 1 | sampai 16 |
| Max players online di lisensi | 1–50 | bebas (0 = tanpa batas) |
| DLL di whitelist (Allow) | 10 | tanpa batas (block tidak dibatasi) |
| Build per sub-server (realm) | tidak | ya |

Batas ini ditegakkan oleh Worker. Owner yang memegang owner key gate sendiri
(gate self-hosted) masih bisa menambah rule langsung ke gate; batas players online
ditegakkan oleh module login lewat lisensi yang ditandatangani.

## Client builds (approve build baru)

Gate hanya menerima build (hash EXE + DLL) yang dipublish lewat profile atau
di-approve owner. Setelah client di-patch ulang / DLL diganti, jalankan game sekali.
Build-nya muncul di panel **Client builds** sebagai "Waiting for approval", lalu
klik **Approve**. Butuh gate versi baru + tabel `kafra_builds`
(`server/gate-upgrade-builds.sql` di repo kafra-shield). Tanpa tabel itu approval
tetap jalan, tapi hilang saat gate restart.

## Versi Kafra Guard core (GameShield.dll)

Super Admin → **Kafra Guard core versions**: pilih `GameShield.dll` yang dibagikan ke
player (file hanya di-hash di browser, tidak di-upload), beri nama versi, centang
**latest**. Daftar ini disimpan di `kafra_core_versions` (dibuat otomatis oleh Worker).
Di halaman Kafra Guard tiap server, panel **Kafra Guard core** menampilkan berapa
player online yang memakai versi terbaru, versi lama, atau DLL yang tidak ada di daftar.
Data per player berasal dari laporan modul client (muncul ±1 menit setelah login).
Butuh gate dengan endpoint `/internal/owner/versions`; gate lama menampilkan pesan
"Update the gate on the VPS".

## Lisensi rAthena dari dashboard

Manage → **rAthena license** menandatangani lisensi untuk module login-server
(format sama dengan `tools/license-gen.mjs`). Butuh secret Worker
`KAFRA_LICENSE_KEY` berisi isi `E:\gameshield\.local\kafra-license\license-private.pem` (PKCS8 PEM):
`npx wrangler secret put KAFRA_LICENSE_KEY --config worker/wrangler.kafra.jsonc`.
Kunci privat tidak pernah dikirim ke browser; riwayat lisensi disimpan di `kafra_licenses`.

**Satu lisensi untuk beberapa sub-server** (Renewal / Classic / Revo dalam satu gate): isi
*Sub-servers covered* (mis. `renewal, classic, revo`), lalu di `kafraguard.conf` tiap login
server isi `realm = renewal` / `classic` / `revo`. Saat **Approve** build di Client builds,
isi sub-server-nya juga, supaya client itu hanya bisa login ke sub-server tersebut. Max
players online berlaku per sub-server. Gate butuh `server/gate-upgrade-realms.sql`; detail
dan daftar celah yang ditutup ada di `docs/MULTI-REALM.md` (repo kafra-shield).

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
