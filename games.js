// =====================================================================
//  DAFTAR GAME — cuma file ini yang perlu diedit buat nambah/ubah game.
//
//  Field:
//    id      : slug unik, huruf kecil tanpa spasi (dipakai buat anchor #id)
//    title   : nama game
//    kind    : jenis game, singkat (mis. "Game kartu", "MMORPG server")
//    status  : "live" | "beta" | "soon"
//    blurb   : 1–2 kalimat, apa yang dimainin
//    url     : link main. Game yang di repo ini: "games/<folder>/"
//              Game di luar (Framer, server RO, dll): link lengkap https://...
//              Kosongin "" kalau belum ada link.
//    cta     : teks tombol (mis. "Main sekarang", "Download client")
//    color   : warna aksen kartu (hex)
// =====================================================================

window.GAMES = [
  {
    id: "mythrix",
    title: "Mythrix",
    kind: "Game kartu",
    status: "beta",
    blurb: "Duel kartu bertema mitologi. Susun deck, baca langkah lawan, habisin HP-nya duluan.",
    url: "", // TODO: isi link Mythrix (Framer atau games/mythrix/)
    cta: "Main sekarang",
    color: "#D8453B"
  },
  {
    id: "ragnarok",
    title: "Ragnarok",
    kind: "Server MMORPG",
    status: "live",
    blurb: "Server Ragnarok Online custom, sistem dan event dibikin sendiri. Download client, bikin akun, langsung login.",
    url: "", // TODO: isi link website / panel server
    cta: "Kunjungi server",
    color: "#2E8B57"
  },
  {
    id: "next",
    title: "Game berikutnya",
    kind: "Lagi digarap",
    status: "soon",
    blurb: "Masih di meja kerja. Pantau Discord buat kabar duluan.",
    url: "",
    cta: "",
    color: "#E2B04A"
  }
];

// Link Discord, dipakai di header & footer. Kosongin "" kalau mau disembunyiin.
window.DISCORD_URL = ""; // TODO: isi link invite Discord
