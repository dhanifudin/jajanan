import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Custom domain https://jajanan.ulfillah.com → app lives at root /
const BASE = '/'

// SPA fallback for GitHub Pages: copy the SW-injected index.html to 404.html
// so deep links (e.g. /checkout, /admin) don't 404 on hard refresh.
// This runs AFTER VitePWA closes the bundle so registerSW.js is already injected.
const spa404Plugin = {
  name: 'spa-404-fallback',
  closeBundle() {
    const distDir = resolve(__dirname, 'dist')
    copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'))
  },
}

export default defineConfig({
  base: BASE,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    vue(),
    VitePWA({
      // Custom SW so we can handle Web Push (generateSW has no push handler)
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Jajanan — Snack Stall',
        short_name: 'Jajanan',
        description: 'Daftar harga jajanan, stok, dan pembayaran QRIS',
        theme_color: '#D97706',
        background_color: '#FFF7ED',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      // Enable SW in dev so Chrome shows "Install app" on localhost too.
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
    spa404Plugin,
  ],
})
