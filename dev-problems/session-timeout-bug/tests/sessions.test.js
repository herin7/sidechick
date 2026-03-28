const test = require('node:test');
const assert = require('node:assert/strict');
const { getActiveSessions } = require('../src/sessions');

test('returns only sessions that expire in the future', () => {
  const now = 1_710_000_000_000;
  const sessions = [
    { id: 'active', expiresAt: now + 60_000 },
    { id: 'expired', expiresAt: now - 5_000 }
  ];

  assert.deepEqual(getActiveSessions(sessions, now), [
    { id: 'active', expiresAt: now + 60_000 }
  ]);
});

test('keeps multiple active sessions', () => {
  const now = 1_710_000_000_000;
  const sessions = [
    { id: 'a', expiresAt: now + 1 },
    { id: 'b', expiresAt: now + 10_000 }
  ];

  assert.equal(getActiveSessions(sessions, now).length, 2);
});
