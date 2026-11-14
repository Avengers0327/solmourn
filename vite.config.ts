import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative base so the built app works from any folder on any static host
// (GitHub Pages project sites, Netlify, a NAS, ...).
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify('0.5.0') },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: 'Solmourn Companion',
        short_name: 'Solmourn',
        description: 'Offline DM cockpit for the Solmourn campaign.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f141b',
        theme_color: '#0f141b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], navigateFallbackDenylist: [/^\/api\//] },
    }),
  ],
  server: { port: 5173 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
