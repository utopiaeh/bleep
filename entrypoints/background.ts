import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { linkedOriginsFor, tabOrigin } from '../utils/clearing';
import { readPersistedSettingsRaw } from '../utils/storage-adapter';

const BADGE_COLOR = '#2563eb';
const SETTINGS_KEY = 'cache-cleaner-settings';

interface PersistedShape {
  state?: { linkedOrigins?: string; useOriginMappings?: boolean };
}

type MappingSettings = { linkedOrigins: string; useOriginMappings: boolean };

let cachedSettings: MappingSettings | null = null;

async function getMappingSettings(): Promise<MappingSettings> {
  if (!cachedSettings) {
    const raw = (await readPersistedSettingsRaw(SETTINGS_KEY)) as PersistedShape | null;
    cachedSettings = {
      linkedOrigins: raw?.state?.linkedOrigins ?? '',
      useOriginMappings: raw?.state?.useOriginMappings ?? false,
    };
  }
  return cachedSettings;
}

async function updateBadge(tabId: number, url: string | undefined) {
  const origin = url ? tabOrigin({ url }) : null;
  if (!origin) {
    await browser.action.setBadgeText({ tabId, text: '' });
    return;
  }

  const { linkedOrigins, useOriginMappings } = await getMappingSettings();
  const hasMapping = useOriginMappings && linkedOriginsFor(linkedOrigins, origin).length > 0;

  await browser.action.setBadgeText({ tabId, text: hasMapping ? '●' : '' });
  if (hasMapping) {
    await browser.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
  }
}

export default defineBackground(() => {
  browser.tabs.onActivated.addListener(({ tabId }) => {
    browser.tabs.get(tabId).then((tab) => updateBadge(tabId, tab.url));
  });

  browser.tabs.onUpdated.addListener((tabId, info, tab) => {
    if (info.status === 'complete') updateBadge(tabId, tab.url);
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !Object.keys(changes).some((key) => key.startsWith(SETTINGS_KEY)))
      return;
    cachedSettings = null;
    browser.tabs.query({ active: true }).then((tabs) => {
      for (const tab of tabs) {
        if (tab.id != null) updateBadge(tab.id, tab.url);
      }
    });
  });
});
