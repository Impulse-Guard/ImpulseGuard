import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  outDir: "dist",
  publicDir: "static",
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Impulse Guard',
    description: 'AI-powered impulse purchase blocker',
    permissions: ['storage'],
    host_permissions: ['https://api.anthropic.com/*'],
    browser_specific_settings: {
      gecko: {
        id: 'impulse-guard@example.com',
        strict_min_version: '109.0',
      },
    },
    icons: {
      16: '/icon16.png',
      32: '/icon32.png',
      48: '/icon48.png',
      128: '/icon128.png',
    },
  },
});
