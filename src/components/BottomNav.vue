<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50 px-3"
       style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 12px)">
    <div class="bg-white/95 backdrop-blur-sm shadow-snack-lg border border-amber-100/60 rounded-3xl max-w-lg mx-auto overflow-hidden">
      <div class="flex items-stretch p-1 gap-1">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] rounded-2xl transition-all duration-200 select-none active:bg-amber-50"
          :class="isActive(tab.to) ? 'text-amber-600 bg-amber-50 shadow-sm' : 'text-cocoa-700/45 hover:text-amber-500 hover:bg-amber-50/50'"
        >
          <span class="text-2xl leading-none">{{ tab.icon }}</span>
          <span class="text-xs font-semibold font-body leading-none">{{ tab.label }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
  <div class="h-28" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()

const tabs = computed(() => {
  if (!auth.isLoggedIn) {
    return [
      { to: '/', icon: '🍡', label: 'Jajan' },
      { to: '/login', icon: '👤', label: 'Masuk' },
    ]
  }

  const base = [
    { to: '/', icon: '🍡', label: 'Jajan' },
    { to: '/orders', icon: '🧾', label: 'Pesanan' },
    { to: '/favorites', icon: '⭐', label: 'Favorit' },
    { to: '/settings', icon: '⚙️', label: 'Pengaturan' },
  ]
  if (auth.isAdmin) {
    base.splice(3, 0, { to: '/admin/snacks', icon: '🛠️', label: 'Admin' })
  }
  return base
})

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  if (path === '/admin/snacks') return route.path.startsWith('/admin')
  return route.path.startsWith(path)
}
</script>
