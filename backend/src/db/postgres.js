const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');
const { databaseUrl } = require('../config');

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set for the PostgreSQL backend');
}

// pg returns BIGINT columns as strings by default. SideChick currently
// treats ids and counts as numbers throughout the server code.
types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

const pool = new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.PG_POOL_MAX || 10),
  connectTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
  ssl: process.env.PGSSL === 'disable'
    ? false
    : { rejectUnauthorized: false }
});

const MAX_QUERY_RETRIES = Math.max(0, Number(process.env.PG_QUERY_RETRIES || 4));
const BASE_RETRY_DELAY_MS = Math.max(100, Number(process.env.PG_QUERY_RETRY_DELAY_MS || 500));
const RETRYABLE_ERROR_CODES = new Set([
  '53300',
  '57P01',
  '57P02',
  '57P03',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT'
]);

pool.on('error', (error) => {
  console.error('[SideChick][postgres] unexpected pool error:', error);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryablePgError(error) {
  if (!error) {
    return false;
  }

  const message = String(error.message || '').toLowerCase();
  return RETRYABLE_ERROR_CODES.has(String(error.code || '')) ||
    message.includes('connection terminated unexpectedly') ||
    message.includes('server closed the connection unexpectedly') ||
    message.includes('timeout expired') ||
    message.includes('terminating connection due to administrator command') ||
    message.includes('the database system is starting up');
}

async function runWithRetry(operation) {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= MAX_QUERY_RETRIES || !isRetryablePgError(error)) {
        throw error;
      }

      const delayMs = BASE_RETRY_DELAY_MS * (attempt + 1);
      console.warn(
        `[SideChick][postgres] transient query failure (${error.code || 'unknown'}), retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
      attempt += 1;
    }
  }
}

async function query(text, values = []) {
  return runWithRetry(() => pool.query(text, values));
}

function statement({ getQuery, allQuery }) {
  return {
    async get(params) {
      const rows = await getQuery(params);
      return rows[0];
    },
    async all(params) {
      return allQuery(params);
    }
  };
}

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await query(sql);
}

async function initializeSchema() {
  const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
  await runSqlFile(schemaPath);
}

const upsertTeamByName = statement({
  getQuery: async (name) => {
    const result = await query(
      `
        INSERT INTO teams (name)
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE
        SET name = EXCLUDED.name
        RETURNING id, name, created_at
      `,
      [String(name).trim()]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const upsertUserByGithubId = statement({
  getQuery: async ({ id, handle, team_id = null }) => {
    const result = await query(
      `
        INSERT INTO users (id, handle, team_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE
        SET
          handle = EXCLUDED.handle,
          team_id = EXCLUDED.team_id
        RETURNING id, handle, team_id, created_at
      `,
      [Number(id), String(handle).trim(), team_id]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const upsertUserByHandle = statement({
  getQuery: async (handle) => {
    const result = await query(
      `
        INSERT INTO users (handle)
        VALUES ($1)
        ON CONFLICT (handle) DO UPDATE
        SET handle = EXCLUDED.handle
        RETURNING id, handle, team_id, created_at
      `,
      [String(handle).trim()]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const setUserTeam = statement({
  getQuery: async ({ user_id, team_id }) => {
    const result = await query(
      `
        UPDATE users
        SET team_id = $1
        WHERE id = $2
        RETURNING id, handle, team_id, created_at
      `,
      [team_id, user_id]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const upsertChallenge = statement({
  getQuery: async ({ user_id, type, problem_id, status, time_secs }) => {
    const result = await query(
      `
        INSERT INTO challenges (user_id, type, problem_id, status, time_secs)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, type, problem_id) DO UPDATE
        SET
          status = EXCLUDED.status,
          time_secs = EXCLUDED.time_secs,
          created_at = CURRENT_TIMESTAMP
        RETURNING id, user_id, type, problem_id, status, time_secs, created_at
      `,
      [user_id, type, problem_id, status, time_secs]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const getSolvedDates = statement({
  getQuery: async () => [],
  allQuery: async (userId) => {
    const result = await query(
      `
        SELECT DISTINCT CAST(created_at AT TIME ZONE 'UTC' AS DATE)::text AS solved_date
        FROM challenges
        WHERE user_id = $1 AND lower(status) IN ('accepted', 'passed')
        ORDER BY solved_date DESC
      `,
      [userId]
    );

    return result.rows;
  }
});

const getTotalSolved = statement({
  getQuery: async (userId) => {
    const result = await query(
      `
        SELECT COUNT(*)::int AS total
        FROM challenges
        WHERE user_id = $1 AND lower(status) IN ('accepted', 'passed')
      `,
      [userId]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const getUserById = statement({
  getQuery: async (userId) => {
    const result = await query(
      `
        SELECT users.id, users.handle, users.team_id, teams.name AS team_name, users.created_at
        FROM users
        LEFT JOIN teams ON teams.id = users.team_id
        WHERE users.id = $1
      `,
      [userId]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const upsertProblemBySlug = statement({
  getQuery: async ({
    type,
    slug,
    title,
    description,
    difficulty,
    archive_path,
    is_active,
    metadata = {}
  }) => {
    const result = await query(
      `
        INSERT INTO problems (
          type,
          slug,
          title,
          description,
          difficulty,
          archive_path,
          is_active,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        ON CONFLICT (slug) DO UPDATE
        SET
          type = EXCLUDED.type,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          difficulty = EXCLUDED.difficulty,
          archive_path = EXCLUDED.archive_path,
          is_active = EXCLUDED.is_active,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP
        RETURNING
          id,
          type,
          slug,
          title,
          description,
          difficulty,
          archive_path,
          is_active,
          metadata,
          created_at,
          updated_at
      `,
      [
        type,
        slug,
        title,
        description,
        difficulty,
        archive_path,
        Boolean(is_active),
        JSON.stringify(metadata)
      ]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const getProblemBySlug = statement({
  getQuery: async (slug) => {
    const result = await query(
      `
        SELECT
          id,
          type,
          slug,
          title,
          description,
          difficulty,
          archive_path,
          is_active,
          metadata,
          created_at,
          updated_at
        FROM problems
        WHERE slug = $1
      `,
      [slug]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const getProblemById = statement({
  getQuery: async (problemId) => {
    const result = await query(
      `
        SELECT
          id,
          type,
          slug,
          title,
          description,
          difficulty,
          archive_path,
          is_active,
          metadata,
          created_at,
          updated_at
        FROM problems
        WHERE id = $1
      `,
      [problemId]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const getRandomActiveProblemByType = statement({
  getQuery: async (type) => {
    const result = await query(
      `
        SELECT
          id,
          type,
          slug,
  
        title,
          description,
          difficulty,
          archive_path,
          is_active,
          metadata,
          created_at,
          updated_at
        FROM problems
        WHERE type = $1 AND is_active = true
        ORDER BY RANDOM()
        LIMIT 1
      `,
      [type]
    );

    return result.rows;
  },
  allQuery: async () => []
});

const listActiveProblemsByType = statement({
  getQuery: async () => [],
  allQuery: async (type) => {
    const result = await query(
      `
        SELECT
          id,
          type,
          slug,
          title,
          description,
          difficulty,
          archive_path,
          is_active,
          metadata,
          created_at,
          updated_at
        FROM problems
        WHERE type = $1 AND is_active = true
        ORDER BY updated_at DESC, created_at DESC
      `,
      [type]
    );

    return result.rows;
  }
});

const getGlobalLeaderboard = statement({
  getQuery: async () => [],
  allQuery: async () => {
    const result = await query(`
      WITH solved_dates AS (
        SELECT
          user_id,
          CAST(created_at AT TIME ZONE 'UTC' AS DATE) AS solved_date
        FROM challenges
        WHERE lower(status) IN ('accepted', 'passed')
        GROUP BY user_id, CAST(created_at AT TIME ZONE 'UTC' AS DATE)
      ),
      streak_groups AS (
        SELECT
          user_id,
          solved_date,
          solved_date - (ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY solved_date DESC
          )::int * INTERVAL '1 day') AS streak_anchor
        FROM solved_dates
      ),
      streak_counts AS (
        SELECT
          user_id,
          MAX(streak_length)::int AS streak
        FROM (
          SELECT
            user_id,
            streak_anchor,
            COUNT(*) AS streak_length,
            MAX(solved_date) AS latest_solved_date
          FROM streak_groups
          GROUP BY user_id, streak_anchor
          HAVING MAX(solved_date) >= CURRENT_DATE - INTERVAL '1 day'
        ) grouped_streaks
        GROUP BY user_id
      ),
      user_stats AS (
        SELECT
          users.id,
          users.handle,
          COALESCE(streak_counts.streak, 0) AS streak,
          COUNT(challenges.id) FILTER (
            WHERE lower(challenges.status) IN ('accepted', 'passed')
          )::int AS total_solved
        FROM users
        LEFT JOIN challenges ON challenges.user_id = users.id
        LEFT JOIN streak_counts ON streak_counts.user_id = users.id
        GROUP BY users.id, users.handle, streak_counts.streak
      )
      SELECT handle, streak, total_solved
      FROM user_stats
      ORDER BY streak DESC, total_solved DESC, handle ASC
      LIMIT 50
    `);

    return result.rows;
  }
});

const getTeamLeaderboard = statement({
  getQuery: async () => [],
  allQuery: async () => {
    const result = await query(`
      WITH solved_dates AS (
        SELECT
          user_id,
          CAST(created_at AT TIME ZONE 'UTC' AS DATE) AS solved_date
        FROM challenges
        WHERE lower(status) IN ('accepted', 'passed')
        GROUP BY user_id, CAST(created_at AT TIME ZONE 'UTC' AS DATE)
      ),
      streak_groups AS (
        SELECT
          user_id,
          solved_date,
          solved_date - (ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY solved_date DESC
          )::int * INTERVAL '1 day') AS streak_anchor
        FROM solved_dates
      ),
      streak_counts AS (
        SELECT
          user_id,
          MAX(streak_length)::int AS streak
        FROM (
          SELECT
            user_id,
            streak_anchor,
            COUNT(*) AS streak_length,
            MAX(solved_date) AS latest_solved_date
          FROM streak_groups
          GROUP BY user_id, streak_anchor
          HAVING MAX(solved_date) >= CURRENT_DATE - INTERVAL '1 day'
        ) grouped_streaks
        GROUP BY user_id
      ),
      user_stats AS (
        SELECT
          users.id,
          users.team_id,
          COALESCE(streak_counts.streak, 0) AS streak,
          COUNT(challenges.id) FILTER (
            WHERE lower(challenges.status) IN ('accepted', 'passed')
          )::int AS total_solved
        FROM users
        LEFT JOIN challenges ON challenges.user_id = users.id
        LEFT JOIN streak_counts ON streak_counts.user_id = users.id
        GROUP BY users.id, users.team_id, streak_counts.streak
      )
      SELECT
        teams.id AS team_id,
        teams.name,
        COALESCE(SUM(user_stats.total_solved), 0)::int AS total_team_solves,
        ROUND(COALESCE(AVG(user_stats.streak), 0)::numeric, 1)::float8 AS avg_streak
      FROM teams
      LEFT JOIN user_stats ON user_stats.team_id = teams.id
      GROUP BY teams.id, teams.name
      ORDER BY total_team_solves DESC, teams.name ASC
      LIMIT 20
    `);

    return result.rows;
  }
});

module.exports = {
  db: query,
  pool,
  query,
  initializeSchema,
  runSqlFile,
  getGlobalLeaderboard,
  getProblemById,
  getProblemBySlug,
  getRandomActiveProblemByType,
  getSolvedDates,
  getTeamLeaderboard,
  getTotalSolved,
  getUserById,
  listActiveProblemsByType,
  setUserTeam,
  upsertChallenge,
  upsertProblemBySlug,
  upsertTeamByName,
  upsertUserByGithubId,
  upsertUserByHandle
};
