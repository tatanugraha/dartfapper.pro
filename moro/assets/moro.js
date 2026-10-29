"use strict";

// =====================================================================
//  MoRo product page. Content lives at the top of this file.
//  Text that changes with the language toggle is { en: "...", id: "..." }.
// =====================================================================

const DISCORD_URL = "https://discord.gg/cM69F5Gr2E";

// Servers running a MoRo build. The "servers on MoRo" counters use this list.
const MORO_SERVERS = [
  {
    name: "OTTi RO",
    type: "Pre-Renewal · Episode 13.1",
    since: { en: "October 2026 · first MoRo server", id: "Oktober 2026 · server MoRo pertama" },
    icon: "assets/img/icon-otti.png",
    url: "http://otti.24-7.ro/"
  },
  {
    name: "Lepak RO",
    type: "Pre-Renewal · Revo",
    since: { en: "October 2026", id: "Oktober 2026" },
    icon: "assets/img/icon-lepak.png",
    url: "https://lepakro.com/"
  }
];

// Numbered spots on the in-game screenshot (x / y in % of the image).
const HOTSPOTS = [
  { x: 6,  y: 9,  t: { en: "Character at a glance", id: "Karakter sekilas" }, d: { en: "HP, SP, level and map name in one corner, readable mid-fight.", id: "HP, SP, level, dan nama map di satu pojok, kebaca walau lagi perang." } },
  { x: 49, y: 3,  t: { en: "Live FPS & ping", id: "FPS & ping langsung" }, d: { en: "Built-in performance readout, so you see the frame rate and latency players actually get.", id: "Angka performa bawaan: frame rate dan latensi yang pemain rasain beneran." } },
  { x: 70, y: 8,  t: { en: "Menu bar", id: "Menu bar" }, d: { en: "Bag, Equip, Status, Skill, and More, sized for a fingertip.", id: "Bag, Equip, Status, Skill, dan More, ukurannya pas buat ujung jari." } },
  { x: 94, y: 11, t: { en: "Minimap", id: "Minimap" }, d: { en: "Pinch-free zoom with + / −, coordinates always shown.", id: "Zoom pakai + / −, koordinat selalu kelihatan." } },
  { x: 17, y: 60, t: { en: "Touch joystick", id: "Joystick sentuh" }, d: { en: "Move prediction keeps walking smooth even on high ping.", id: "Prediksi gerak bikin jalan tetap mulus walau ping tinggi." } },
  { x: 88, y: 66, t: { en: "Skill hotbar", id: "Hotbar skill" }, d: { en: "Several pages of skill and item slots around the thumb.", id: "Beberapa halaman slot skill dan item di sekitar jempol." } },
  { x: 95, y: 90, t: { en: "Attack", id: "Serang" }, d: { en: "One big button to attack the nearest target.", id: "Satu tombol besar buat nyerang target terdekat." } },
  { x: 22, y: 88, t: { en: "Chat", id: "Chat" }, d: { en: "General, Party, Guild and Whisper tabs, with emotes.", id: "Tab General, Party, Guild, dan Whisper, plus emote." } }
];

const FEATURES = [
  { i: "M4 6h16M4 12h10M4 18h7", t: { en: "Newer clients", id: "Client lebih baru" }, d: { en: "Packet versions 2003 to 2025. Live on 20250717 today.", id: "Packet version 2003 sampai 2025. Sudah live di 20250717." } },
  { i: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z", t: { en: "3rd & 4th job effects", id: "Efek job 3 & 4" }, d: { en: "Skill effects for the newer jobs are included, not stubbed out.", id: "Efek skill job baru sudah ada, bukan kosong." } },
  { i: "M4 4h16v16H4zM4 9h16M9 9v11", t: { en: "Full modern UI", id: "UI modern lengkap" }, d: { en: "PIN code, Attendance, World Map, Navigation, Achievements, Laphine, Warg.", id: "PIN code, Attendance, World Map, Navigation, Achievement, Laphine, Warg." } },
  { i: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", t: { en: "Protected GRF", id: "GRF terlindungi" }, d: { en: "Encrypted GRFs (GRF Editor key, DES) are read on the device.", id: "GRF terenkripsi (key GRF Editor, DES) dibaca langsung di HP." } },
  { i: "M12 4v12m0 0l-5-5m5 5l5-5M5 20h14", t: { en: "Stream or download", id: "Stream atau unduh" }, d: { en: "Fetch only what the current map needs, or pull the full data in the background.", id: "Ambil yang dibutuhin map sekarang aja, atau unduh semua data di belakang." } },
  { i: "M3 12h4l3-8 4 16 3-8h4", t: { en: "Smooth on high ping", id: "Mulus walau ping tinggi" }, d: { en: "Direct TCP, no WebSocket proxy, and move prediction on the joystick.", id: "TCP langsung tanpa proxy WebSocket, plus prediksi gerak di joystick." } },
  { i: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4", t: { en: "Signed OTA updates", id: "Update OTA bertanda tangan" }, d: { en: "Fixes reach phones without a new APK. One command rolls back.", id: "Perbaikan sampai ke HP tanpa APK baru. Satu perintah buat rollback." } },
  { i: "M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4zM5 11a7 7 0 0 0 14 0M12 18v3", t: { en: "Extras players love", id: "Fitur yang pemain suka" }, d: { en: "Auto attack / auto hunt (if your server allows), LGP, nick colours, auras, voice chat with PC players.", id: "Auto attack / auto hunt (kalau server ngizinin), LGP, warna nick, aura, voice chat bareng pemain PC." } }
];

const STEPS = [
  { t: { en: "Send your server details", id: "Kirim detail server" }, d: { en: "IP, packet version, and your client files. GRFs and keys stay yours.", id: "IP, packet version, dan file client lo. GRF dan key tetap milik lo." } },
  { t: { en: "Get your branded APK", id: "Terima APK ber-brand" }, d: { en: "Your name, icon, splash and loading screens, checked against your server.", id: "Nama, ikon, splash, dan loading screen lo, sudah dites ke server lo." } },
  { t: { en: "Players install and play", id: "Pemain install & main" }, d: { en: "Same account as PC. Game data streams in while they play.", id: "Akun sama dengan PC. Data game masuk sambil main." } },
  { t: { en: "Updates arrive by themselves", id: "Update datang sendiri" }, d: { en: "Signed over-the-air updates, with rollback if anything goes wrong.", id: "Update over-the-air bertanda tangan, bisa rollback kalau ada masalah." } }
];

const SPECS = [
  [{ en: "Platform", id: "Platform" }, { en: "Android 8.0 (API 26) or newer", id: "Android 8.0 (API 26) ke atas" }],
  [{ en: "Minimum phone", id: "HP minimum" }, { en: "2 GB RAM, OpenGL ES 3.0 GPU (Mali-G52 / Adreno 506 class)", id: "RAM 2 GB, GPU OpenGL ES 3.0 (kelas Mali-G52 / Adreno 506)" }],
  [{ en: "Server", id: "Server" }, { en: "rAthena", id: "rAthena" }],
  [{ en: "Packet versions", id: "Packet version" }, { en: "2003–2025, one packet version per build", id: "2003–2025, satu packet version per build" }],
  [{ en: "Connection", id: "Koneksi" }, { en: "Direct TCP to your login/char/map servers, no WebSocket proxy", id: "TCP langsung ke login/char/map server, tanpa proxy WebSocket" }],
  [{ en: "Game data", id: "Data game" }, { en: "Your GRFs (encrypted supported), served over HTTPS; stream or full download", id: "GRF lo (yang terenkripsi juga bisa), lewat HTTPS; stream atau unduh penuh" }],
  [{ en: "Frame rate", id: "Frame rate" }, { en: "Up to 50 FPS at native resolution, built-in performance panel", id: "Sampai 50 FPS di resolusi asli, panel performa bawaan" }],
  [{ en: "Updates", id: "Update" }, { en: "Signed OTA code updates, one-command rollback", id: "Update kode OTA bertanda tangan, rollback satu perintah" }],
  [{ en: "Branding", id: "Branding" }, { en: "App name, icon, splash, loading screens", id: "Nama app, ikon, splash, loading screen" }],
  [{ en: "Anti-cheat", id: "Anti-cheat" }, { en: "Gepard or other PC shields: your server must let MoRo connect", id: "Gepard atau shield PC lain: server lo harus ngizinin MoRo connect" }]
];

const FAQ = [
  { q: { en: "Do players need a new account?", id: "Pemain perlu akun baru?" }, a: { en: "No. MoRo connects to your existing rAthena server, so phone and PC players share the same accounts and the same world.", id: "Nggak. MoRo nyambung ke server rAthena lo yang sekarang, jadi pemain HP dan PC pakai akun dan dunia yang sama." } },
  { q: { en: "My server uses Gepard. Will it work?", id: "Server gue pakai Gepard. Bisa?" }, a: { en: "Yes, as long as your server lets MoRo connect. PC shields can't run on Android, so the server has to allow the MoRo client.", id: "Bisa, asal server lo ngizinin MoRo connect. Shield PC nggak jalan di Android, jadi server harus ngizinin client MoRo." } },
  { q: { en: "How big is the download?", id: "Seberapa besar unduhannya?" }, a: { en: "Players don't need the whole client up front. Game data can stream per map as players move, or download in full in the background. You choose the default.", id: "Pemain nggak perlu unduh client penuh duluan. Data game bisa di-stream per map sambil jalan, atau diunduh penuh di belakang. Lo yang pilih default-nya." } },
  { q: { en: "Do fixes need a new APK?", id: "Perbaikan perlu APK baru?" }, a: { en: "No. Code fixes ship as signed over-the-air updates. A new APK is only needed for native changes.", id: "Nggak. Perbaikan kode dikirim lewat update OTA bertanda tangan. APK baru cuma perlu buat perubahan native." } },
  { q: { en: "Is there an iPhone version?", id: "Ada versi iPhone?" }, a: { en: "Not yet. MoRo is Android first.", id: "Belum. MoRo fokus Android dulu." } }
];

// UI text
const DICT = {
  en: {
    "nav.tour": "Tour", "nav.features": "Features", "nav.how": "How it works", "nav.specs": "Specs", "nav.pricing": "Pricing", "nav.back": "← dartfapper.pro",
    "cta.get": "Get MoRo", "cta.getFor": "Get MoRo for your server", "cta.see": "See it in action", "cta.discord": "Talk on Discord",
    "hero.kicker": "Mobile Ragnarok Engine",
    "hero.title": "Ragnarok Online,<br><span>made for your phone.</span>",
    "hero.text": "MoRo turns your rAthena server into an Android app. Your players join the same world as PC, from their phone, with a UI built for thumbs.",
    "joined": "{n} servers already run on MoRo",
    "stat.packet": "packet versions supported", "stat.fpsNum": "50 FPS", "stat.fps": "at native resolution",
    "stat.ota": "reinstalls: fixes arrive over the air", "stat.joined": "servers already on MoRo",
    "tour.kicker": "The tour", "tour.title": "Every button where <span>your thumb already is</span>",
    "tour.text": "Not a PC client shrunk down. Tap a number to see what each part of the screen does.",
    "feat.kicker": "Features", "feat.title": "Everything your players expect, <span>none of the PC baggage</span>",
    "gal.kicker": "Real screens", "gal.title": "Captured from <span>live servers</span>",
    "gal.text": "No mockups. These are MoRo builds running on servers that use it today.",
    "gal.c1": "Full menu one tap away: bag, equip, quests, guild, map",
    "gal.c2": "Tap to walk, with the route drawn on the ground",
    "gal.c3": "Login with your server's own branding",
    "how.kicker": "For server owners", "how.title": "From your server to <span>their phones</span>",
    "srv.kicker": "Already on MoRo", "srv.title": "servers, one engine",
    "srv.text": "Every server gets its own app: its own name, icon, splash and loading screens. Underneath, they all run the same MoRo engine, so a fix for one reaches all of them.",
    "srv.cta": "Add your server", "srv.visit": "Visit site",
    "cmp.kicker": "Compare", "cmp.title": "More client, <span>less cost</span>", "cmp.other": "Other paid mobile client",
    "cmp.r1": "Packet version", "cmp.r1a": "up to 2022", "cmp.r1b": "up to 2025",
    "cmp.r2": "3rd job effects", "cmp.no": "not supported", "cmp.yes": "included",
    "cmp.r3": "Modern UI", "cmp.many": "many missing",
    "cmp.r4": "Year 1", "cmp.r5": "Year 2+", "cmp.r5a": "$600 / year", "cmp.r5b": "$96 / year",
    "cmp.note": "Comparison based on public listings, October 2026.",
    "spec.kicker": "Tech specs", "spec.title": "The <span>fine print</span>",
    "price.kicker": "Pricing", "price.title": "One price, <span>first year included</span>",
    "price.once": "one-time", "price.incl": "Includes the first 12 months",
    "price.p1": "Branded APK: your name, icon, splash, loading screens",
    "price.p2": "Game data hosting setup",
    "price.p3": "Connection & packet check against your server",
    "price.p4": "Updates and support",
    "price.after": "$8 / month", "price.afterText": "after the first year: updates, fixes, support",
    "price.ui": "from $30", "price.uiText": "per custom UI window",
    "faq.kicker": "FAQ", "faq.title": "Questions <span>owners ask</span>",
    "final.title": "Put your server in their pocket.",
    "final.text": "Message on Discord with your server name and packet version.",
    "foot.legal": "Built on roBrowserLegacy (GPL-3.0). Ragnarok Online is a trademark of Gravity Co., Ltd.; MoRo is not affiliated with Gravity."
  },
  id: {
    "nav.tour": "Tur", "nav.features": "Fitur", "nav.how": "Cara kerja", "nav.specs": "Spesifikasi", "nav.pricing": "Harga", "nav.back": "← dartfapper.pro",
    "cta.get": "Pakai MoRo", "cta.getFor": "Pakai MoRo di server lo", "cta.see": "Lihat langsung", "cta.discord": "Ngobrol di Discord",
    "hero.kicker": "Mobile Ragnarok Engine",
    "hero.title": "Ragnarok Online,<br><span>dibikin buat HP.</span>",
    "hero.text": "MoRo bikin server rAthena lo jadi app Android. Pemain masuk ke dunia yang sama dengan PC, dari HP, dengan UI yang pas di jempol.",
    "joined": "{n} server sudah pakai MoRo",
    "stat.packet": "packet version didukung", "stat.fpsNum": "50 FPS", "stat.fps": "di resolusi asli",
    "stat.ota": "install ulang: perbaikan datang lewat OTA", "stat.joined": "server sudah pakai MoRo",
    "tour.kicker": "Tur", "tour.title": "Semua tombol ada <span>di bawah jempol</span>",
    "tour.text": "Bukan client PC yang dikecilin. Tap angkanya buat lihat fungsi tiap bagian layar.",
    "feat.kicker": "Fitur", "feat.title": "Semua yang pemain cari, <span>tanpa beban PC</span>",
    "gal.kicker": "Layar asli", "gal.title": "Diambil dari <span>server yang live</span>",
    "gal.text": "Bukan mockup. Ini build MoRo yang jalan di server yang pakai sekarang.",
    "gal.c1": "Menu lengkap satu tap: bag, equip, quest, guild, map",
    "gal.c2": "Tap buat jalan, rutenya digambar di tanah",
    "gal.c3": "Login dengan branding server sendiri",
    "how.kicker": "Buat owner server", "how.title": "Dari server lo ke <span>HP mereka</span>",
    "srv.kicker": "Sudah pakai MoRo", "srv.title": "server, satu engine",
    "srv.text": "Tiap server dapat app sendiri: nama, ikon, splash, dan loading screen sendiri. Di dalamnya semua jalan di engine MoRo yang sama, jadi perbaikan buat satu server sampai ke semuanya.",
    "srv.cta": "Tambahin server lo", "srv.visit": "Buka website",
    "cmp.kicker": "Perbandingan", "cmp.title": "Client lebih lengkap, <span>biaya lebih kecil</span>", "cmp.other": "Client mobile berbayar lain",
    "cmp.r1": "Packet version", "cmp.r1a": "sampai 2022", "cmp.r1b": "sampai 2025",
    "cmp.r2": "Efek job 3", "cmp.no": "nggak didukung", "cmp.yes": "sudah ada",
    "cmp.r3": "UI modern", "cmp.many": "banyak yang kurang",
    "cmp.r4": "Tahun 1", "cmp.r5": "Tahun 2+", "cmp.r5a": "$600 / tahun", "cmp.r5b": "$96 / tahun",
    "cmp.note": "Perbandingan dari listing publik, Oktober 2026.",
    "spec.kicker": "Spesifikasi", "spec.title": "Detail <span>teknisnya</span>",
    "price.kicker": "Harga", "price.title": "Satu harga, <span>tahun pertama sudah termasuk</span>",
    "price.once": "sekali bayar", "price.incl": "Sudah termasuk 12 bulan pertama",
    "price.p1": "APK ber-brand: nama, ikon, splash, loading screen lo",
    "price.p2": "Setup hosting data game",
    "price.p3": "Cek koneksi & packet ke server lo",
    "price.p4": "Update dan support",
    "price.after": "$8 / bulan", "price.afterText": "setelah tahun pertama: update, perbaikan, support",
    "price.ui": "mulai $30", "price.uiText": "per jendela UI custom",
    "faq.kicker": "FAQ", "faq.title": "Yang sering <span>ditanya owner</span>",
    "final.title": "Taruh server lo di saku pemain.",
    "final.text": "Chat di Discord, sebutin nama server dan packet version lo.",
    "foot.legal": "Dibangun di atas roBrowserLegacy (GPL-3.0). Ragnarok Online adalah merek dagang Gravity Co., Ltd.; MoRo nggak berafiliasi dengan Gravity."
  }
};

// ---------------------------------------------------------------------

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let lang = "en";
try { const saved = localStorage.getItem("lang"); if (saved && DICT[saved]) lang = saved; } catch {}
const ui = (key) => DICT[lang][key] ?? DICT.en[key] ?? key;
const tx = (v) => (v && typeof v === "object" ? (v[lang] ?? v.en ?? "") : (v ?? ""));

let activeSpot = 0;

function renderTour() {
  $("[data-hotspots]").innerHTML = HOTSPOTS.map((h, i) =>
    `<button type="button" class="spot" style="left:${h.x}%;top:${h.y}%" data-spot="${i}" aria-label="${esc(tx(h.t))}">${i + 1}</button>`).join("");
  $("[data-tour-list]").innerHTML = HOTSPOTS.map((h, i) =>
    `<li><button type="button" data-spot="${i}"><b>${i + 1}</b><span><strong>${esc(tx(h.t))}</strong><em>${esc(tx(h.d))}</em></span></button></li>`).join("");
  $$("[data-spot]").forEach((b) => {
    b.addEventListener("click", () => setSpot(+b.dataset.spot));
    b.addEventListener("mouseenter", () => setSpot(+b.dataset.spot));
  });
  setSpot(activeSpot);
}
function setSpot(i) {
  activeSpot = i;
  $$("[data-spot]").forEach((b) => b.classList.toggle("on", +b.dataset.spot === i));
}

function render() {
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = ui(el.dataset.i18n); });
  $$("[data-i18n-html]").forEach((el) => { el.innerHTML = ui(el.dataset.i18nHtml); });
  $$("[data-lang-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.langBtn === lang)));

  const n = MORO_SERVERS.length;
  $$("[data-stat='joined']").forEach((el) => (el.textContent = n));
  $("[data-joined-text]").textContent = ui("joined").replace("{n}", n);
  $("[data-joined-icons]").innerHTML = MORO_SERVERS.map((s) => `<img src="${esc(s.icon)}" width="36" height="36" alt="${esc(s.name)}" title="${esc(s.name)}">`).join("");

  renderTour();

  $("[data-features]").innerHTML = FEATURES.map((f) => `
    <li class="feat" data-reveal>
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="${f.i}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h3>${esc(tx(f.t))}</h3>
      <p>${esc(tx(f.d))}</p>
    </li>`).join("");

  $("[data-steps]").innerHTML = STEPS.map((s, i) => `
    <li class="step" data-reveal>
      <span class="step-num">0${i + 1}</span>
      <h3>${esc(tx(s.t))}</h3>
      <p>${esc(tx(s.d))}</p>
    </li>`).join("");

  $("[data-servers]").innerHTML = MORO_SERVERS.map((s) => `
    <li data-reveal>
      <a class="srv" href="${esc(s.url)}" target="_blank" rel="noopener">
        <img src="${esc(s.icon)}" width="72" height="72" alt="" loading="lazy">
        <span class="srv-body">
          <strong>${esc(s.name)}</strong>
          <span>${esc(s.type)}</span>
          <small><i class="dot" aria-hidden="true"></i>${esc(tx(s.since))}</small>
        </span>
        <span class="srv-go">${esc(ui("srv.visit"))}</span>
      </a>
    </li>`).join("");

  $("[data-specs]").innerHTML = SPECS.map(([k, v]) => `<div><dt>${esc(tx(k))}</dt><dd>${esc(tx(v))}</dd></div>`).join("");

  $("[data-faq]").innerHTML = FAQ.map((f, i) => `
    <details${i === 0 ? " open" : ""}><summary>${esc(tx(f.q))}</summary><p>${esc(tx(f.a))}</p></details>`).join("");

  observeReveal();
}

/* language */
$$("[data-lang-btn]").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.langBtn === lang) return;
  lang = b.dataset.langBtn;
  try { localStorage.setItem("lang", lang); } catch {}
  render();
  $$("[data-reveal]").forEach((el) => el.classList.add("revealed"));
}));

/* reveal on scroll */
const io = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("revealed"); io.unobserve(e.target); }
    }), { threshold: .12 })
  : null;
function observeReveal() {
  $$("[data-reveal]:not(.revealed)").forEach((el) => (io ? io.observe(el) : el.classList.add("revealed")));
}

render();

$$("[data-discord]").forEach((a) => (a.href = DISCORD_URL));
$("[data-year]").textContent = new Date().getFullYear();

const nav = $("[data-nav]");
const onScroll = () => nav.classList.toggle("active", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
