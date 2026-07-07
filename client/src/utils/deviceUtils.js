/**
 * Lightweight mobile / low-power device detection.
 * Uses a combination of screen width, touch support, and navigator hints.
 * Cached on first call so repeated checks are free.
 */

let _isMobileCache = null;

export function isMobileDevice() {
    if (_isMobileCache !== null) return _isMobileCache;

    // Primary: narrow viewport (covers phones in landscape too on small devices)
    const narrowScreen = window.innerWidth < 768;

    // Secondary: touch-primary device (phones/tablets)
    const hasTouch = navigator.maxTouchPoints > 1;

    // Tertiary: low-power hint from browser
    const savingData = navigator.connection?.saveData === true;
    const slowNetwork = ['slow-2g', '2g'].includes(navigator.connection?.effectiveType);

    _isMobileCache = narrowScreen || (hasTouch && !window.matchMedia('(hover: hover)').matches) || savingData || slowNetwork;
    return _isMobileCache;
}

/** Reset the cache (call on resize if needed). */
export function resetDeviceCache() {
    _isMobileCache = null;
}
