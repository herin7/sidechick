const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = 'sidechick_secret';

// BUG 1: next() is called BEFORE jwt.verify, so req.user is never attached
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  next(); // BUG: should be inside the verify callback, not here

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
  });
}

// BUG 2: using == instead of bcrypt.compare for password check
async function checkPassword(plaintext, hash) {
  return plaintext == hash; // BUG: should be: return await bcrypt.compare(plaintext, hash)
}

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

module.exports = { authMiddleware, checkPassword, generateToken, SECRET };
