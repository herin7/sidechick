const jwt = require('jsonwebtoken');
const { getUserById } = require('../db');
const { jwtExpiresIn, jwtSecret } = require('../config');
const { ApiError } = require('./http');

function issueSessionToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      handle: user.handle
    },
    jwtSecret,
    {
      expiresIn: jwtExpiresIn
    }
  );
}

function extractToken(req) {
  const authorization = String(req.get('authorization') || '');
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  const bodyToken = String(req.body?.token || '').trim();
  if (bodyToken) {
    return bodyToken;
  }

  const headerToken = String(req.get('x-session-token') || '').trim();
  if (headerToken) {
    return headerToken;
  }

  return '';
}

function verifySessionToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    throw new ApiError(401, 'invalid_token');
  }
}

function normalizeGithubProfile(payload) {
  const githubId = Number(payload?.id ?? payload?.githubId ?? payload?.profile?.id);
  const handle = String(
    payload?.handle ??
    payload?.login ??
    payload?.username ??
    payload?.profile?.handle ??
    payload?.profile?.login ??
    payload?.profile?.username ??
    ''
  ).trim();

  if (!Number.isInteger(githubId) || githubId <= 0 || !handle) {
    throw new ApiError(400, 'invalid_github_profile');
  }

  const normalizedTeamId = Number(payload?.teamId ?? payload?.profile?.teamId);
  const teamId = Number.isInteger(normalizedTeamId) && normalizedTeamId > 0
    ? normalizedTeamId
    : null;

  return {
    id: githubId,
    handle,
    teamId,
    teamName: String(payload?.teamName ?? payload?.profile?.teamName ?? '').trim()
  };
}

async function requireAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new ApiError(401, 'missing_token');
    }

    const session = verifySessionToken(token);
    const user = await getUserById.get(Number(session.sub));

    if (!user) {
      throw new ApiError(401, 'invalid_token');
    }

    req.auth = {
      token,
      session,
      user
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  extractToken,
  issueSessionToken,
  normalizeGithubProfile,
  requireAuth,
  verifySessionToken
};
