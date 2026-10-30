CREATE TABLE IF NOT EXISTS kafra_admin_sessions (
  token_hash TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  verifier_version TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS kafra_admin_expiry ON kafra_admin_sessions(expires_at);
CREATE TABLE IF NOT EXISTS kafra_admin_attempts (
  bucket_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS kafra_admin_attempt_expiry ON kafra_admin_attempts(expires_at);
-- One row per customer server. Products are opt-in: nothing is visible to its owners until enabled.
-- gate_key is AES-GCM sealed with KAFRA_DATA_KEY (AAD = server id); moro_key_hash is SHA-256 of the MoRo ingest key.
CREATE TABLE IF NOT EXISTS kafra_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kafra INTEGER NOT NULL DEFAULT 0,
  gate_url TEXT,
  gate_key TEXT,
  moro INTEGER NOT NULL DEFAULT 0,
  moro_plan TEXT,
  moro_expires INTEGER,
  moro_key_hash TEXT UNIQUE,
  created_at INTEGER NOT NULL
);
-- Server Owner accounts sit below the env-configured Super Admin; read-only access to one server.
CREATE TABLE IF NOT EXISTS kafra_owners (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  server_id TEXT NOT NULL REFERENCES kafra_servers(id),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS kafra_owner_server ON kafra_owners(server_id);
-- Mobile RO: APK builds published by the Super Admin, plus app-reported heartbeats and crashes.
CREATE TABLE IF NOT EXISTS moro_builds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL REFERENCES kafra_servers(id),
  version TEXT NOT NULL,
  url TEXT NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS moro_builds_server ON moro_builds(server_id, created_at);
CREATE TABLE IF NOT EXISTS moro_devices (
  server_id TEXT NOT NULL REFERENCES kafra_servers(id),
  device_hash TEXT NOT NULL,
  app_version TEXT NOT NULL,
  os TEXT NOT NULL,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY (server_id, device_hash)
);
CREATE INDEX IF NOT EXISTS moro_devices_seen ON moro_devices(server_id, last_seen);
CREATE TABLE IF NOT EXISTS moro_crashes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL REFERENCES kafra_servers(id),
  app_version TEXT NOT NULL,
  os TEXT NOT NULL,
  model TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS moro_crashes_server ON moro_crashes(server_id, id);
-- Google/Discord sign-in. Users link providers themselves from Settings; SSO never creates accounts.
CREATE TABLE IF NOT EXISTS kafra_identities (
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  username TEXT NOT NULL,
  label TEXT,
  linked_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject),
  UNIQUE (provider, username)
);
CREATE TABLE IF NOT EXISTS kafra_oauth_states (
  state_hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  mode TEXT NOT NULL,
  username TEXT,
  session_hash TEXT,
  verifier TEXT,
  expires_at INTEGER NOT NULL
);
-- Members sign up with Google or Discord (no password). They see no server until the Super Admin invites them as an owner.
CREATE TABLE IF NOT EXISTS kafra_members (
  username TEXT PRIMARY KEY,
  name TEXT,
  created_at INTEGER NOT NULL
);
