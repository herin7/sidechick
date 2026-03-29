const express = require('express');
const { getRandomActiveProblemByType } = require('../db');
const { ApiError, asyncHandler } = require('../lib/http');

const router = express.Router();

router.get('/:type/random', asyncHandler(async (req, res) => {
  const type = String(req.params.type || '').trim().toLowerCase();

  if (!['lc', 'cf', 'mern'].includes(type)) {
    throw new ApiError(400, 'invalid_problem_type');
  }

  const problem = await getRandomActiveProblemByType.get(type);
  if (!problem) {
    throw new ApiError(404, 'problem_not_found');
  }

  return res.json({ problem });
}));

module.exports = router;
