const request = require('supertest');
const app = require('../src/app');

describe('Auth Middleware Bug', () => {
  let token;

  beforeAll(async () => {
    await request(app).post('/register').send({ username: 'herin', password: 'pass123' });
  });

  test('login should succeed with correct password', async () => {
    const res = await request(app).post('/login').send({ username: 'herin', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('login should fail with wrong password', async () => {
    const res = await request(app).post('/login').send({ username: 'herin', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('/profile should return user when valid token provided', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('herin');
  });

  test('/profile should reject invalid token', async () => {
    const res = await request(app)
      .get('/profile')
      .set('Authorization', 'Bearer faketoken');
    expect(res.status).toBe(401);
  });
});
