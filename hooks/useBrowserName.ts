import { useEffect, useState } from 'react';
import { getBrowserName, isGeckoBased } from '../utils/browser-info';

/** The real self-reported browser name (e.g. "Firefox", "Zen", "LibreWolf") on
 * Gecko-based browsers, or null on Chromium-family browsers (which don't implement
 * getBrowserInfo) — use this instead of hardcoding "Firefox" in Gecko-only copy. */
export function useBrowserName(): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (isGeckoBased()) getBrowserName().then(setName);
  }, []);

  return name;
}
