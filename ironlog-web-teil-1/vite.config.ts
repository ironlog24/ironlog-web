import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `vite build --mode artifact` erzeugt eine einzelne, selbsttragende HTML-Datei (Demo ohne Service Worker)

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'artifact' ? viteSingleFile() : VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'IRONLOG – Gym Tracker',
        short_name: 'IRONLOG',
        description: 'Jede Wiederholung zählt. Dein Gym-Tracker.',
        lang: 'de',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2,dat}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024, // Lebensmittel-Datenbank (~4 MB) offline verfügbar
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'unsplash', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  build: mode === 'artifact' ? { outDir: 'dist-artifact', assetsInlineLimit: 100_000_000, minify: false } : {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          charts: ['recharts'],
        },
      },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
}))
