<template>
  <div class="card flex gap-3" :class="{ 'opacity-50': snack.stock_quantity === 0 }">
    <div class="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
      <img v-if="snack.image_url" :src="snack.image_url" class="w-full h-full object-cover" />
      <span v-else>🍡</span>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="font-semibold text-cocoa-700 truncate">{{ snack.name }}</p>
          <p v-if="snack.description" class="text-xs text-cocoa-700/60 truncate">{{ snack.description }}</p>
        </div>
        <button v-if="auth.isLoggedIn" @click="favorites.toggle(snack.id)"
                class="text-xl flex-shrink-0 min-w-[32px] min-h-[32px] active:scale-90 transition-transform">
          {{ favorites.isFavorite(snack.id) ? '⭐' : '☆' }}
        </button>
      </div>

      <div class="flex items-center justify-between mt-2">
        <div>
          <p v-if="startingPrice != null" class="text-sm font-bold text-amber-600">
            Rp{{ startingPrice.toLocaleString('id-ID') }}
          </p>
          <p v-if="snack.stock_quantity === 0" class="text-xs text-red-500 font-semibold">Habis</p>
          <p v-else class="text-xs text-cocoa-700/50">Stok {{ snack.stock_quantity }}</p>
        </div>

        <div v-if="snack.stock_quantity > 0" class="flex items-center gap-2">
          <button v-if="qty > 0" @click="cart.decrement(snack.id)" class="stepper-btn w-9 h-9 text-base">−</button>
          <span v-if="qty > 0" class="font-bold text-cocoa-700 w-5 text-center">{{ qty }}</span>
          <button @click="addOne" class="stepper-btn w-9 h-9 text-base">＋</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Snack } from '@/stores/catalog'
import { useCatalogStore } from '@/stores/catalog'
import { useCartStore } from '@/stores/cart'
import { useFavoritesStore } from '@/stores/favorites'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ snack: Snack }>()

const catalog = useCatalogStore()
const cart = useCartStore()
const favorites = useFavoritesStore()
const auth = useAuthStore()

const qty = computed(() => cart.qtyOf(props.snack.id))
const startingPrice = computed(() => catalog.startingPrice(props.snack, auth.isLoggedIn))

function addOne() {
  if (cart.qtyOf(props.snack.id) >= props.snack.stock_quantity) return
  cart.increment(props.snack.id)
}
</script>
