const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
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
} = require('./db');
const { adminToken, port, uploadsRoot } = require('./config');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

app.use(express.json());
fs.mkdirSync(uploadsRoot, { recursive: true });

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function normalizeDifficulty(value) {
  const difficulty = String(value || 'medium').trim().toLowerCase();
  return ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function serializeProblem(problem, req) {
  if (!problem) {
    return null;
  }

  const origin = `${req.protocol}://${req.get('host')}`;
  return {
    id: problem.id,
    type: problem.type,
    slug: problem.slug,
    title: problem.title,
    description: problem.description,
    difficulty: problem.difficulty,
    isActive: Boolean(problem.is_active),
    createdAt: problem.created_at,
    updatedAt: problem.updated_at,
    downloadUrl: `${origin}/api/problems/dev/${problem.id}/download`
  };
}

function requireAdmin(req, res, next) {
  if (!adminToken) {
    return res.status(503).json({
      error: 'ADMIN_TOKEN is not configured on the server'
    });
  }

  const authHeader = String(req.get('authorization') || '');
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const providedToken = bearerToken || String(req.get('x-admin-token') || '').trim();

  if (providedToken !== adminToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  return next();
}

function calculateStreak(rows) {
  const dates = rows.map((row) => row.solved_date);
  if (dates.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let index = 0;
  let streak = 0;

  while (index < dates.length) {
    const expected = new Date(today);
    expected.setUTCDate(today.getUTCDate() - index);
    const expectedDate = expected.toISOString().slice(0, 10);

    if (dates[index] !== expectedDate) {
      if (index === 0) {
        const yesterday = new Date(today);
        yesterday.setUTCDate(today.getUTCDate() - 1);
        if (dates[index] !== yesterday.toISOString().slice(0, 10)) {
          return 0;
        }
      } else {
        break;
      }
    }

    streak += 1;
    index += 1;
  }

  return streak;
}

app.get('/api/health', (_req, res) => {
  return res.json({ ok: true });
});

app.post('/api/user/score', (req, res) => {
  const { handle, type, problemId, status, timeSecs } = req.body || {};

  if (!handle || !type || !problemId || !status) {
    return res.status(400).json({
      error: 'handle, type, problemId, and status are required'
    });
  }

  if (!['lc', 'cf', 'mern'].includes(type)) {
    return res.status(400).json({ error: 'invalid challenge type' });
  }

  const user = upsertUserByHandle.get(String(handle).trim());
  const challenge = upsertChallenge.get({
    user_id: user.id,
    type,
    problem_id: String(problemId),
    status: normalizeStatus(status),
    time_secs: Math.max(0, Number(timeSecs || 0))
  });

  return res.json({
    ok: true,
    userId: user.id,
    challenge
  });
});

app.get('/api/user/:id/stats', (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'invalid user id' });
  }

  const user = getUserById.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  const solvedDates = getSolvedDates.all(userId);
  const totalSolved = getTotalSolved.get(userId).total;

  return res.json({
    user,
    streak: calculateStreak(solvedDates),
    totalSolved
  });
});

app.get('/api/problems/dev', (req, res) => {
  const problems = listActiveProblemsByType
    .all('dev')
    .map((problem) => serializeProblem(problem, req));

  return res.json({ problems });
});

app.get('/api/problems/dev/random', (req, res) => {
  const problem = getRandomActiveProblemByType.get('dev');
  if (!problem) {
    return res.status(404).json({ error: 'no active dev problems found' });
  }

  return res.json({ problem: serializeProblem(problem, req) });
});

app.get('/api/problems/dev/:id/download', (req, res) => {
  const problemId = Number(req.params.id);
  if (!Number.isInteger(problemId) || problemId <= 0) {
    return res.status(400).json({ error: 'invalid problem id' });
  }

  const problem = getProblemById.get(problemId);
  if (!problem || !problem.is_active) {
    return res.status(404).json({ error: 'problem not found' });
  }

  if (!fs.existsSync(problem.archive_path)) {
    return res.status(404).json({ error: 'problem archive missing on server' });
  }

  return res.download(problem.archive_path, `${problem.slug}.zip`);
});

app.post('/api/admin/problems', requireAdmin, upload.single('archive'), (req, res) => {
  const title = String(req.body?.title || '').trim();
  const slug = normalizeSlug(req.body?.slug || title);
  const description = String(req.body?.description || '').trim();
  const difficulty = normalizeDifficulty(req.body?.difficulty);
  const isActive = String(req.body?.isActive ?? 'true').trim().toLowerCase() !== 'false';
  const archive = req.file;

  if (!title || !slug) {
    return res.status(400).json({ error: 'title and slug are required' });
  }

  if (!archive) {
    return res.status(400).json({ error: 'archive zip is required' });
  }

  if (path.extname(archive.originalname).toLowerCase() !== '.zip') {
    return res.status(400).json({ error: 'archive must be a .zip file' });
  }

  const existing = getProblemBySlug.get(slug);
  const archiveName = `${slug}-${Date.now()}.zip`;
  const archivePath = path.join(uploadsRoot, archiveName);

  fs.writeFileSync(archivePath, archive.buffer);

  const problem = upsertProblemBySlug.get({
    type: 'dev',
    slug,
    title,
    description,
    difficulty,
    archive_path: archivePath,
    is_active: isActive ? 1 : 0
  });

  if (
    existing?.archive_path &&
    existing.archive_path !== archivePath &&
    fs.existsSync(existing.archive_path)
  ) {
    fs.unlinkSync(existing.archive_path);
  }

  return res.status(existing ? 200 : 201).json({
    ok: true,
    problem: serializeProblem(problem, req)
  });
});

app.listen(port, () => {
  console.log(`Sidechick backend listening on http://127.0.0.1:${port}`);
});
