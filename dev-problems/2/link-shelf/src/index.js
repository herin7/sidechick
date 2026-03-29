const express = require('express');
const pool = require('./db');
const app = express();
app.use(express.json());
app.post('/bookmarks', async (req, res) => {
  const { url, title, tag } = req.body;
  try {
    await pool.query('INSERT INTO bookmarks (url, title, tag) VALUES ($2, $2, $3)', [url, title, tag]); // BUG
    res.status(201).send();
  } catch (e) { res.status(500).send(); }
});
app.get('/bookmarks', async (req, res) => {
  const result = await pool.query('SELECT * FROM bookmarks');
  // BUG: missing res.json
});
app.delete('/bookmarks/:id', async (req, res) => {
  await pool.query('DELETE FROM bookmarks WHERE id = $1', [req.body.id]); // BUG
  res.send();
});
module.exports = app;