/**
 * Centralised Pino logger.
 *
 * - Production: plain JSON (one object per line) — ship to any log aggregator.
 * - Development: pretty-printed to stderr if pino-pretty is installed; falls
 *   back to plain JSON gracefully so the server always starts.
 *
 * Usage:
 *   import logger from "../utils/logger.js";
 *   logger.info({ reqId }, "Request started");
 *   logger.error({ err }, "Something went wrong");
 */
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

let transport;
if (isDev) {
  try {
    // Optional dev dependency — silently fall back to plain JSON if absent
    await import("pino-pretty");
    transport = {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
    };
  } catch {
    // pino-pretty not installed — plain JSON is fine
  }
}

// In production, redact PII fields so they never appear in log aggregators.
// Paths use dot-notation; bracket notation covers array items.
const redactPaths = [
  "ip",
  "email",
  "clientEmail",
  "providerId",
  "req.headers.authorization",
  "req.headers.cookie",
];

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(isDev ? {} : { redact: { paths: redactPaths, censor: "[REDACTED]" } }),
  ...(transport && { transport }),
});

export default logger;
