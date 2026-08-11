import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Cache Cleaner',
    description:
      'Full control over your browsing data — pick exactly what to clear (cache, cookies, storage, service workers, history, and more) globally or for just the site you\'re on.',
    author: { email: 'utopiaeh01@gmail.com' },
    minimum_chrome_version: '88',
    permissions: ['storage', 'tabs', 'browsingData', 'scripting', 'history'],
    optional_host_permissions: ['*://*/*'],
    browser_specific_settings: {
      gecko: {
        id: 'utopiaeh01@gmail.com',
        strict_min_version: '109.0',
      },
    },
  },
});
