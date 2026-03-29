/**
 * Sentry error monitoring scaffold.
 *
 * To activate in production:
 *   1. Run: npm install @sentry/react
 *   2. Set VITE_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/YYY in your
 *      Vercel environment variables.
 *   3. Uncomment the Sentry import lines below and remove the stubs.
 *
 * Until then this file exports safe no-op stubs so the rest of the app can
 * import and call Sentry.captureException() without crashing.
 */

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

// ── Stub (active until @sentry/react is installed + DSN is set) ───────────────
export const Sentry = {
  captureException: (err: unknown) => {
    if (import.meta.env.DEV) {
      console.error("[Sentry stub] captureException:", err);
    }
  },
  captureMessage: (msg: string) => {
    if (import.meta.env.DEV) {
      console.info("[Sentry stub] captureMessage:", msg);
    }
  },
};

// ── Real Sentry bootstrap (uncomment when @sentry/react is installed) ─────────
// import * as RealSentry from "@sentry/react";
//
// if (DSN) {
//   RealSentry.init({
//     dsn: DSN,
//     integrations: [RealSentry.browserTracingIntegration()],
//     tracesSampleRate: 0.1,
//     environment: import.meta.env.MODE,
//     // Ignore noisy browser-extension errors
//     ignoreErrors: ["ResizeObserver loop limit exceeded"],
//   });
//   Object.assign(Sentry, RealSentry);
// }

if (DSN && import.meta.env.PROD) {
  console.info("[Sentry] DSN detected but @sentry/react is not installed. Run: npm install @sentry/react");
}
