"use strict";

const GAMES = window.GAMES || [];
const NEWS = window.NEWS || [];
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isExternal = (u) => /^https?:\/\//.test(u);
const linkAttrs = (u) => (isExternal(u) ? ' target="_blank" rel="noopener"' : "");

/* ---------- daftar game ---------- */
const statusText = { live: "Live", beta: "Beta", soon: "Soon" };

$("#game-list").innerHTML = GAMES.map((g) => {
  const action = g.url && g.cta
    ? `<a class="btn btn-primary" href="${esc(g.url)}"${linkAttrs(g.url)}>${esc(g.cta)}</a>`
    : `<span class="btn-off">${g.status === "soon" ? "Belum bisa dimainin" : "Link nyusul"}</span>`;
  return `
  <li class="game-item" id="${esc(g.id)}" data-reveal>
    <img class="game-emblem" src="${esc(g.emblem)}" width="120" height="120" alt="" loading="lazy">
    <div class="game-info">
      <h3 class="game-name">${esc(g.title)}</h3>
      <span class="game-tag">${esc(g.tag)}</span>
      <p class="game-blurb">${esc(g.blurb)}</p>
    </div>
    <div class="game-status">
      <p class="status-word" data-s="${esc(g.status)}">${g.status === "live" ? '<span class="status-dot" aria-hidden="true"></span>' : ""}${statusText[g.status] || esc(g.status)}</p>
      <p class="status-info">${esc(g.info)}</p>
    </div>
    <div class="game-action">${action}</div>
  </li>`;
}).join("");

/* ---------- news ---------- */
const fmtDate = (d) => {
  const t = new Date(d + "T00:00:00");
  return isNaN(t) ? d : t.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};
const gameById = Object.fromEntries(GAMES.map((g) => [g.id, g]));

$("#news-list").innerHTML = NEWS.map((n) => {
  const g = gameById[n.game];
  const img = g ? g.emblem : "assets/images/favicon.svg";
  const chip = g ? g.title : "Umum";
  const more = n.url ? `<a class="news-link" href="${esc(n.url)}"${linkAttrs(n.url)}>Baca selengkapnya</a>` : "";
  return `
  <li data-reveal>
    <article class="news-card">
      <figure class="news-thumb" data-game="${esc(n.game)}">
        <img src="${esc(img)}" width="200" height="200" alt="" loading="lazy">
        <span class="news-chip">${esc(chip)}</span>
      </figure>
      <div class="news-body">
        <time class="news-date" datetime="${esc(n.date)}">${fmtDate(n.date)}</time>
        <h3 class="news-title">${esc(n.title)}</h3>
        <p class="news-text">${esc(n.text)}</p>
        ${more}
      </div>
    </article>
  </li>`;
}).join("");

/* ---------- footer: link game ---------- */
const footerGames = $("[data-footer-games]");
footerGames.outerHTML = GAMES.filter((g) => g.status !== "soon")
  .map((g) => `<li><a href="#${esc(g.id)}" class="footer-link">${esc(g.title)}</a></li>`).join("");
$("[data-year]").textContent = new Date().getFullYear();

/* ---------- Discord ---------- */
$$("[data-discord]").forEach((a) => {
  if (window.DISCORD_URL) a.href = window.DISCORD_URL;
  else a.hidden = true, a.style.display = "none";
});

/* ---------- Fiverr ---------- */
$$("[data-gig]").forEach((a) => {
  if (window.GIG_URL) a.href = window.GIG_URL;
  else $("#service").hidden = true;
});

/* ---------- navbar mobile ---------- */
const navbar = $("[data-navbar]");
const toggler = $("[data-nav-toggler]");
const setNav = (open) => {
  navbar.classList.toggle("active", open);
  toggler.classList.toggle("active", open);
  toggler.setAttribute("aria-expanded", String(open));
  toggler.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  document.body.classList.toggle("nav-active", open);
};
toggler.addEventListener("click", () => setNav(!navbar.classList.contains("active")));
$$("[data-nav-link]").forEach((l) => l.addEventListener("click", () => setNav(false)));

/* ---------- header & back-to-top ---------- */
const header = $("[data-header]");
const backTop = $("[data-back-top-btn]");
const onScroll = () => {
  const y = window.scrollY > 80;
  header.classList.toggle("active", y);
  backTop.classList.toggle("active", y);
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- reveal ---------- */
const io = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("revealed"); io.unobserve(e.target); }
    }), { threshold: .15 })
  : null;
$$("[data-reveal]").forEach((el) => (io ? io.observe(el) : el.classList.add("revealed")));
