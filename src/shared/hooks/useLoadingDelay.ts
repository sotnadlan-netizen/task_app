import { useEffect, useState } from "react";

/**
 * Deferred loading indicator — prevents flash for fast loads.
 * Returns `true` only after the loading state has been `true`
 * for longer than `delayMs` (default 200ms).
 *
 * Usage:
 *   const showSpinner = useLoadingDelay(loading);
 *   if (showSpinner) return <Spinner />;
 */
export function useLoadingDelay(loading: boolean, delayMs = 200): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [loading, delayMs]);

  return show;
}
