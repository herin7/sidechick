const express = require('express');
const { upsertTeamByName, upsertUserByGithubId } = require('../db');
const { issueSessionToken, normalizeGithubProfile } = require('../lib/auth');
const { asyncHandler } = require('../lib/http');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const profile = normalizeGithubProfile(req.body || {});

  let teamId = profile.teamId;
  if (profile.teamName) {
    const team = await upsertTeamByName.get(profile.teamName);
    teamId = team.id;
  }

  const user = await upsertUserByGithubId.get({
    id: profile.id,
    handle: profile.handle,
    team_id: teamId
  });

  const token = issueSessionToken(user);

  return res.json({
    ok: true,
    token,
    user
  });
}));

module.exports = router;
