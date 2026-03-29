const express = require('express');
const {
  getGlobalLeaderboard,
  getTeamLeaderboard
} = require('../db');
const { asyncHandler } = require('../lib/http');

const router = express.Router();

router.get('/global', asyncHandler(async (_req, res) => {
  const rows = await getGlobalLeaderboard.all();
  return res.json(rows);
}));

router.get('/teams', asyncHandler(async (_req, res) => {
  const rows = await getTeamLeaderboard.all();
  return res.json(rows);
}));

module.exports = router;
