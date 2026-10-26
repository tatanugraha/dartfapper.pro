# dartfapper.pro

Hub semua game buatan Tata. Static site di GitHub Pages, auto-update tiap push ke `main`.
Layout terinspirasi [Unigine](https://github.com/codewithsadee/unigine) (MIT).

## Struktur

```
index.html
assets/
  css/style.css
  js/data.js      <- ISI WEBSITE: game, server portfolio, update, link Discord & Fiverr
  js/i18n.js      <- teks UI EN/ID (EN default)
  js/script.js
  images/         <- hero banner, emblem game, favicon (SVG)
games/            <- (opsional) game yang di-host di sini, satu folder per game
CNAME             <- jangan dihapus, ini buat custom domain
```

## Nambah game

Buka `assets/js/data.js`, tambah objek di `window.GAMES`:

```js
{
  id: "game-baru",
  title: "Game Baru",
  tag: "Puzzle",
  status: "beta",          // live | beta | soon
  info: "Main di browser",
  blurb: "Deskripsi singkat.",
  emblem: "assets/images/emblem-game-baru.svg",   // png/jpg juga bisa
  url: "games/game-baru/", // atau https://...
  cta: "Main sekarang"
}
```

## Nambah update

Tambah objek di `window.NEWS` (yang paling atas tampil duluan).

## Deploy

```
git add .
git commit -m "update"
git push
```
