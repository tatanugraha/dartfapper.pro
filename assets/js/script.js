"use strict";

const GAMES = window.GAMES || [];
const SERVERS = window.SERVERS || [];
const NEWS = window.NEWS || [];
const NATIVE_UI = window.NATIVE_UI || [];
const NATIVE_MORE = window.NATIVE_MORE || [];
const DICT = window.I18N || { en: {} };

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isExternal = (u) => /^https?:\/\//.test(u);
const linkAttrs = (u) => (isExternal(u) ? ' target="_blank" rel="noopener"' : "");
const hostOf = (u) => { try { return new URL(u).host; } catch { return ""; } };

/* ---------- language ---------- */
let lang = "en";
try { const saved = localStorage.getItem("lang"); if (saved && DICT[saved]) lang = saved; } catch {}

const ui = (key) => (DICT[lang] && DICT[lang][key]) ?? DICT.en[key] ?? key;
const tx = (v) => (v && typeof v === "object" ? (v[lang] ?? v.en ?? "") : (v ?? ""));

/* ---------- renderers ---------- */
function renderGames() {
  $("#game-list").innerHTML = GAMES.map((g) => {
    const action = g.url && g.cta
      ? `<a class="btn btn-primary" href="${esc(g.url)}"${linkAttrs(g.url)}>${esc(tx(g.cta))}</a>`
      : `<span class="btn-off">${esc(ui(g.status === "soon" ? "game.notYet" : "game.noLink"))}</span>`;
    return `
    <li class="game-item" id="${esc(g.id)}" data-reveal>
      <img class="game-emblem" src="${esc(g.emblem)}" width="120" height="120" alt="" loading="lazy">
      <div class="game-info">
        <h3 class="game-name">${esc(tx(g.title))}</h3>
        <span class="game-tag">${esc(tx(g.tag))}</span>
        <p class="game-blurb">${esc(tx(g.blurb))}</p>
      </div>
      <div class="game-status">
        <p class="status-word" data-s="${esc(g.status)}">${g.status === "live" ? '<span class="status-dot" aria-hidden="true"></span>' : ""}${esc(ui("status." + g.status))}</p>
        <p class="status-info">${esc(tx(g.info))}</p>
      </div>
      <div class="game-action">${action}</div>
    </li>`;
  }).join("");
}

function renderServers() {
  $("#server-grid").innerHTML = SERVERS.map((s, i) => {
    const online = s.status === "online";
    const statusLabel = ui(online ? "status.online" : s.status === "offline" ? "status.offline" : "status.comingSoon");
    const since = tx(s.since);
    const players = s.players ? esc(s.players) : "—";
    const host = hostOf(s.url) || "Android · APK";
    const tag = s.url ? "a" : "div";
    const href = s.url ? ` href="${esc(s.url)}" target="_blank" rel="noopener"` : "";
    return `
    <li class="server-item${s.kind === "client" ? " is-wide" : i === 0 ? " is-featured" : ""}" data-reveal>
      <${tag} class="server-card" data-status="${esc(s.status)}"${href}>
        <div class="browser">
          <div class="browser-bar" aria-hidden="true">
            <span class="dots"><i></i><i></i><i></i></span>
            <span class="url">${esc(host)}</span>
          </div>
          <div class="browser-shot">
            <img src="${esc(s.image)}" alt="${esc(s.name)} website" loading="lazy" width="800" height="500">
          </div>
        </div>
        <div class="server-body">
          <div class="server-head">
            <h3 class="server-name">${esc(s.name)}</h3>
            <span class="server-status" data-s="${esc(s.status)}">${online ? '<span class="status-dot" aria-hidden="true"></span>' : ""}${esc(statusLabel)}</span>
          </div>
          <p class="server-meta"><span class="chip">${esc(tx(s.type))}</span><span>${esc(tx(s.version))}</span></p>
          <dl class="server-stats">
            <div><dt>${esc(ui("server.since"))}</dt><dd>${since ? esc(since) : "—"}</dd></div>
            <div><dt>${esc(ui("server.players"))}</dt><dd>${players}</dd></div>
          </dl>
          <span class="server-link">${esc(s.url ? ui("server.visit") : (s.cta ? tx(s.cta) : ui("server.soon")))}</span>
        </div>
      </${tag}>
    </li>`;
  }).join("");
}

const fmtDate = (d) => {
  const t = new Date(d + "T00:00:00");
  return isNaN(t) ? d : t.toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
};
const gameById = Object.fromEntries(GAMES.map((g) => [g.id, g]));

function renderNews() {
  $("#news-list").innerHTML = NEWS.map((n) => {
    const g = gameById[n.game];
    const img = g ? g.emblem : "assets/images/favicon.svg";
    const more = n.url ? `<a class="news-link" href="${esc(n.url)}"${linkAttrs(n.url)}>${esc(ui("news.more"))}</a>` : "";
    return `
    <li data-reveal>
      <article class="news-card">
        <figure class="news-thumb">
          <img src="${esc(img)}" width="200" height="200" alt="" loading="lazy">
          <span class="news-chip">${esc(g ? tx(g.title) : "dartfapper")}</span>
        </figure>
        <div class="news-body">
          <time class="news-date" datetime="${esc(n.date)}">${fmtDate(n.date)}</time>
          <h3 class="news-title">${esc(tx(n.title))}</h3>
          <p class="news-text">${esc(tx(n.text))}</p>
          ${more}
        </div>
      </article>
    </li>`;
  }).join("");
}

function renderNative() {
  $("#native-grid").innerHTML = NATIVE_UI.map((n) => `
    <li class="native-item${n.wide ? " is-wide" : ""}" data-reveal>
      <a class="native-shot" href="${esc(n.image)}" target="_blank" rel="noopener" aria-label="${esc(tx(n.name))}: ${esc(ui("native.open"))}">
        <img src="${esc(n.image)}" alt="${esc(tx(n.name))} window in OTTi RO" loading="lazy">
      </a>
      <div class="native-body">
        <h3 class="native-name">${esc(tx(n.name))}</h3>
        <p class="native-text">${esc(tx(n.text))}</p>
      </div>
    </li>`).join("");
  $("#native-more").innerHTML = NATIVE_MORE.map((n) =>
    `<li><strong>${esc(tx(n.name))}</strong><span>${esc(tx(n.text))}</span></li>`).join("");
  if (!NATIVE_UI.length) $("#features").hidden = true;
}

function renderFooterServers() {
  const list = $("[data-footer-servers]");
  $$("li.gen", list).forEach((li) => li.remove());
  SERVERS.filter((s) => s.url).forEach((s) => {
    const li = document.createElement("li");
    li.className = "gen";
    li.innerHTML = `<a href="${esc(s.url)}" class="footer-link" target="_blank" rel="noopener">${esc(s.name)}</a>`;
    list.appendChild(li);
  });
}

function applyStaticText() {
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => { el.textContent = ui(el.dataset.i18n); });
  $$("[data-i18n-html]").forEach((el) => { el.innerHTML = ui(el.dataset.i18nHtml); });
  $$("[data-lang-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.langBtn === lang)));
  $$("[data-account]").forEach((b) => (b.title = ui("cta.logout")));
  const servers = SERVERS.filter((s) => s.kind !== "client");
  $$("[data-stat='servers']").forEach((el) => (el.textContent = servers.length));
  $$("[data-stat='online']").forEach((el) => (el.textContent = servers.filter((s) => s.status === "online").length));
  toggler.setAttribute("aria-label", ui(navbar.classList.contains("active") ? "menu.close" : "menu.open"));
}

function render() {
  applyStaticText();
  renderGames();
  renderServers();
  renderNative();
  renderNews();
  renderFooterServers();
  observeReveal();
}

/* ---------- navbar mobile ---------- */
const navbar = $("[data-navbar]");
const toggler = $("[data-nav-toggler]");
const setNav = (open) => {
  navbar.classList.toggle("active", open);
  toggler.classList.toggle("active", open);
  toggler.setAttribute("aria-expanded", String(open));
  toggler.setAttribute("aria-label", ui(open ? "menu.close" : "menu.open"));
  document.body.classList.toggle("nav-active", open);
};
toggler.addEventListener("click", () => setNav(!navbar.classList.contains("active")));
$$("[data-nav-link]").forEach((l) => l.addEventListener("click", () => setNav(false)));

/* ---------- language buttons ---------- */
$$("[data-lang-btn]").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.langBtn === lang) return;
  lang = b.dataset.langBtn;
  try { localStorage.setItem("lang", lang); } catch {}
  render();
  $$("[data-reveal]").forEach((el) => el.classList.add("revealed"));
}));

/* ---------- reveal on scroll ---------- */
const io = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("revealed"); io.unobserve(e.target); }
    }), { threshold: .12 })
  : null;
function observeReveal() {
  $$("[data-reveal]:not(.revealed)").forEach((el) => (io ? io.observe(el) : el.classList.add("revealed")));
}

/* ---------- first render ---------- */
render();

$$("[data-discord]").forEach((a) => {
  if (window.DISCORD_URL) a.href = window.DISCORD_URL;
  else a.style.display = "none";
});
$$("[data-gig]").forEach((a) => {
  if (window.GIG_URL) a.href = window.GIG_URL;
  else a.style.display = "none";
});
if (!window.GIG_URL) $("#service").hidden = true;
$("[data-year]").textContent = new Date().getFullYear();

/* ---------- account (Discord login via dartfapper-api) ---------- */
const API_URL = window.API_URL || "";
const TOKEN_KEY = "authToken";
const store = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} },
};

function showAccount(user) {
  $$("[data-login]").forEach((a) => (a.hidden = !!user));
  $$("[data-account]").forEach((b) => (b.hidden = !user));
  if (!user) return;
  $("[data-account-name]").textContent = user.displayName;
  if (user.avatarUrl) $("[data-account-avatar]").src = user.avatarUrl;
}

async function initAccount() {
  if (!API_URL) return;
  $$("[data-login]").forEach((a) => (a.href = `${API_URL}/auth/discord`));

  // the API sends the player back here with #auth=<token> (or #auth_error=...)
  const hash = new URLSearchParams(location.hash.slice(1));
  if (hash.has("auth") || hash.has("auth_error")) {
    if (hash.get("auth")) store.set(hash.get("auth"));
    history.replaceState(null, "", location.pathname + location.search);
  }

  const token = store.get();
  if (!token) return showAccount(null);
  try {
    const res = await fetch(`${API_URL}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) store.set(null);
    showAccount(res.ok ? await res.json() : null);
  } catch {
    showAccount(null);
  }
}

$$("[data-account]").forEach((b) => b.addEventListener("click", async () => {
  if (!confirm(ui("account.confirmLogout"))) return;
  const token = store.get();
  store.set(null);
  showAccount(null);
  if (token) fetch(`${API_URL}/api/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}));

initAccount();

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
