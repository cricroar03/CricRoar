-- ============================================================
--  CRICROAR — Supabase Database Setup
--  Go to: supabase.com → Your Project → SQL Editor
--  Paste this entire file and click RUN
-- ============================================================


-- 1. USERS TABLE
-- Stores each fan's profile, plan, and daily roast count
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'free',   -- 'free' or 'pro'
  roasts_today    INT  NOT NULL DEFAULT 0,
  last_roast_date TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 2. ROASTS TABLE
-- Stores every message sent in every war room
CREATE TABLE IF NOT EXISTS roasts (
  id          BIGSERIAL PRIMARY KEY,
  match_id    TEXT        NOT NULL,
  user_id     TEXT        NOT NULL,
  user_name   TEXT        NOT NULL,
  team        TEXT        NOT NULL,
  text        TEXT        NOT NULL,
  votes       INT         NOT NULL DEFAULT 0,
  reports     INT         NOT NULL DEFAULT 0,
  hidden      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast match-based queries
CREATE INDEX IF NOT EXISTS idx_roasts_match_id ON roasts(match_id);
CREATE INDEX IF NOT EXISTS idx_roasts_hidden   ON roasts(hidden);


-- 3. PREDICTIONS TABLE
-- Stores each user's win prediction vote per match
CREATE TABLE IF NOT EXISTS predictions (
  id          BIGSERIAL PRIMARY KEY,
  match_id    TEXT        NOT NULL,
  user_id     TEXT        NOT NULL,
  team        TEXT        NOT NULL,
  value       INT         NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, user_id)   -- one vote per user per match
);

CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);


-- ============================================================
--  ROW LEVEL SECURITY (RLS)
--  Keeps your data safe — anyone can read, only owner can write
-- ============================================================

ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE roasts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- USERS: anyone can insert/update their own row
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);

-- ROASTS: anyone can read non-hidden roasts, anyone can insert/update votes
CREATE POLICY "roasts_select" ON roasts FOR SELECT USING (hidden = false);
CREATE POLICY "roasts_insert" ON roasts FOR INSERT WITH CHECK (true);
CREATE POLICY "roasts_update" ON roasts FOR UPDATE USING (true);

-- PREDICTIONS: anyone can read and insert
CREATE POLICY "predictions_select" ON predictions FOR SELECT USING (true);
CREATE POLICY "predictions_insert" ON predictions FOR INSERT WITH CHECK (true);


-- ============================================================
--  DONE! Your database is ready.
--  Now go back to Vercel and add your environment variables.
-- ============================================================
