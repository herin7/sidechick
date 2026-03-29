const databaseUrl = String(process.env.DATABASE_URL || '').trim();
const jwtExpiresIn = String(process.env.JWT_EXPIRES_IN || '30d').trim();
const jwtSecret = String(process.env.JWT_SECRET || 'sidechick-dev-secret').trim();
const port = Number(process.env.PORT || 3000);

module.exports = {
  databaseUrl,
  jwtExpiresIn,
  jwtSecret,
  port
};
