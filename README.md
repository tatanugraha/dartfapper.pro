# dartfapper.pro

Hub semua game buatan Tata. Static site, di-host GitHub Pages, auto-update tiap push ke `main`.

## Nambah / ubah game

Edit `games.js` aja. Tiap game satu objek:

```js
{
  id: "mythrix",            // slug unik
  title: "Mythrix",
  kind: "Game kartu",
  status: "beta",           // live | beta | soon
  blurb: "Deskripsi singkat.",
  url: "games/mythrix/",    // atau link luar https://...
  cta: "Main sekarang",
  color: "#D8453B"
}
```

Dart di papan dan kartu di daftar kebikin otomatis dari list ini.

## Game yang di-host di repo ini

Taruh tiap game di foldernya sendiri, dengan `index.html` di dalamnya:

```
games/
  mythrix/index.html   -> dartfapper.pro/games/mythrix/
  game-2/index.html    -> dartfapper.pro/games/game-2/
```

Terus isi `url: "games/mythrix/"` di `games.js`.

## Deploy

```
git add .
git commit -m "update"
git push
```

GitHub Pages: Settings → Pages → Source `main` / root, Custom domain `dartfapper.pro`.
