import type { ClearStatus } from '../components/StatusButton';
import type { TranslationKey } from './i18n';

export function clearAllLabel(
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  status: ClearStatus,
  count: number,
): string {
  if (status === 'clearing') return t('clearing');
  if (status === 'done') return t('cleared');
  if (status === 'failed') return t('someFailed');
  return t('clearAllCount', { count });
}

export async function runClear(setStatus: (status: ClearStatus) => void, fn: () => Promise<void>): Promise<void> {
  setStatus('clearing');
  try {
    await fn();
    setStatus('done');
  } catch (err) {
    console.error('Bleep: clear failed', err);
    setStatus('failed');
  }
  setTimeout(() => setStatus('idle'), 1500);
}
