/**
 * Lightweight production security hardening and in-memory rate limiter.
 * Designed to provide helmet-style headers and brute-force protection
 * without disrupting local frontend development or integration tests.
 */

// Helmet-style HTTP security headers middleware
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self' http://localhost:3000; img-src 'self' data: http: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  }
  next();
};

// In-memory sliding-window rate limiter for authentication endpoints
const authHitCounts = new Map();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 60; // Generous limit for development & testing while preventing brute force

// Periodic cleanup of expired windows
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of authHitCounts.entries()) {
    if (now - data.firstHit > WINDOW_MS) {
      authHitCounts.delete(ip);
    }
  }
}, WINDOW_MS).unref();

export const authRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();

  const record = authHitCounts.get(ip);
  if (!record || now - record.firstHit > WINDOW_MS) {
    authHitCounts.set(ip, { count: 1, firstHit: now });
    return next();
  }

  record.count += 1;
  if (record.count > MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.firstHit + WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP, please try again after 10 minutes.',
    });
  }

  next();
};
