const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware, checkPassword, generateToken } = require('./auth');

const app = express();
app.use(express.json());

// Fake user store
const users = [];

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash });
  res.json({ ok: true });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const valid = await checkPassword(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });

  const token = generateToken({ username });
  res.json({ token });
});

app.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = app;
