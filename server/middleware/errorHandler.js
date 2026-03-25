/**
 * Global error handler — must be registered LAST in Express middleware chain.
 * In production, stack traces are never sent to the client.
 */
export function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";

  console.error(`[ERROR] ${req.method} ${req.url} → ${status}`);
  console.error(err.stack || err.message || err);

  res.status(status).json({
    error: isProd && status === 500
      ? "Internal server error"
      : err.message || "Internal server error",
  });
}
