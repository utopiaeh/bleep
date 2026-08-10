import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Cache Cleaner',
    description: 'Clear cache, storage, and browsing data — globally or per-site.',
    permissions: ['storage', 'tabs', 'browsingData', 'scripting'],
    optional_host_permissions: ['*://*/*'],
    browser_specific_settings: {
      gecko: {
        id: 'cache-cleaner@flow48.com',
        strict_min_version: '109.0',
      },
    },
  },
});
