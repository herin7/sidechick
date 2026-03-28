function getActiveSessions(sessions, now) {
  return sessions.filter((session) => session.expiresAt <= now);
}

module.exports = { getActiveSessions };
