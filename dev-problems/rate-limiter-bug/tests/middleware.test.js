const request = require('supertest');

// Fresh app per describe to reset module state
function makeApp() {
  jest.resetModules();
  return require('../src/app');
}

describe('Rate Limiter Bug', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
  });

  test('first 3 requests should succeed', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/ping');
      expect(res.status).toBe(200);
    }
  });

  test('4th request should be rate limited (429)', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).get('/ping');
    }
    const res = await request(app).get('/ping');
    expect(res.status).toBe(429);
  });

  test('after window expires, requests should succeed again', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).get('/ping');
    }

    // Hit the limit
    const blocked = await request(app).get('/ping');
    expect(blocked.status).toBe(429);

    // Wait for window to reset
    await new Promise(r => setTimeout(r, 5500));

    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
  });

  test('logger should not cause double-next errors', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body.pong).toBe(true);
  });
});
