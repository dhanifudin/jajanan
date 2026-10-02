<template>
  <div class="min-h-screen bg-cream pb-28">
    <PageHeader>
      <div class="flex items-center justify-between">
        <h1 class="font-display font-bold text-cocoa-700 text-xl">Admin · Pesanan</h1>
        <RouterLink to="/admin/snacks" class="text-sm font-semibold text-amber-600">Kelola Jajanan →</RouterLink>
      </div>
    </PageHeader>

    <div class="page pt-4 space-y-3">
      <div v-if="orders.loading" class="text-center py-10 text-4xl text-amber-300">🍡</div>

      <template v-else>
        <div v-for="o in orders.pendingOrders" :key="o.id" class="card space-y-2">
          <div class="flex items-center justify-between">
            <span class="badge bg-amber-100 text-amber-700">Menunggu bayar</span>
            <span class="font-bold text-amber-600">Rp{{ o.total_amount.toLocaleString('id-ID') }}</span>
          </div>
          <p class="text-xs text-cocoa-700/50">{{ new Date(o.created_at).toLocaleString('id-ID') }}</p>
          <ul class="text-sm text-cocoa-700/80 space-y-0.5">
            <li v-for="it in o.order_items" :key="it.id">{{ it.qty }}× {{ it.snack?.name ?? 'Jajanan' }}</li>
          </ul>
          <button @click="confirmPaid(o.id)" :disabled="markingId === o.id" class="btn-primary text-sm py-3">
            {{ markingId === o.id ? 'Memproses…' : '✓ Tandai Lunas' }}
          </button>
        </div>
        <p v-if="orders.pendingOrders.length === 0" class="text-center text-cocoa-700/50 py-10">
          Tidak ada pesanan menunggu.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useOrdersStore } from '@/stores/orders'
import PageHeader from '@/components/PageHeader.vue'

const orders = useOrdersStore()
const markingId = ref<string | null>(null)

onMounted(() => orders.fetchPending())

async function confirmPaid(id: string) {
  markingId.value = id
  try {
    await orders.markPaid(id)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Gagal menandai lunas')
  } finally {
    markingId.value = null
  }
}
</script>
