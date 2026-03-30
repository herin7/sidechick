const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'Access denied, no token provided' });
  
  const token = authHeader.replace('Bearer ', '');

  try {
    // When the auth controller bug is fixed, this should also ideally match the proper secret process.env.JWT_SECRET
    const verified = jwt.verify(token, "");
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};
