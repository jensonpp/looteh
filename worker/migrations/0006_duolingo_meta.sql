-- Duolingo meta-game: gems currency, daily quests, achievements, daily XP ledger.

ALTER TABLE user_stats ADD COLUMN gems INTEGER NOT NULL DEFAULT 50;
ALTER TABLE user_stats ADD COLUMN streak_freezes INTEGER NOT NULL DEFAULT 0;

-- One row per user per quest per day. Progress is bumped by gameplay hooks.
CREATE TABLE user_quests (
  user_id TEXT NOT NULL REFERENCES users(id),
  quest_key TEXT NOT NULL,
  quest_date TEXT NOT NULL, -- YYYY-MM-DD, server UTC date
  progress INTEGER NOT NULL DEFAULT 0,
  gems_claimed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, quest_key, quest_date)
);
CREATE INDEX idx_user_quests_user_date ON user_quests(user_id, quest_date);

-- One row per user per achievement, once earned.
CREATE TABLE user_achievements (
  user_id TEXT NOT NULL REFERENCES users(id),
  achievement_key TEXT NOT NULL,
  earned_at TEXT NOT NULL,
  PRIMARY KEY (user_id, achievement_key)
);

-- Daily XP ledger (per user per UTC day) — powers weekly leagues.
CREATE TABLE user_daily_xp (
  user_id TEXT NOT NULL REFERENCES users(id),
  xp_date TEXT NOT NULL, -- YYYY-MM-DD
  xp INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, xp_date)
);