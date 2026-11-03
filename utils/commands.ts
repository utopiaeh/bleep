export const CLEAR_SITE_COMMAND = 'clear-active-site';

export const FLASH_MESSAGE = 'bleep:flash';

export interface FlashMessage {
  type: typeof FLASH_MESSAGE;
  ok: boolean;
  tabId?: number;
}
