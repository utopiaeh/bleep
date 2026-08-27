import { useEffect, useState } from 'react';
import { getBrowserName, isGeckoBased } from '../utils/browser-info';

export function useBrowserName(): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (isGeckoBased()) getBrowserName().then(setName);
  }, []);

  return name;
}
