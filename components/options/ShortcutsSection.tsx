import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { useTranslation } from '../../hooks/useTranslation';
import { isGeckoBased } from '../../utils/browser-info';
import { CLEAR_SITE_COMMAND } from '../../utils/commands';
import type { TranslationKey } from '../../utils/i18n';

const LABELS = {
  [CLEAR_SITE_COMMAND]: 'shortcutClearSite',
  _execute_action: 'shortcutOpenPopup',
} as const satisfies Record<string, TranslationKey>;

function isListedCommand(name: string | undefined): name is keyof typeof LABELS {
  return name != null && name in LABELS;
}

const MANUAL_PATH_FIREFOX = 'about:addons → ⚙ → Manage Extension Shortcuts';
const MANUAL_PATH_CHROME = 'chrome://extensions/shortcuts';

async function openShortcutSettings(): Promise<boolean> {
  const commands = browser.commands as { openShortcutSettings?: () => Promise<void> };
  try {
    if (commands.openShortcutSettings) await commands.openShortcutSettings();
    else if (isGeckoBased()) return false;
    else await browser.tabs.create({ url: MANUAL_PATH_CHROME });
    return true;
  } catch {
    return false;
  }
}

export function ShortcutsSection() {
  const t = useTranslation();
  const [showManualHint, setShowManualHint] = useState(false);
  const [commands, setCommands] = useState<
    Array<{ name: string; label: TranslationKey; shortcut: string }>
  >([]);

  useEffect(() => {
    const load = () =>
      browser.commands
        .getAll()
        .then((all) =>
          setCommands(
            all.flatMap((c) =>
              isListedCommand(c.name)
                ? [{ name: c.name, label: LABELS[c.name], shortcut: c.shortcut ?? '' }]
                : [],
            ),
          ),
        )
        .catch(() => {});
    load();
    // Users rebind keys on a separate browser page, so refresh when they come back.
    document.addEventListener('visibilitychange', load);
    return () => document.removeEventListener('visibilitychange', load);
  }, []);

  return (
    <section className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-1">{t('shortcutsTitle')}</h2>
      <p className="text-sm text-stone-500 mb-4">{t('shortcutsText')}</p>
      <ul className="divide-y divide-stone-200 dark:divide-stone-700 mb-4">
        {commands.map((c) => (
          <li key={c.name} className="flex items-center justify-between py-2 text-sm">
            <span>{t(c.label)}</span>
            <kbd className="px-2 py-0.5 rounded border border-stone-300 dark:border-stone-600 font-mono text-xs">
              {c.shortcut || t('shortcutNotSet')}
            </kbd>
          </li>
        ))}
      </ul>
      <button
        onClick={() => openShortcutSettings().then((opened) => setShowManualHint(!opened))}
        type="button"
        className="rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer px-3 py-1.5 text-xs font-medium whitespace-nowrap"
      >
        {t('shortcutsChange')}
      </button>
      {showManualHint && (
        <p className="text-xs text-stone-500 mt-2">
          {t('shortcutsManualHint', {
            path: isGeckoBased() ? MANUAL_PATH_FIREFOX : MANUAL_PATH_CHROME,
          })}
        </p>
      )}
    </section>
  );
}
