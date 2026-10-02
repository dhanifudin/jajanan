import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// HTML5 history mode (clean URLs). GitHub Pages deep-link fallback is handled
// by a dist/404.html generated at build time (see vite.config.ts), and by the
// Workbox navigateFallback once the service worker is active.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'catalog',
      component: () => import('@/pages/CatalogPage.vue'),
      meta: { public: true },
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/pages/CheckoutPage.vue'),
      meta: { public: true },
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/pages/OrdersPage.vue'),
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('@/pages/FavoritesPage.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsPage.vue'),
    },
    {
      path: '/admin/snacks',
      name: 'admin-snacks',
      component: () => import('@/pages/AdminSnacksPage.vue'),
      meta: { admin: true },
    },
    {
      path: '/admin/orders',
      name: 'admin-orders',
      component: () => import('@/pages/AdminOrdersPage.vue'),
      meta: { admin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isLoggedIn) {
    return { name: 'login' }
  }
  if (to.meta.admin && !auth.isAdmin) {
    return { name: 'catalog' }
  }
  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'catalog' }
  }
})

export default router
