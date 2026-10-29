// =====================================================================
//  SITE CONTENT — edit this file to add games, servers, and updates.
//  Text that changes with the language toggle is written as
//  { en: "...", id: "..." }. Plain strings show the same in both languages.
// =====================================================================

window.DISCORD_URL = "https://discord.gg/cM69F5Gr2E"; // "" hides the buttons
window.API_URL = "https://dartfapper-api.tatagpriyanugraha.workers.dev"; // "" hides login
window.GIG_URL ="https://www.fiverr.com/tatanugraha/your-own-online-ragnarok-server";

// ---------------------------------------------------------------------
//  GAMES
//    status : "live" | "beta" | "soon"
//    url    : local "games/name/" or external "https://..."
// ---------------------------------------------------------------------
window.GAMES = [
  {
    id: "ragnarok",
    title: "Ragnarok",
    tag: { en: "MMORPG servers", id: "Server MMORPG" },
    status: "live",
    info: { en: "5 servers + mobile client", id: "5 server + client mobile" },
    blurb: {
      en: "Custom Ragnarok Online servers with hand-built systems and events. Pick a server below and jump in.",
      id: "Server Ragnarok Online custom dengan sistem dan event bikinan sendiri. Pilih server di bawah, langsung main."
    },
    emblem: "assets/images/emblem-ragnarok.png",
    url: "#portfolio",
    cta: { en: "See servers", id: "Lihat server" }
  },
  {
    id: "moro",
    title: "MoRo",
    tag: { en: "Mobile RO client", id: "Client RO mobile" },
    status: "live",
    info: { en: "2 servers on MoRo · Android", id: "2 server pakai MoRo · Android" },
    blurb: {
      en: "Ragnarok Online made for your phone. Your rAthena server as an Android app, with a UI built for thumbs.",
      id: "Ragnarok Online yang dibikin buat HP. Server rAthena lo jadi app Android, UI-nya pas di jempol."
    },
    emblem: "assets/images/emblem-moro.png",
    url: "moro/", // switch to "https://moro.dartfapper.pro/" once that subdomain is live
    cta: { en: "Explore MoRo", id: "Lihat MoRo" }
  },
  {
    id: "mythrix",
    title: "Mythrix",
    tag: { en: "Card game", id: "Game kartu" },
    status: "beta",
    info: { en: "Plays in browser", id: "Main di browser" },
    blurb: {
      en: "A mythology card duel. Build a deck, read your opponent, drop their HP first.",
      id: "Duel kartu bertema mitologi. Susun deck, baca langkah lawan, habisin HP-nya duluan."
    },
    emblem: "assets/images/emblem-mythrix.svg",
    url: "", // TODO: Mythrix link
    cta: { en: "Play now", id: "Main sekarang" }
  },
  {
    id: "next",
    title: { en: "Next game", id: "Game berikutnya" },
    tag: { en: "In development", id: "Lagi digarap" },
    status: "soon",
    info: { en: "Under wraps", id: "Rahasia dulu" },
    blurb: {
      en: "Still on the workbench. Join the Discord to hear about it first.",
      id: "Masih di meja kerja. Pantau Discord buat kabar duluan."
    },
    emblem: "assets/images/emblem-soon.svg",
    url: "",
    cta: ""
  }
];

// ---------------------------------------------------------------------
//  SERVER PORTFOLIO
//    status  : "online" | "soon" | "offline"
//    since   : launch date text
//    players : average players, e.g. "150+". Leave "" to show "—".
//    image   : screenshot in assets/images/servers/
// ---------------------------------------------------------------------
window.SERVERS = [
  {
    name: "Sovereign RO",
    type: "Renewal",
    version: { en: "Episode Chapters 1–2", id: "Episode Chapter 1–2" },
    status: "online",
    since: { en: "June 2026", id: "Juni 2026" },
    players: "", // TODO
    url: "https://sovereignro.com/",
    image: "assets/images/servers/sovereign.jpg"
  },
  {
    name: "OTTi RO",
    type: "Pre-Renewal",
    version: "Episode 13.1",
    status: "online",
    since: { en: "June 2026", id: "Juni 2026" },
    players: "", // TODO
    url: "http://otti.24-7.ro/",
    image: "assets/images/servers/otti.jpg"
  },
  {
    name: "Shinwa RO",
    type: "Pre-Renewal",
    version: "Episode 5",
    status: "online",
    since: { en: "July 2026", id: "Juli 2026" },
    players: "", // TODO
    url: "http://shinwa.dex-online.ro/",
    image: "assets/images/servers/shinwa.jpg"
  },
  {
    name: "New Era RO",
    type: "Pre-Renewal",
    version: "Revo",
    status: "online",
    since: { en: "August 2026", id: "Agustus 2026" },
    players: "", // TODO
    url: "https://newera-ro.com/",
    image: "assets/images/servers/newera.jpg"
  },
  {
    name: "Lepak RO",
    type: "Pre-Renewal",
    version: "Revo",
    status: "online",
    since: "2026",
    players: "", // TODO
    url: "https://lepakro.com/",
    image: "assets/images/servers/lepak.jpg"
  }
];

// ---------------------------------------------------------------------
//  NEWS — newest first.  game: a game id above (for the picture), or "".
// ---------------------------------------------------------------------
window.NEWS = [
  {
    game: "ragnarok",
    date: "2026-10-26",
    title: { en: "Every server, one portfolio", id: "Semua server, satu portfolio" },
    text: {
      en: "Every RO server I've built now lives on one page, with links straight to each one.",
      id: "Semua server RO yang gue bangun sekarang ngumpul di satu halaman, lengkap sama link-nya."
    },
    url: "#portfolio"
  },
  {
    game: "mythrix",
    date: "2026-10-26",
    title: { en: "Mythrix enters beta", id: "Mythrix masuk tahap beta" },
    text: {
      en: "Cards and balance can still change. Found a bug? Report it on Discord.",
      id: "Kartu dan balancing masih bisa berubah. Kalau nemu bug, lapor di Discord."
    },
    url: ""
  },
  {
    game: "next",
    date: "2026-10-26",
    title: { en: "dartfapper.pro is live", id: "dartfapper.pro resmi online" },
    text: {
      en: "One address for every game. New ones get added to the list as they ship.",
      id: "Satu alamat buat semua game. Game baru tinggal ditambahin ke daftar."
    },
    url: ""
  }
];
