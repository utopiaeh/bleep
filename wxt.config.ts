import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => ({
    name: 'Bleep',
    description:
      'Full control over your browsing data — clear cache, cookies, storage, service workers, and history globally or per site.',
    author: 'utopiaeh01@gmail.com' as unknown as { email: string },
    homepage_url: 'https://github.com/utopiaeh/bleep',
    minimum_chrome_version: '88',
    permissions: [
      'storage',
      'tabs',
      'browsingData',
      'history',
      ...(browser === 'firefox' ? (['scripting'] as const) : []),
    ],
    optional_host_permissions: ['*://*/*'],
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
