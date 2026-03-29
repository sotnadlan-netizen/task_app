/**
 * Haptic feedback utility for iPhone Safari.
 * iOS Safari does not expose the Vibration API, but toggling an invisible
 * <input type="checkbox" switch> triggers a native haptic tap on supported devices.
 *
 * Usage:
 *   const haptic = useHaptic();
 *   <button onClick={() => { haptic(); doSomething(); }}>Tap me</button>
 */

let hapticEl: HTMLInputElement | null = null;

function getHapticElement(): HTMLInputElement {
  if (!hapticEl) {
    hapticEl = document.createElement("input");
    hapticEl.type = "checkbox";
    // @ts-ignore — non-standard iOS attribute
    hapticEl.setAttribute("switch", "");
    hapticEl.style.cssText =
      "position:fixed;opacity:0;pointer-events:none;width:0;height:0;";
    document.body.appendChild(hapticEl);
  }
  return hapticEl;
}

export function triggerHaptic(): void {
  try {
    // Standard Vibration API (Android Chrome, some browsers)
    if (navigator.vibrate) {
      navigator.vibrate(10);
      return;
    }
    // iOS Safari fallback: toggle checkbox[switch]
    const el = getHapticElement();
    el.checked = !el.checked;
  } catch {
    // silently ignore — haptics are best-effort
  }
}

export function useHaptic(): () => void {
  return triggerHaptic;
}
