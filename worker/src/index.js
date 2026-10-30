// dartfapper API: Discord login + sessions for Mythrix and the website.
//
//   GET  /auth/discord           -> redirect to Discord
//   GET  /auth/discord/callback  -> back from Discord, redirect to SITE_URL/#auth=<token>
//   GET  /api/me                 -> current user (Authorization: Bearer <token>)
//   POST /api/logout             -> end the current session
//   POST /api/contact            -> store a contact request (and ping Discord if DISCORD_WEBHOOK_URL is set)

const SESSION_DAYS = 30;
const STATE_COOKIE = "oauth_state";
const CONTACTS_PER_HOUR = 5;
const CONTACT_SERVICES = ["server", "moro", "kafra", "custom", "other"];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === "/auth/discord" && request.method === "GET") return startLogin(url, env);
      if (url.pathname === "/auth/discord/callback" && request.method === "GET") return finishLogin(request, url, env);
      if (url.pathname === "/api/me" && request.method === "GET") return withCors(await me(request, env), cors);
      if (url.pathname === "/api/logout" && request.method === "POST") return withCors(await logout(request, env), cors);
      if (url.pathname === "/api/contact" && request.method === "POST") return withCors(await contact(request, env, ctx), cors);
      return withCors(json({ error: "not_found" }, 404), cors);
    } catch (err) {
      console.error(JSON.stringify({ msg: "unhandled", path: url.pathname, error: String(err?.stack || err) }));
      return withCors(json({ error: "server_error" }, 500), cors);
    }
  },
};

/* ---------- Discord OAuth ---------- */

function startLogin(url, env) {
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) return json({ error: "discord_not_configured" }, 503);
  const state = randomToken(16);
  const auth = new URL("https://discord.com/oauth2/authorize");
  auth.search = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/discord/callback`,
    response_type: "code",
    scope: "identify",
    state,
    prompt: "none",
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: auth.toString(),
      "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/auth; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

async function finishLogin(request, url, env) {
  const back = (frag) => new Response(null, {
    status: 302,
    headers: {
      Location: `${env.SITE_URL}/#${frag}`,
      "Set-Cookie": `${STATE_COOKIE}=; Path=/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    },
  });

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = getCookie(request, STATE_COOKIE);
  if (!code || !state || !cookieState || !(await safeEqual(state, cookieState))) return back("auth_error=state");

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET.trim(),
      grant_type: "authorization_code",
      code,
      redirect_uri: `${url.origin}/auth/discord/callback`,
    }),
  });
  if (!tokenRes.ok) {
    const detail = (await tokenRes.text()).slice(0, 300);
    console.error(JSON.stringify({ msg: "discord_token_failed", status: tokenRes.status, detail }));
    return back("auth_error=discord");
  }
  const { access_token } = await tokenRes.json();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!userRes.ok) return back("auth_error=discord");
  const du = await userRes.json();

  const now = Date.now();
  const user = await env.DB.prepare(
    `INSERT INTO users (discord_id, username, display_name, avatar, created_at, last_login_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?5)
     ON CONFLICT(discord_id) DO UPDATE SET
       username = excluded.username, display_name = excluded.display_name,
       avatar = excluded.avatar, last_login_at = excluded.last_login_at
     RETURNING id`
  ).bind(du.id, du.username, du.global_name ?? null, du.avatar ?? null, now).first();

  const token = randomToken(32);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1 AND expires_at < ?2").bind(user.id, now),
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)")
      .bind(await sha256(token), user.id, now, now + SESSION_DAYS * 864e5),
  ]);

  console.log(JSON.stringify({ msg: "login", user_id: user.id }));
  return back(`auth=${token}`);
}

/* ---------- API ---------- */

async function me(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: "unauthorized" }, 401);
  return json({
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    avatarUrl: user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`
      : null,
  });
}

async function logout(request, env) {
  const token = bearer(request);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(await sha256(token)).run();
  return json({ ok: true });
}

async function contact(request, env, ctx) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }

  // bots fill the hidden "website" field; pretend it worked
  if (body.website) return json({ ok: true });

  const field = (k, max) => String(body[k] ?? "").trim().slice(0, max);
  const q = {
    service: field("service", 20),
    name: field("name", 80),
    email: field("email", 120),
    discord: field("discord", 60),
    server: field("server", 120),
    packetver: field("packetver", 40),
    budget: field("budget", 40),
    message: field("message", 2000),
    source: field("source", 200),
  };
  if (!CONTACT_SERVICES.includes(q.service)) return json({ error: "invalid", field: "service" }, 400);
  if (!q.name) return json({ error: "invalid", field: "name" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email)) return json({ error: "invalid", field: "email" }, 400);
  if (q.message.length < 10) return json({ error: "invalid", field: "message" }, 400);

  const now = Date.now();
  const ipHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM contacts WHERE ip_hash = ?1 AND created_at > ?2")
    .bind(ipHash, now - 36e5).first();
  if (recent.n >= CONTACTS_PER_HOUR) return json({ error: "rate_limited" }, 429);

  const row = await env.DB.prepare(
    `INSERT INTO contacts (service, name, email, discord, server, packetver, budget, message, source, ip_hash, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11) RETURNING id`
  ).bind(q.service, q.name, q.email, q.discord || null, q.server || null, q.packetver || null,
    q.budget || null, q.message, q.source || null, ipHash, now).first();

  console.log(JSON.stringify({ msg: "contact", id: row.id, service: q.service }));
  if (env.DISCORD_WEBHOOK_URL) ctx.waitUntil(notifyContact(env.DISCORD_WEBHOOK_URL, row.id, q));
  return json({ ok: true, id: row.id });
}

async function notifyContact(webhook, id, q) {
  const lines = [
    `**New contact #${id}** · ${q.service}`,
    `**${q.name}** · ${q.email}${q.discord ? ` · Discord: ${q.discord}` : ""}`,
    [q.server && `Server: ${q.server}`, q.packetver && `Packet: ${q.packetver}`, q.budget && `Budget: ${q.budget}`].filter(Boolean).join(" · "),
    q.message,
  ].filter(Boolean);
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: lines.join("\n").slice(0, 1900), allowed_mentions: { parse: [] } }),
  });
  if (!res.ok) console.error(JSON.stringify({ msg: "contact_webhook_failed", id, status: res.status }));
}

async function currentUser(request, env) {
  const token = bearer(request);
  if (!token) return null;
  return env.DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?1 AND s.expires_at > ?2`
  ).bind(await sha256(token), Date.now()).first();
}

/* ---------- helpers ---------- */

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function withCors(res, cors) {
  for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
  return res;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const bearer = (request) => (request.headers.get("Authorization") || "").match(/^Bearer ([A-Za-z0-9_-]{20,})$/)?.[1] || null;

function getCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? m[1] : null;
}

function randomToken(bytes) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// compare via hashes so length and content differences take constant time
async function safeEqual(a, b) {
  const [ha, hb] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))));
  return crypto.subtle.timingSafeEqual(ha, hb);
}
