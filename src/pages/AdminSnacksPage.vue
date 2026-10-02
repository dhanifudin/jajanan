<template>
  <div class="min-h-screen bg-cream pb-28">
    <PageHeader>
      <div class="flex items-center justify-between">
        <h1 class="font-display font-bold text-cocoa-700 text-xl">Admin · Jajanan</h1>
        <RouterLink to="/admin/orders" class="text-sm font-semibold text-amber-600">Pesanan →</RouterLink>
      </div>
    </PageHeader>

    <div class="page pt-4 space-y-5">

      <!-- Store / QRIS settings -->
      <div class="card space-y-3">
        <h3 class="font-display font-bold text-cocoa-700">Pengaturan QRIS</h3>
        <label class="block text-xs font-semibold text-cocoa-700/60">Nama merchant</label>
        <input v-model="merchantName" class="input" />
        <label class="block text-xs font-semibold text-cocoa-700/60">NMID</label>
        <input v-model="nmid" class="input" />
        <label class="block text-xs font-semibold text-cocoa-700/60">
          Payload QRIS statis (export/scan dari aplikasi e-wallet merchant)
        </label>
        <textarea v-model="qrisPayload" rows="3" class="input font-mono text-xs" placeholder="00020101021126..." />
        <button @click="saveSettings" :disabled="savingSettings" class="btn-secondary w-full justify-center">
          {{ savingSettings ? 'Menyimpan…' : 'Simpan Pengaturan' }}
        </button>
        <p v-if="settingsMsg" class="text-xs text-leaf-500 text-center">{{ settingsMsg }}</p>
      </div>

      <!-- Add snack -->
      <div class="card space-y-3">
        <h3 class="font-display font-bold text-cocoa-700">Tambah Jajanan</h3>
        <input v-model="newName" placeholder="Nama jajanan" class="input" />
        <input v-model="newDesc" placeholder="Deskripsi (opsional)" class="input" />
        <input v-model.number="newStock" type="number" min="0" placeholder="Stok awal" class="input" />
        <button @click="createSnack" :disabled="!newName" class="btn-primary">Tambah</button>
      </div>

      <!-- Snack list -->
      <div v-for="snack in catalog.snacks" :key="snack.id" class="card space-y-3">
        <div class="flex items-center justify-between gap-2">
          <input v-model="snack.name" @change="catalog.updateSnack(snack.id, { name: snack.name })"
                 class="input flex-1 font-semibold" />
          <button @click="removeSnack(snack.id)" class="text-xl text-red-400 min-w-[36px]">🗑️</button>
        </div>
        <input v-model="snack.description" @change="catalog.updateSnack(snack.id, { description: snack.description })"
               placeholder="Deskripsi" class="input text-sm" />

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <label class="text-xs font-semibold text-cocoa-700/60">Stok</label>
            <input v-model.number="snack.stock_quantity" type="number" min="0"
                   @change="catalog.updateSnack(snack.id, { stock_quantity: snack.stock_quantity })"
                   class="input w-20 py-2 text-sm" />
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="snack.active"
                   @change="catalog.updateSnack(snack.id, { active: snack.active })"
                   class="w-5 h-5 rounded accent-amber-500" />
            <span class="text-xs font-semibold text-cocoa-700/60">Aktif</span>
          </label>
        </div>

        <!-- Price tiers -->
        <div class="border-t border-amber-100 pt-3 space-y-2">
          <p class="text-xs font-semibold text-cocoa-700/60">Harga</p>
          <div v-for="tier in snack.price_tiers" :key="tier.id" class="flex items-center gap-2 text-sm">
            <span class="flex-1">
              Beli {{ tier.min_qty }}+ → Rp{{ tier.unit_price.toLocaleString('id-ID') }}
              <span v-if="tier.member_only" class="badge bg-amber-100 text-amber-700 ml-1 text-xs">member</span>
            </span>
            <button @click="catalog.deleteTier(snack.id, tier.id)" class="text-red-400 text-sm">✕</button>
          </div>

          <div class="flex items-end gap-2 flex-wrap">
            <div>
              <label class="block text-[10px] text-cocoa-700/50">Min qty</label>
              <input v-model.number="tierForms[snack.id].min_qty" type="number" min="1" class="input w-16 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-[10px] text-cocoa-700/50">Harga/unit</label>
              <input v-model.number="tierForms[snack.id].unit_price" type="number" min="1" class="input w-24 py-2 text-sm" />
            </div>
            <label class="flex items-center gap-1 text-xs pb-2">
              <input type="checkbox" v-model="tierForms[snack.id].member_only" class="w-4 h-4 accent-amber-500" />
              member
            </label>
            <button @click="addTier(snack.id)" class="stepper-btn w-9 h-9 text-base">＋</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useCatalogStore } from '@/stores/catalog'
import { useSettingsStore } from '@/stores/settings'
import PageHeader from '@/components/PageHeader.vue'

const catalog = useCatalogStore()
const settings = useSettingsStore()

const newName = ref('')
const newDesc = ref('')
const newStock = ref(0)

const merchantName = ref('')
const nmid = ref('')
const qrisPayload = ref('')
const savingSettings = ref(false)
const settingsMsg = ref('')

const tierForms = reactive<Record<string, { min_qty: number; unit_price: number; member_only: boolean }>>({})

watch(() => catalog.snacks, (list) => {
  for (const s of list) {
    if (!tierForms[s.id]) tierForms[s.id] = { min_qty: 1, unit_price: 0, member_only: false }
  }
}, { immediate: true, deep: false })

onMounted(async () => {
  await catalog.fetchAll()
  await settings.fetchSettings()
  if (settings.storeSettings) {
    merchantName.value = settings.storeSettings.merchant_name
    nmid.value = settings.storeSettings.nmid ?? ''
    qrisPayload.value = settings.storeSettings.qris_static_payload ?? ''
  }
})

async function createSnack() {
  if (!newName.value) return
  await catalog.addSnack({ name: newName.value, description: newDesc.value || undefined, stock_quantity: newStock.value || 0 })
  newName.value = ''
  newDesc.value = ''
  newStock.value = 0
}

async function removeSnack(id: string) {
  if (!confirm('Hapus jajanan ini?')) return
  await catalog.deleteSnack(id)
}

async function addTier(snackId: string) {
  const form = tierForms[snackId]
  if (!form.min_qty || !form.unit_price) return
  await catalog.addTier(snackId, { ...form })
  tierForms[snackId] = { min_qty: 1, unit_price: 0, member_only: false }
}

async function saveSettings() {
  savingSettings.value = true
  settingsMsg.value = ''
  try {
    await settings.updateSettings({
      merchant_name: merchantName.value,
      nmid: nmid.value,
      qris_static_payload: qrisPayload.value,
    })
    settingsMsg.value = 'Tersimpan ✓'
    setTimeout(() => { settingsMsg.value = '' }, 2500)
  } finally {
    savingSettings.value = false
  }
}
</script>
