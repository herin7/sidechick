const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Auth API', () => {
  it('should register a user successfully', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ username: 'testuser', password: 'mypassword' });
    
    expect(res.status).toBe(201);
    
    const user = await User.findOne({ username: 'testuser' });
    expect(user).toBeTruthy();
  });

  it('should login an existing user', async () => {
    await request(app)
      .post('/auth/register')
      .send({ username: 'logintest', password: 'mypassword123' });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'logintest', password: 'mypassword123' });
    
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    
    // We expect the token to be properly signed and parseable
    expect(res.body.token.split('.').length).toBe(3);
  });
});
