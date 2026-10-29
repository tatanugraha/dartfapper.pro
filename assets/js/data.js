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

// ---------------------------------------------------------------------
//  NATIVE CUSTOM UI (OTTi RO, PC client) — real client windows, not overlays.
//    wide: true spans the full row (big windows).
// ---------------------------------------------------------------------
window.NATIVE_UI = [
  {
    name: "Battlepass",
    image: "assets/images/native/battlepass.jpg",
    wide: true,
    text: {
      en: "Seasons with a free and a premium reward track. Daily quests and weekly MVP hunts count up live as players kill monsters, and rewards are claimed straight from the window.",
      id: "Season dengan jalur hadiah free dan premium. Daily quest dan weekly MVP hunt nambah langsung tiap pemain bunuh monster, hadiah diklaim langsung dari window."
    }
  },
  {
    name: "Card Collector",
    image: "assets/images/native/cardcollector.jpg",
    wide: true,
    text: {
      en: "An album of every card in the game. Players deposit cards, complete sets for permanent bonuses, and search or filter by set, owned cards, or their own album.",
      id: "Album semua kartu di game. Pemain setor kartu, lengkapi set buat bonus permanen, dan cari atau filter per set, kartu yang dimiliki, atau album sendiri."
    }
  },
  {
    name: "Auto Potion",
    image: "assets/images/native/autopotion.jpg",
    text: {
      en: "Drag a potion from the inventory and set an HP or SP threshold. It drinks automatically, pauses when the stack runs out and resumes on restock. Faster check rates can be VIP-only.",
      id: "Drag potion dari inventory dan atur batas HP atau SP. Diminum otomatis, berhenti kalau habis dan lanjut lagi pas restock. Kecepatan cek tercepat bisa khusus VIP."
    }
  },
  {
    name: "Auto Skill",
    image: "assets/images/native/autoskill.jpg",
    text: {
      en: "Keeps support buffs up by recasting them the moment they run out. Drag a skill from the skill list into a slot; one slot is free, three more unlock with VIP.",
      id: "Jaga buff tetap aktif, di-cast ulang begitu habis. Drag skill dari skill list ke slot; satu slot gratis, tiga lagi kebuka buat VIP."
    }
  },
  {
    name: { en: "Gear tab (10 extra slots)", id: "Tab Gear (10 slot tambahan)" },
    image: "assets/images/native/gear.jpg",
    text: {
      en: "A new tab inside the Equip window: Outfit, Aura, Footprint, Effect, Name, Chat and four Skill slots that change how a player's skills look to everyone.",
      id: "Tab baru di window Equip: Outfit, Aura, Footprint, Effect, Name, Chat, dan empat slot Skill yang ngubah tampilan skill pemain di mata semua orang."
    }
  },
  {
    name: "Graymap",
    image: "assets/images/native/graymap.jpg",
    text: {
      en: "Draws the map as flat coloured cells so walkable ground, walls, water and shootable walls are easy to read in PvP and WoE. Every colour is adjustable; the LGP tab shows ground-skill cells.",
      id: "Gambar map jadi kotak warna polos, jadi tanah jalan, tembok, air, dan tembok tembak gampang kebaca waktu PvP dan WoE. Semua warna bisa diatur; tab LGP nampilin cell skill tanah."
    }
  },
  {
    name: "Stylist",
    image: "assets/images/native/stylist.jpg",
    text: {
      en: "The built-in stylist, fixed: numbered hairstyle and hair-colour pickers and an outfit tab that works for every job.",
      id: "Stylist bawaan yang sudah diperbaiki: pilihan gaya dan warna rambut bernomor, plus tab outfit yang jalan di semua job."
    }
  },
  {
    name: "Voice chat",
    image: "assets/images/native/voice.jpg",
    text: {
      en: "In-game voice with push-to-talk or open mic, a rebindable talk key, per-player volume and device choice. PC and MoRo mobile players talk to each other.",
      id: "Voice di dalam game: push-to-talk atau open mic, tombol bicara bisa diganti, volume per pemain, dan pilihan device. Pemain PC dan MoRo mobile bisa ngobrol bareng."
    }
  }
];

// Built and running, no screenshot on the page yet.
window.NATIVE_MORE = [
  { name: "Attendance", text: { en: "7-day reward rows plus a VIP daily page", id: "Hadiah login 7 hari per baris plus halaman VIP harian" } },
  { name: "Auto Hunt", text: { en: "Seven-tab auto hunt setup, if the server allows it", id: "Setup auto hunt 7 tab, kalau server ngizinin" } },
  { name: { en: "Profile & Social", id: "Profil & Social" }, text: { en: "Player profiles with bio and custom VIP/GM backgrounds", id: "Profil pemain dengan bio dan latar custom VIP/GM" } },
  { name: { en: "Nick colours & rank emblems", id: "Warna nick & emblem rank" }, text: { en: "Coloured names and chat bubbles, rank badges", id: "Nama dan balon chat berwarna, badge rank" } },
  { name: { en: "Skill visuals", id: "Visual skill" }, text: { en: "Per-player skill effects from the Skill gear slots", id: "Efek skill per pemain dari slot gear Skill" } },
  { name: { en: "GO menu", id: "Menu GO" }, text: { en: "One button next to the cash shop that opens every custom window", id: "Satu tombol di samping cash shop buat buka semua window custom" } }
];
