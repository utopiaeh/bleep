import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { linkedOriginsFor, tabOrigin } from '../../utils/clearing';
import { installGlobalErrorLogging } from '../../utils/error-log';
import { readPersistedSettingsRaw } from '../../utils/storage-adapter';

installGlobalErrorLogging();

const SETTINGS_KEY = 'cache-cleaner-settings';

const DEFAULT_ICON = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  96: 'icon/96.png',
  128: 'icon/128.png',
};
const LINKED_ICON = {
  16: 'icon/16-linked.png',
  32: 'icon/32-linked.png',
  48: 'icon/48-linked.png',
  96: 'icon/96-linked.png',
  128: 'icon/128-linked.png',
};

interface PersistedShape {
  state?: { linkedOrigins?: string; useOriginMappings?: boolean };
}

type MappingSettings = { linkedOrigins: string; useOriginMappings: boolean };

let cachedSettings: MappingSettings | null = null;

export async function getMappingSettings(): Promise<MappingSettings> {
  if (!cachedSettings) {
    const raw = (await readPersistedSettingsRaw(SETTINGS_KEY)) as PersistedShape | null;
    cachedSettings = {
      linkedOrigins: raw?.state?.linkedOrigins ?? '',
      useOriginMappings: raw?.state?.useOriginMappings ?? false,
    };
  }
  return cachedSettings;
}

export function invalidateMappingSettingsCache(): void {
  cachedSettings = null;
}

const latestGeneration = new Map<number, number>();

export async function updateIcon(tabId: number, url: string | undefined): Promise<void> {
  const generation = (latestGeneration.get(tabId) ?? 0) + 1;
  latestGeneration.set(tabId, generation);

  const origin = url ? tabOrigin({ url }) : null;
  let path = DEFAULT_ICON;
  if (origin) {
    const { linkedOrigins, useOriginMappings } = await getMappingSettings();
    const hasMapping = useOriginMappings && linkedOriginsFor(linkedOrigins, origin).length > 0;
    path = hasMapping ? LINKED_ICON : DEFAULT_ICON;
  }

  if (latestGeneration.get(tabId) !== generation) return;
  await browser.action.setIcon({ tabId, path }).catch(() => {});
}

export default defineBackground(() => {
  browser.tabs.onActivated.addListener(({ tabId }) => {
    browser.tabs
      .get(tabId)
      .then((tab) => updateIcon(tabId, tab.url))
      .catch(() => {});
  });

  browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.status === 'complete') updateIcon(tabId, tab.url);
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    latestGeneration.delete(tabId);
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !Object.keys(changes).some((key) => key.startsWith(SETTINGS_KEY)))
      return;
    invalidateMappingSettingsCache();
    browser.tabs
      .query({ active: true })
      .then((tabs) => {
        for (const tab of tabs) {
          if (tab.id != null) updateIcon(tab.id, tab.url);
        }
      })
      .catch(() => {});
  });
});
