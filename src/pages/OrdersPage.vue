<template>
  <div class="min-h-screen bg-cream pb-28">
    <PageHeader><h1 class="font-display font-bold text-cocoa-700 text-xl">Pesanan Saya</h1></PageHeader>

    <div class="page pt-4 space-y-3">
      <div v-if="orders.loading" class="text-center py-10 text-4xl text-amber-300">🍡</div>

      <template v-else>
        <div v-for="o in orders.myOrders" :key="o.id" class="card space-y-2">
          <div class="flex items-center justify-between">
            <span class="badge" :class="statusClass(o.status)">{{ statusLabel(o.status) }}</span>
            <span class="font-bold text-amber-600">Rp{{ o.total_amount.toLocaleString('id-ID') }}</span>
          </div>
          <p class="text-xs text-cocoa-700/50">
            {{ new Date(o.created_at).toLocaleString('id-ID') }}
          </p>
          <ul class="text-sm text-cocoa-700/80 space-y-0.5">
            <li v-for="it in o.order_items" :key="it.id">
              {{ it.qty }}× {{ it.snack?.name ?? 'Jajanan' }}
            </li>
          </ul>
        </div>
        <p v-if="orders.myOrders.length === 0" class="text-center text-cocoa-700/50 py-10">
          Belum ada pesanan.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import PageHeader from '@/components/PageHeader.vue'

const orders = useOrdersStore()

function statusLabel(s: string) {
  return { pending: 'Menunggu bayar', paid: 'Lunas', cancelled: 'Dibatalkan' }[s] ?? s
}
function statusClass(s: string) {
  return {
    pending: 'bg-amber-100 text-amber-700',
    paid: 'bg-leaf-100 text-leaf-500',
    cancelled: 'bg-red-100 text-red-500',
  }[s] ?? ''
}

onMounted(() => orders.fetchMine())
</script>
