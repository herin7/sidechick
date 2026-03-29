const express = require('express');
const { getSolvedDates, getTotalSolved, upsertChallenge } = require('../db');
const { requireAuth } = require('../lib/auth');
const { ApiError, asyncHandler } = require('../lib/http');
const { calculateStreak } = require('../lib/stats');

const router = express.Router();

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase();
}

router.post('/score', requireAuth, asyncHandler(async (req, res) => {
  const { type, problemId, status, timeSecs } = req.body || {};

  if (!type || !problemId || !status) {
    throw new ApiError(400, 'invalid_score_payload');
  }

  if (!['lc', 'cf', 'mern'].includes(String(type))) {
    throw new ApiError(400, 'invalid_problem_type');
  }

  const normalizedStatus = normalizeStatus(status);
  if (!['accepted', 'passed', 'failed'].includes(normalizedStatus)) {
    throw new ApiError(400, 'invalid_status');
  }

  const challenge = await upsertChallenge.get({
    user_id: req.auth.user.id,
    type: String(type),
    problem_id: String(problemId),
    status: normalizedStatus,
    time_secs: Math.max(0, Number(timeSecs || 0))
  });

  return res.json({
    ok: true,
    challenge
  });
}));

router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const solvedDates = await getSolvedDates.all(req.auth.user.id);
  const totalSolved = await getTotalSolved.get(req.auth.user.id);

  return res.json({
    user: req.auth.user,
    solved: totalSolved.total,
    streak: calculateStreak(solvedDates)
  });
}));

module.exports = router;
