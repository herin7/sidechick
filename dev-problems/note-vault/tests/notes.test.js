const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Note = require('../src/models/Note');

let mongoServer;
let token;
let userId;

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
  await Note.deleteMany({});
  
  await request(app).post('/auth/register').send({ username: 'noteuser', password: 'p1' });
  const loginRes = await request(app).post('/auth/login').send({ username: 'noteuser', password: 'p1' });
  token = loginRes.body.token;
  
  if (token && typeof token === 'string' && token.split('.').length === 3) {
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.decode(token);
      userId = decoded.userId;
    } catch(e) {}
  }
});

describe('Notes API', () => {
  it('should create a new note', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'T1', content: 'C1' });
      
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('T1');
  });

  it('should read a note by ID', async () => {
    const createRes = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'T2', content: 'C2' });
      
    const noteId = createRes.body._id;
    
    const res = await request(app)
      .get(`/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('T2');
  });

  it('should delete a note by ID', async () => {
    const createRes = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'T3', content: 'C3' });
      
    const noteId = createRes.body._id;
    
    const delRes = await request(app)
      .delete(`/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect(delRes.status).toBe(200);
    
    const getRes = await request(app)
      .get(`/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect(getRes.status).toBe(404);
  });
});
