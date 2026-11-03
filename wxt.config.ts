import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import { CLEAR_SITE_COMMAND } from './utils/commands';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    author: 'utopiaeh01@gmail.com' as unknown as { email: string },
    homepage_url: 'https://github.com/utopiaeh/bleep',
    minimum_chrome_version: '88',
    permissions: [
      'storage',
      'tabs',
      'browsingData',
      'history',
      'contextMenus',
      ...(browser === 'firefox' ? (['scripting', 'cookies'] as const) : []),
    ],
    optional_host_permissions: ['*://*/*'],
    commands: {
      [CLEAR_SITE_COMMAND]: {
        description: '__MSG_cmdClearSite__',
      },
    },
    browser_specific_settings: {
      gecko: {
        id: 'cache-cleaner@utopiaeh',
        strict_min_version: '140.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  }),
});
