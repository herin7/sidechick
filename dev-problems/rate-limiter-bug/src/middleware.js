const store = {};

/**
 * Rate limiter: max 3 requests per windowMs per IP.
 * BUG 1: window never resets because setTimeout clears the count
 *        but the resetTime is never updated, so expired windows
 *        are never detected and the block is permanent.
 * BUG 2: blocks at > 3 instead of >= 3 (off-by-one — allows 4 requests through)
 */
function rateLimiter(windowMs = 5000, max = 3) {
  return (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();

    if (!store[ip]) {
      store[ip] = { count: 0, resetTime: now + windowMs };
      setTimeout(() => {
        store[ip].count = 0;
        // BUG 1: resetTime is never updated here, so the next window
        // check (now > resetTime) is always true after first expiry
      }, windowMs);
    }

    // BUG 1 continued: should check `now > store[ip].resetTime` and reset if so
    // BUG 2: should be >= max, not > max
    if (store[ip].count > max) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    store[ip].count++;
    next();
  };
}

/**
 * Request logger middleware.
 * BUG 3: calls next() twice — once inside the log and once at the bottom,
 *        causing Express "Cannot set headers after they are sent" error.
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${ms}ms`);
    next(); // BUG 3: next() inside finish event handler — should not be here
  });

  next();
}

module.exports = { rateLimiter, requestLogger };
