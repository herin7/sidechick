const Database = require('better-sqlite3');
const { dbPath } = require('./config');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handle TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('lc', 'cf', 'mern')),
    problem_id TEXT NOT NULL,
    status TEXT NOT NULL,
    time_secs INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_challenges_user_problem
    ON challenges(user_id, type, problem_id);

  CREATE INDEX IF NOT EXISTS idx_challenges_user_status_created
    ON challenges(user_id, status, created_at);

  CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('dev')),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    difficulty TEXT NOT NULL DEFAULT 'medium',
    archive_path TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_problems_type_active_created
    ON problems(type, is_active, created_at DESC);
`);

const upsertUserByHandle = db.prepare(`
  INSERT INTO users (handle)
  VALUES (?)
  ON CONFLICT(handle) DO UPDATE SET handle = excluded.handle
  RETURNING id, handle, created_at
`);

const upsertChallenge = db.prepare(`
  INSERT INTO challenges (user_id, type, problem_id, status, time_secs)
  VALUES (@user_id, @type, @problem_id, @status, @time_secs)
  ON CONFLICT(user_id, type, problem_id) DO UPDATE SET
    status = excluded.status,
    time_secs = excluded.time_secs,
    created_at = CURRENT_TIMESTAMP
  RETURNING id, user_id, type, problem_id, status, time_secs, created_at
`);

const getSolvedDates = db.prepare(`
  SELECT DISTINCT date(created_at) AS solved_date
  FROM challenges
  WHERE user_id = ? AND lower(status) IN ('accepted', 'passed')
  ORDER BY solved_date DESC
`);

const getTotalSolved = db.prepare(`
  SELECT COUNT(*) AS total
  FROM challenges
  WHERE user_id = ? AND lower(status) IN ('accepted', 'passed')
`);

const getUserById = db.prepare(`
  SELECT id, handle, created_at
  FROM users
  WHERE id = ?
`);

const upsertProblemBySlug = db.prepare(`
  INSERT INTO problems (type, slug, title, description, difficulty, archive_path, is_active)
  VALUES (@type, @slug, @title, @description, @difficulty, @archive_path, @is_active)
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    difficulty = excluded.difficulty,
    archive_path = excluded.archive_path,
    is_active = excluded.is_active,
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, type, slug, title, description, difficulty, archive_path, is_active, created_at, updated_at
`);

const getProblemBySlug = db.prepare(`
  SELECT id, type, slug, title, description, difficulty, archive_path, is_active, created_at, updated_at
  FROM problems
  WHERE slug = ?
`);

const getProblemById = db.prepare(`
  SELECT id, type, slug, title, description, difficulty, archive_path, is_active, created_at, updated_at
  FROM problems
  WHERE id = ?
`);

const getRandomActiveProblemByType = db.prepare(`
  SELECT id, type, slug, title, description, difficulty, archive_path, is_active, created_at, updated_at
  FROM problems
  WHERE type = ? AND is_active = 1
  ORDER BY RANDOM()
  LIMIT 1
`);

const listActiveProblemsByType = db.prepare(`
  SELECT id, type, slug, title, description, difficulty, archive_path, is_active, created_at, updated_at
  FROM problems
  WHERE type = ? AND is_active = 1
  ORDER BY updated_at DESC, created_at DESC
`);

module.exports = {
  db,
  upsertUserByHandle,
  upsertChallenge,
  getSolvedDates,
  getTotalSolved,
  getUserById,
  upsertProblemBySlug,
  getProblemBySlug,
  getProblemById,
  getRandomActiveProblemByType,
  listActiveProblemsByType
};
