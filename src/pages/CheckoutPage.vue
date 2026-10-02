<template>
  <div class="min-h-screen bg-cream pb-28">
    <header class="sticky z-20 bg-cream/95 backdrop-blur border-b border-amber-100"
            style="top: env(safe-area-inset-top, 0px)">
      <div class="page flex items-center gap-3 py-3">
        <button @click="back"
                class="min-w-[44px] min-h-[44px] flex items-center justify-center text-2xl text-amber-500 active:scale-90">
          ←
        </button>
        <h1 class="font-display font-bold text-cocoa-700 text-xl flex-1">
          {{ confirmedOrder ? 'Bayar QRIS' : 'Keranjang' }}
        </h1>
      </div>
    </header>

    <div class="page pt-4 space-y-5">

      <!-- Step 1: cart review -->
      <template v-if="!confirmedOrder">
        <div v-if="cart.lines().length === 0" class="text-center text-cocoa-700/50 py-10">
          Keranjang kosong.
        </div>

        <div v-else class="space-y-2">
          <div v-for="l in cart.lines()" :key="l.snackId" class="card flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-cocoa-700 truncate">{{ l.snack?.name }}</p>
              <p class="text-xs text-cocoa-700/60">{{ l.qty }} × Rp{{ (l.unitPrice ?? 0).toLocaleString('id-ID') }}</p>
            </div>
            <p class="font-bold text-amber-600 flex-shrink-0">Rp{{ (l.lineTotal ?? 0).toLocaleString('id-ID') }}</p>
          </div>
        </div>

        <div v-if="cart.lines().length" class="card-amber flex items-center justify-between">
          <span class="font-display font-bold text-cocoa-700">Total</span>
          <span class="font-display font-bold text-amber-700 text-xl">Rp{{ cart.total.toLocaleString('id-ID') }}</span>
        </div>

        <button v-if="cart.lines().length" @click="submitOrder" :disabled="submitting" class="btn-primary">
          {{ submitting ? 'Membuat pesanan…' : 'Buat Pesanan' }}
        </button>
        <p v-if="errorMsg" class="text-sm text-red-500 text-center">{{ errorMsg }}</p>
      </template>

      <!-- Step 2: dynamic QRIS payment -->
      <template v-else>
        <div class="card flex flex-col items-center text-center gap-3">
          <p class="text-sm text-cocoa-700/60">Scan dengan GoPay / aplikasi bank / e-wallet apapun</p>
          <QrCode v-if="dynamicQris" :value="dynamicQris" />
          <p v-else class="text-sm text-amber-700 bg-amber-100 rounded-2xl p-3">
            QRIS belum diatur admin. Tunjukkan layar ini ke penjual untuk bayar manual.
          </p>
          <p class="font-display font-bold text-amber-700 text-2xl">
            Rp{{ confirmedOrder.total_amount.toLocaleString('id-ID') }}
          </p>
          <p class="text-xs text-cocoa-700/50">Pesanan menunggu konfirmasi penjual setelah dibayar.</p>
        </div>

        <!-- Best-effort app open — mobile only. Can't hand off the QR/amount
             without a payment gateway, so this just opens GoPay if installed;
             the QR above stays the reliable path either way. -->
        <div class="md:hidden space-y-1">
          <button @click="tryOpenGoPay" class="btn-secondary w-full justify-center">
            📱 Buka GoPay
          </button>
          <p class="text-xs text-cocoa-700/40 text-center">
            Hanya membuka aplikasi — scan QR di atas untuk bayar.
          </p>
          <p v-if="gopayMsg" class="text-xs text-amber-600 text-center">{{ gopayMsg }}</p>
        </div>

        <RouterLink v-if="auth.isLoggedIn" to="/orders" class="btn-secondary w-full justify-center">
          Lihat status pesanan
        </RouterLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useOrdersStore, type Order } from '@/stores/orders'
import { useSettingsStore } from '@/stores/settings'
import { toDynamicQris } from '@/lib/qris'
import QrCode from '@/components/QrCode.vue'

const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const orders = useOrdersStore()
const settings = useSettingsStore()

const submitting = ref(false)
const errorMsg = ref('')
const confirmedOrder = ref<Order | null>(null)
const gopayMsg = ref('')

onMounted(() => {
  if (!settings.storeSettings) settings.fetchSettings()
})

const dynamicQris = computed(() => {
  const payload = settings.storeSettings?.qris_static_payload
  if (!payload || !confirmedOrder.value) return null
  try {
    return toDynamicQris(payload, confirmedOrder.value.total_amount)
  } catch {
    return null
  }
})

async function submitOrder() {
  submitting.value = true
  errorMsg.value = ''
  try {
    const lines = cart.lines().map(l => ({ snackId: l.snackId, qty: l.qty }))
    confirmedOrder.value = await orders.createOrder(lines)
    cart.clear()
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Gagal membuat pesanan'
  } finally {
    submitting.value = false
  }
}

function tryOpenGoPay() {
  gopayMsg.value = ''
  const hiddenAt = Date.now()
  window.location.href = 'gojek://gopay/home'
  setTimeout(() => {
    // Still here and page never lost focus → app likely isn't installed.
    if (document.visibilityState === 'visible' && Date.now() - hiddenAt > 1200) {
      gopayMsg.value = 'GoPay tidak ditemukan di perangkat ini.'
    }
  }, 1500)
}

function back() {
  if (confirmedOrder.value) router.push('/')
  else router.back()
}
</script>
