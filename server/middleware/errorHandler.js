/**
 * Global error handler — must be registered LAST in Express middleware chain.
 * In production, stack traces are never sent to the client.
 */
import logger from "../utils/logger.js";

export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  logger.error({
    err:    { message: err.message, stack: err.stack },
    reqId:  req.reqId,
    method: req.method,
    url:    req.url,
    status,
  }, "Unhandled error");

  res.status(status).json({
    error: isProd && status === 500
      ? "Internal server error"
      : err.message || "Internal server error",
  });
}
