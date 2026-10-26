// =====================================================================
//  ISI WEBSITE — edit file ini aja buat nambah game / update.
// =====================================================================

// Link Discord (tombol di header & footer). Kosongin "" buat nyembunyiin.
window.DISCORD_URL = ""; // TODO: isi link invite Discord

// Link gig Fiverr (tombol di section Jasa).
window.GIG_URL = "https://www.fiverr.com/tatanugraha/your-own-online-ragnarok-server";

// ---------------------------------------------------------------------
//  GAME
//    id      : slug unik (huruf kecil, tanpa spasi)
//    title   : nama game
//    tag     : jenis game, pendek
//    status  : "live" | "beta" | "soon"
//    info    : teks kecil di bawah status (mis. "Rate x30 · Ep 10.3")
//    blurb   : 1–2 kalimat
//    emblem  : gambar logo di kiri (taruh di assets/images/)
//    url     : link main. Lokal: "games/nama/"  · Luar: "https://..."
//    cta     : teks tombol
// ---------------------------------------------------------------------
window.GAMES = [
  {
    id: "ragnarok",
    title: "Ragnarok",
    tag: "Server MMORPG",
    status: "live",
    info: "Server custom",
    blurb: "Server Ragnarok Online dengan sistem dan event bikinan sendiri. Download client, bikin akun, langsung login.",
    emblem: "assets/images/emblem-ragnarok.svg",
    url: "", // TODO: link website / panel server
    cta: "Kunjungi server"
  },
  {
    id: "mythrix",
    title: "Mythrix",
    tag: "Game kartu",
    status: "beta",
    info: "Main di browser",
    blurb: "Duel kartu bertema mitologi. Susun deck, baca langkah lawan, habisin HP-nya duluan.",
    emblem: "assets/images/emblem-mythrix.svg",
    url: "", // TODO: link Mythrix (Framer atau games/mythrix/)
    cta: "Main sekarang"
  },
  {
    id: "next",
    title: "Game berikutnya",
    tag: "Lagi digarap",
    status: "soon",
    info: "Rahasia dulu",
    blurb: "Masih di meja kerja. Pantau Discord buat kabar duluan.",
    emblem: "assets/images/emblem-soon.svg",
    url: "",
    cta: ""
  }
];

// ---------------------------------------------------------------------
//  UPDATE / NEWS — yang paling atas tampil paling kiri.
//    game : id game di atas (buat warna & gambar), atau "" buat umum
//    date : "2026-10-26"
// ---------------------------------------------------------------------
window.NEWS = [
  {
    game: "ragnarok",
    date: "2026-10-26",
    title: "Server Ragnarok sekarang punya rumah baru",
    text: "Semua info server, link download, dan event bakal dikumpulin di sini.",
    url: ""
  },
  {
    game: "mythrix",
    date: "2026-10-26",
    title: "Mythrix masuk tahap beta",
    text: "Kartu dan balancing masih bisa berubah. Kalau nemu bug, lapor di Discord.",
    url: ""
  },
  {
    game: "next",
    date: "2026-10-26",
    title: "dartfapper.pro resmi online",
    text: "Satu alamat buat semua game. Game baru tinggal ditambahin ke daftar.",
    url: ""
  }
];
