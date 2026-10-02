<template>
  <div class="min-h-screen bg-cream">
    <div v-if="!isOnline" class="fixed top-0 inset-x-0 z-50 bg-amber-400 text-amber-900 text-center text-xs py-1 font-semibold tracking-wide">
      Offline — perubahan akan tersinkron saat online kembali
    </div>

    <div v-if="auth.loading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="text-6xl mb-4 animate-bounce">🍡</div>
        <p class="font-display text-amber-600 font-semibold text-lg">Memuat…</p>
      </div>
    </div>

    <template v-else>
      <RouterView />
      <BottomNav v-if="route.name !== 'login'" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BottomNav from '@/components/BottomNav.vue'

const auth = useAuthStore()
const route = useRoute()

const isOnline = ref(navigator.onLine)
function onOnline() { isOnline.value = true }
function onOffline() { isOnline.value = false }
onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onUnmounted(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>
