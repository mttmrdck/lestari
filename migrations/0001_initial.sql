-- LESTARI accounts, sessions, XP ledger and progress snapshots.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  pass_iter INTEGER NOT NULL,
  recovery_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);

-- The ledger is the only source of leaderboard XP. Amounts are computed on the server.
CREATE TABLE xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  day TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX xp_events_day ON xp_events(day, user_id);
CREATE INDEX xp_events_user_day ON xp_events(user_id, day);

-- Cross-device copy of the learner's local state. Never used for ranking.
CREATE TABLE progress (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
