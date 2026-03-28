const path = require('path');

const backendRoot = path.join(__dirname, '..');
const dataRoot = process.env.SIDECHICK_DATA_DIR
  ? path.resolve(process.env.SIDECHICK_DATA_DIR)
  : backendRoot;

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(dataRoot, 'sidechick.db');

const uploadsRoot = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(backendRoot, 'uploads', 'problems');

const adminToken = String(process.env.ADMIN_TOKEN || '').trim();
const port = Number(process.env.PORT || 3001);

module.exports = {
  adminToken,
  dbPath,
  port,
  uploadsRoot
};
