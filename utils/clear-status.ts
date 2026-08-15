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
