-- Weekly XP leagues (Duolingo-style). Membership is lazily recomputed when a
-- new week starts; the leaderboard itself is derived from user_daily_xp.

CREATE TABLE IF NOT EXISTS league_memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  week_start TEXT NOT NULL, -- Monday UTC, YYYY-MM-DD
  PRIMARY KEY (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_league_memberships_tier ON league_memberships (week_start, tier);