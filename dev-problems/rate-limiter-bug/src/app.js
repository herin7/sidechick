const express = require('express');
const { rateLimiter, requestLogger } = require('./middleware');

const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter(5000, 3));

app.get('/ping', (req, res) => {
  res.json({ pong: true });
});

module.exports = app;
