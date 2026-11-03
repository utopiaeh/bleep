import { browser } from 'wxt/browser';
import { FLASH_MESSAGE, type FlashMessage } from './commands';

export function flashClearResult(ok: boolean, tabId?: number): void {
  const message: FlashMessage = { type: FLASH_MESSAGE, ok, tabId };
  browser.runtime.sendMessage(message).catch(() => {});
}
