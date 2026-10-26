(function () {
  const games = window.GAMES || [];
  const NS = "http://www.w3.org/2000/svg";
  const board = document.getElementById("board");
  const hint = document.getElementById("board-hint");
  const list = document.getElementById("game-list");
  const hintDefault = hint.textContent;

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // ---------- papan dart ----------
  const css = getComputedStyle(document.documentElement);
  const C = (v) => css.getPropertyValue(v).trim();
  const red = C("--red"), green = C("--green"), sisal = C("--sisal"), dark = "#1A1A1A";

  const R = { outer: 200, double: 170, doubleIn: 160, triple: 106, tripleIn: 96, bull: 16, bullseye: 7 };
  const nums = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const rad = (d) => (d - 90) * Math.PI / 180;

  function wedge(r1, r2, a1, a2, fill) {
    const p = (r, a) => `${(r * Math.cos(rad(a))).toFixed(2)} ${(r * Math.sin(rad(a))).toFixed(2)}`;
    el("path", {
      d: `M${p(r1, a1)} L${p(r2, a1)} A${r2} ${r2} 0 0 1 ${p(r2, a2)} L${p(r1, a2)} A${r1} ${r1} 0 0 0 ${p(r1, a1)}Z`,
      fill, stroke: "#C9CED6", "stroke-width": .8
    }, face);
  }

  el("circle", { r: 214, fill: C("--wall-2") }, board);
  el("circle", { r: R.outer + 2, fill: "#101010" }, board);
  const face = el("g", {}, board);

  for (let i = 0; i < 20; i++) {
    const a1 = i * 18 - 9, a2 = a1 + 18;
    const even = i % 2 === 0;
    wedge(R.bull, R.tripleIn, a1, a2, even ? dark : sisal);
    wedge(R.tripleIn, R.triple, a1, a2, even ? red : green);
    wedge(R.triple, R.doubleIn, a1, a2, even ? dark : sisal);
    wedge(R.doubleIn, R.double, a1, a2, even ? red : green);
    const t = el("text", {
      x: (186 * Math.cos(rad(i * 18))).toFixed(1),
      y: (186 * Math.sin(rad(i * 18))).toFixed(1),
      "text-anchor": "middle", "dominant-baseline": "central",
      fill: "#E9E4D8", "font-family": "Big Shoulders Display, Impact, sans-serif",
      "font-weight": 700, "font-size": 19
    }, face);
    t.textContent = nums[i];
  }
  el("circle", { r: R.bull, fill: green, stroke: "#C9CED6", "stroke-width": .8 }, face);
  el("circle", { r: R.bullseye, fill: red }, face);

  // ---------- dart per game ----------
  // Posisi nancep: disebar di papan, game pertama paling deket bullseye.
  const spots = [
    { r: 40, a: 320 }, { r: 130, a: 62 }, { r: 120, a: 205 },
    { r: 70, a: 140 }, { r: 150, a: 280 }, { r: 95, a: 15 },
    { r: 160, a: 165 }, { r: 55, a: 240 }
  ];
  const darts = el("g", {}, board);

  function drawDart(game, i) {
    const s = spots[i % spots.length];
    const x = s.r * Math.cos(rad(s.a)), y = s.r * Math.sin(rad(s.a));
    const g = el("g", {
      class: "dart", tabindex: 0, role: "link",
      "aria-label": `${game.title}, ${game.kind}`, "data-id": game.id
    }, darts);
    const pos = el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` }, g);
    const body = el("g", {
      class: "dart-body",
      style: `--dx:60px;--dy:-90px;--delay:${(.25 + i * .18).toFixed(2)}s`
    }, pos);
    // dart condong ke kanan atas: ujung di (0,0)
    const shaft = el("g", { transform: "rotate(-38)" }, body);
    el("circle", { class: "hit", r: 30, cx: 0, cy: -40 }, shaft);
    el("line", { x1: 0, y1: 0, x2: 0, y2: -18, stroke: "#C9CED6", "stroke-width": 2.4, "stroke-linecap": "round" }, shaft);
    el("rect", { x: -4, y: -46, width: 8, height: 30, rx: 3, fill: "#2A2F36", stroke: "#0E1013", "stroke-width": 1 }, shaft);
    el("rect", { x: -1.6, y: -66, width: 3.2, height: 22, fill: "#DADDE2" }, shaft);
    const flight = el("path", {
      class: "flight",
      d: "M0 -60 L-15 -84 L-15 -92 L0 -78 L15 -92 L15 -84 Z",
      fill: game.color, stroke: "#0E1013", "stroke-width": 1.2
    }, shaft);
    el("circle", { r: 3, fill: "rgba(0,0,0,.45)" }, body);

    const activate = (on) => {
      g.classList.toggle("is-active", on);
      const card = document.getElementById(game.id);
      if (card) card.classList.toggle("is-active", on);
      hint.textContent = on ? `${game.title}: ${game.kind}` : hintDefault;
    };
    g.addEventListener("mouseenter", () => activate(true));
    g.addEventListener("mouseleave", () => activate(false));
    g.addEventListener("focus", () => activate(true));
    g.addEventListener("blur", () => activate(false));
    const go = () => {
      const card = document.getElementById(game.id);
      if (card) { card.scrollIntoView({ block: "center" }); card.querySelector("a,.play-off")?.focus?.(); }
    };
    g.addEventListener("click", go);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  }

  // ---------- kartu daftar game ----------
  const statusLabel = { live: "Udah jalan", beta: "Beta", soon: "Segera" };

  function drawCard(game) {
    const li = document.createElement("li");
    li.className = "game";
    li.id = game.id;
    li.dataset.status = game.status;
    li.style.setProperty("--accent", game.color);

    const external = /^https?:\/\//.test(game.url);
    let action;
    if (game.url && game.cta) {
      action = `<a class="play" href="${game.url}"${external ? ' target="_blank" rel="noopener"' : ""}>${game.cta}</a>`;
    } else if (game.status === "soon") {
      action = `<span class="play-off" tabindex="-1">Belum bisa dimainin</span>`;
    } else {
      action = `<span class="play-off" tabindex="-1">Link nyusul</span>`;
    }

    li.innerHTML = `
      <div class="game-mark" aria-hidden="true"></div>
      <div>
        <h3 class="game-title">${game.title}</h3>
        <div class="game-meta"><span>${game.kind}</span><span class="status" data-s="${game.status}">${statusLabel[game.status] || game.status}</span></div>
        <p class="game-blurb">${game.blurb}</p>
      </div>
      <div class="game-action">${action}</div>`;
    li.addEventListener("mouseenter", () => darts.querySelector(`[data-id="${game.id}"]`)?.classList.add("is-active"));
    li.addEventListener("mouseleave", () => darts.querySelector(`[data-id="${game.id}"]`)?.classList.remove("is-active"));
    list.appendChild(li);
  }

  games.forEach((g, i) => { drawDart(g, i); drawCard(g); });

  // ---------- Discord ----------
  if (window.DISCORD_URL) {
    document.querySelectorAll("[data-discord]").forEach((a) => {
      a.href = window.DISCORD_URL; a.target = "_blank"; a.rel = "noopener"; a.hidden = false;
    });
  }
})();
