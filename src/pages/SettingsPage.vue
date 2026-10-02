<template>
  <div class="min-h-screen bg-cream pb-28">
    <PageHeader><h1 class="font-display font-bold text-cocoa-700 text-xl">Pengaturan</h1></PageHeader>

    <div class="page pt-4 space-y-4">
      <div class="card space-y-4">
        <h3 class="font-display font-bold text-cocoa-700 text-lg">Notifikasi Stok Favorit</h3>

        <div v-if="!notif.supported" class="text-sm text-cocoa-700/60">
          Perangkat/browser ini tidak mendukung notifikasi push.
        </div>

        <template v-else>
          <div v-if="notif.permission !== 'granted'" class="space-y-2">
            <p class="text-sm text-cocoa-700/70">Izinkan notifikasi untuk tahu saat jajanan favoritmu habis atau ada lagi.</p>
            <button @click="requestAndSubscribe" class="btn-primary">Izinkan Notifikasi</button>
          </div>

          <template v-else>
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm font-semibold text-cocoa-700">Notifikasi aktif</span>
              <button @click="toggleSubscription"
                      class="relative flex-shrink-0 rounded-full transition-colors duration-200 active:opacity-80"
                      style="width:56px; min-width:56px; height:44px; display:flex; align-items:center"
                      :class="notif.subscribed ? 'bg-amber-400' : 'bg-gray-200'">
                <span class="absolute left-1 h-7 w-7 bg-white rounded-full shadow transition-transform duration-200"
                      :class="notif.subscribed ? 'translate-x-[28px]' : 'translate-x-0'" />
              </button>
            </div>

            <label class="flex items-center gap-3 cursor-pointer min-h-[44px]">
              <input type="checkbox" v-model="stockAlertsEnabled" @change="save"
                     class="w-5 h-5 rounded accent-amber-500 flex-shrink-0" />
              <span class="text-sm font-semibold text-cocoa-700">Beri tahu saat stok habis / ada lagi</span>
            </label>
          </template>
        </template>
      </div>

      <button @click="auth.signOut()" class="btn-secondary w-full justify-center">Keluar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import PageHeader from '@/components/PageHeader.vue'

const auth = useAuthStore()
const notif = useNotificationsStore()
const stockAlertsEnabled = ref(notif.prefs.stock_alerts_enabled)

onMounted(async () => {
  await notif.fetchPrefs()
  await notif.checkSubscription()
  stockAlertsEnabled.value = notif.prefs.stock_alerts_enabled
})

async function requestAndSubscribe() {
  const ok = await notif.requestPermission()
  if (ok) await notif.subscribe()
}

async function toggleSubscription() {
  if (notif.subscribed) await notif.unsubscribe()
  else await notif.subscribe()
}

async function save() {
  await notif.savePrefs({ stock_alerts_enabled: stockAlertsEnabled.value })
}
</script>
