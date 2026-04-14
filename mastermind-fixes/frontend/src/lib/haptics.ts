/**
 * Haptic feedback helpers for mobile.
 * Wraps navigator.vibrate with sensible patterns.
 * Silently no-ops on desktop where vibrate is unavailable.
 */

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

/** Short tap — used for swipe-right (too easy) */
export const hapticLight = () => vibrate(20);

/** Medium pulse — used for swipe-up (advance) */
export const hapticMedium = () => vibrate(40);

/** Double bump — used for swipe-left (confused) */
export const hapticHeavy = () => vibrate([30, 20, 30]);

/** Success pattern — used when checkpoint is passed */
export const hapticSuccess = () => vibrate([10, 30, 10, 30, 80]);

/** Error pattern — used when checkpoint answer is wrong */
export const hapticError = () => vibrate([60, 40, 60]);
