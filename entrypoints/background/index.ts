import { browser, type Browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { recordClear } from '../../store/clearLog';
import {
  clearSiteWithLinked,
  isProtectedSite,
  linkedOriginsFor,
  requestOriginPermission,
  siteScopedIds,
  tabHostname,
  tabOrigin,
} from '../../utils/clearing';
import { CLEAR_SITE_COMMAND, FLASH_MESSAGE, type FlashMessage } from '../../utils/commands';
import { installGlobalErrorLogging } from '../../utils/error-log';
import { withDefaults, type ExportableSettings } from '../../utils/settings-transfer';
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

export async function readSettings(): Promise<ExportableSettings> {
  const raw = (await readPersistedSettingsRaw(SETTINGS_KEY)) as { state?: unknown } | null;
  return withDefaults(raw?.state);
}

let cachedSettings: ExportableSettings | null = null;

export async function getMappingSettings(): Promise<
  Pick<ExportableSettings, 'linkedOrigins' | 'useOriginMappings'>
> {
  cachedSettings ??= await readSettings();
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

  if (latestGeneration.get(tabId) !== generation || flashTimers.has(tabId)) return;
  await browser.action.setIcon({ tabId, path }).catch(() => {});
}

const FLASH_MS = 2000;
const DOT_SIZES = [16, 32] as const;
const flashTimers = new Map<number, ReturnType<typeof setTimeout>>();
const dotIcons = new Map<boolean, Promise<Record<number, ImageData>>>();

// Drawn at runtime so the dot matches the linked-icon dot without extra PNG variants.
async function drawDotIcon(ok: boolean): Promise<Record<number, ImageData>> {
  const result: Record<number, ImageData> = {};
  for (const size of DOT_SIZES) {
    const response = await fetch(browser.runtime.getURL(`/icon/${size}.png`));
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size * 0.8, size * 0.2, size * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = ok ? '#16a34a' : '#dc2626';
    ctx.fill();
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    result[size] = ctx.getImageData(0, 0, size, size);
  }
  return result;
}

function dotIcon(ok: boolean): Promise<Record<number, ImageData>> {
  let icon = dotIcons.get(ok);
  if (!icon) {
    icon = drawDotIcon(ok);
    icon.catch(() => dotIcons.delete(ok));
    dotIcons.set(ok, icon);
  }
  return icon;
}

export async function flashResult(ok: boolean, tabId?: number): Promise<void> {
  if (tabId == null) return;
  clearTimeout(flashTimers.get(tabId));
  flashTimers.set(
    tabId,
    setTimeout(() => {
      flashTimers.delete(tabId);
      browser.tabs
        .get(tabId)
        .then((tab) => updateIcon(tabId, tab.url))
        .catch(() => {});
    }, FLASH_MS),
  );
  try {
    await browser.action.setIcon({ tabId, imageData: await dotIcon(ok) });
  } catch (err) {
    console.error('Bleep: could not show clear result on icon', err);
  }
}

// Callers must start the permission request synchronously in the menu/command listener:
// any await before it loses the user gesture and the browser refuses the prompt.
export function requestSiteAccess(): Promise<boolean> {
  return requestOriginPermission().catch(() => false);
}

export async function clearActiveSite(
  tab: Browser.tabs.Tab | undefined,
  access: Promise<boolean>,
): Promise<void> {
  const target =
    tab?.id != null ? tab : (await browser.tabs.query({ active: true, currentWindow: true }))[0];
  if (target?.id == null) return;
  const tabId = target.id;
  const hostname = tabHostname(target);
  const settings = await readSettings();

  if (!hostname || isProtectedSite(settings.protectedSites, hostname)) {
    await flashResult(false, tabId);
    return;
  }
  if (!(await access)) {
    await flashResult(false, tabId);
    await browser.action.openPopup().catch(() => {});
    return;
  }

  try {
    const ids = siteScopedIds(settings.selectedTypesSite);
    const linkedTargets = await clearSiteWithLinked(target, ids, settings);
    if (linkedTargets == null) throw new Error('Tab has no clearable origin');
    await recordClear(hostname, ids, linkedTargets);
    await flashResult(true, tabId);
    if (settings.autoReloadAfterClear) await browser.tabs.reload(tabId, { bypassCache: true });
  } catch (err) {
    console.error('Bleep: background clear failed', err);
    await flashResult(false, tabId);
  }
}

// Firefox names this API `menus` (`contextMenus` is only an alias), and it's absent entirely when
// the running copy lacks the permission — so look it up instead of crashing the whole background.
function contextMenus(): typeof browser.contextMenus | undefined {
  return (browser as { menus?: typeof browser.contextMenus }).menus ?? browser.contextMenus;
}

function createContextMenu(): void {
  const menus = contextMenus();
  if (!menus) return;
  menus
    .removeAll()
    .then(() =>
      menus.create({
        id: CLEAR_SITE_COMMAND,
        title: browser.i18n.getMessage('menuClearSite'),
        contexts: ['page', 'action'],
      }),
    )
    .catch(() => {});
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      browser.tabs.create({ url: browser.runtime.getURL('/options.html#welcome') }).catch(() => {});
    }
    createContextMenu();
  });
  browser.runtime.onStartup.addListener(createContextMenu);

  contextMenus()?.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CLEAR_SITE_COMMAND) clearActiveSite(tab, requestSiteAccess());
  });

  browser.commands.onCommand.addListener((command, tab) => {
    if (command === CLEAR_SITE_COMMAND) clearActiveSite(tab, requestSiteAccess());
  });

  browser.runtime.onMessage.addListener((message: Partial<FlashMessage>) => {
    if (message?.type === FLASH_MESSAGE) flashResult(!!message.ok, message.tabId);
  });

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
    clearTimeout(flashTimers.get(tabId));
    flashTimers.delete(tabId);
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
