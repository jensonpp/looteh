-- v1 schema. Hearts/badges tables are deferred to v2 — do not add them here.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

CREATE TABLE units (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  unlock_requires_unit_id TEXT REFERENCES units(id)
);

CREATE TABLE lessons (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES units(id),
  title TEXT NOT NULL,
  concept_markdown TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE INDEX idx_lessons_unit_id ON lessons(unit_id);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id),
  prompt TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);
CREATE INDEX idx_questions_lesson_id ON questions(lesson_id);

CREATE TABLE answer_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id),
  label TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0, -- never sent to the client
  sort_order INTEGER NOT NULL
);
CREATE INDEX idx_answer_options_question_id ON answer_options(question_id);

CREATE TABLE user_lesson_progress (
  user_id TEXT NOT NULL REFERENCES users(id),
  lesson_id TEXT NOT NULL REFERENCES lessons(id),
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started | in_progress | completed
  best_score INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  xp_total INTEGER NOT NULL DEFAULT 0,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT, -- YYYY-MM-DD, server UTC date
  email_reminders_enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_type ON events(event_type);
