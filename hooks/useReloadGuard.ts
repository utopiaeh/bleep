import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';

export function useReloadGuard() {
  const [reloadingTabIds, setReloadingTabIds] = useState<Set<number>>(new Set());
  const ref = useRef<Set<number>>(new Set());

  useEffect(() => {
    ref.current = reloadingTabIds;
  }, [reloadingTabIds]);

  useEffect(() => {
    function onUpdated(tabId: number, changeInfo: { status?: string }) {
      if (changeInfo.status === 'complete' && ref.current.has(tabId)) {
        setReloadingTabIds((s) => {
          const next = new Set(s);
          next.delete(tabId);
          return next;
        });
      }
    }
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => browser.tabs.onUpdated.removeListener(onUpdated);
  }, []);

  function markReloading(tabId: number) {
    setReloadingTabIds((s) => new Set(s).add(tabId));
  }

  function isReloading(tabId: number | null | undefined): boolean {
    return tabId != null && ref.current.has(tabId);
  }

  return { reloadingTabIds, markReloading, isReloading };
}
