const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const leaderboardRoutes = require('./routes/leaderboard');
const problemRoutes = require('./routes/problems');
const userRoutes = require('./routes/user');
const { errorHandler, notFoundHandler } = require('./lib/http');
const { port } = require('./config');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173'
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  return res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/problems', problemRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Sidechick backend listening on http://127.0.0.1:${port}`);
});
