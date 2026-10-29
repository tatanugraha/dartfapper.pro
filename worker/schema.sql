CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id    TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL,
  display_name  TEXT,
  avatar        TEXT,
  created_at    INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL
);

-- only the SHA-256 of each token is stored, never the token itself
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- contact requests from dartfapper.pro/contact/
CREATE TABLE IF NOT EXISTS contacts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  service    TEXT NOT NULL,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  discord    TEXT,
  server     TEXT,
  packetver  TEXT,
  budget     TEXT,
  message    TEXT NOT NULL,
  source     TEXT,
  ip_hash    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS contacts_ip ON contacts(ip_hash, created_at);
