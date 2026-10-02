/**
 * Jajanan custom service worker (injectManifest strategy).
 * Compiled by vite-plugin-pwa's Rollup sub-build, not by the main tsc.
 *
 * Responsibilities:
 *  1. Precache all app assets (self.__WB_MANIFEST injected by vite-plugin-pwa)
 *  2. SPA navigation fallback → serve the precached index.html
 *  3. Handle incoming Web Push notifications (favorite snack stock alerts)
 *  4. Handle notification clicks → focus / open the app
 */

import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// 1. Precache all Vite build assets (manifest injected at build time)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Activate immediately and claim all clients so push events are handled
// by the latest SW version (required with injectManifest + autoUpdate).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Support vite-plugin-pwa autoUpdate: respond to SKIP_WAITING message
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// 2. SPA navigation fallback — all navigations (except /api, /supabase) get index.html
const spaHandler = createHandlerBoundToURL('/index.html')
registerRoute(
  new NavigationRoute(spaHandler, {
    denylist: [/^\/api\//, /^\/supabase\//],
  })
)

// 3. Google Fonts stylesheet — stale-while-revalidate (tiny, changes rarely)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'jajanan-fonts-css' })
)

// 4. Google Font files — cache-first, 1 year (content-addressed, immutable)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'jajanan-fonts-files',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 365 * 24 * 60 * 60, maxEntries: 30 }),
    ],
  })
)

// ── Web Push ──────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data: { title?: string; body?: string; icon?: string; badge?: string; tag?: string; url?: string }
  try { data = event.data.json() } catch { data = { body: event.data.text() } }

  const title = data.title ?? '🍡 Jajanan'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body,
      icon: data.icon ?? '/icon-192.png',
      badge: data.badge ?? '/icon-192.png',
      tag: data.tag,
      data: { url: data.url ?? '/' },
    })
  )
})

// ── Notification click ──────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target: string = (event.notification.data as { url?: string })?.url ?? '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const hit = clients.find(c => c.url.startsWith(self.location.origin))
        if (hit) return hit.focus().then(c => c.navigate(target))
        return self.clients.openWindow(target)
      })
  )
})
