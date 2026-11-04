/** True inside the Capacitor Android app (or the legacy file:// WebView). */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  } catch {}
  return window.location.protocol === 'file:';
}

export function isCapacitorNative(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}
