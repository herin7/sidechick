const express = require('express');
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/notes', noteRoutes);

module.exports = app;
