import rateLimit from "express-rate-limit";

// General limiter — first layer, keyed by IP (runs before auth).
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Stricter limiter for the heavy audio-processing endpoint — keyed by IP.
export const audioLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Audio processing rate limit exceeded, please try again later." },
});

// Per-user limiter — second layer, keyed by authenticated user ID.
// Apply this AFTER requireAuth so req.user is populated.
// Prevents a single user from exhausting quota even via IP rotation.
export const perUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: "Too many requests for this account, please try again later." },
});

// Stricter per-user limiter for audio processing.
export const perUserAudioLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: "Audio processing rate limit exceeded for this account." },
});
