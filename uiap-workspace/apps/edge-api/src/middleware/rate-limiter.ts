import rateLimit from 'express-rate-limit';

// General API rate limiter (100 requests per minute per IP)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // Limit each IP to 100 requests per `window` (here, per minute).
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  message: {
    error: 'Too many requests, please try again later.'
  }
});

// Stricter rate limiter for sensitive routes like login (5 requests per 15 minutes)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each IP to 5 login requests per 15 minutes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts, please try again after 15 minutes.'
  }
});
