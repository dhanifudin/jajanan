<template>
  <div class="min-h-screen pb-28">
    <PageHeader>
      <div v-if="auth.isLoggedIn" class="flex items-center gap-3">
        <img v-if="auth.userAvatar" :src="auth.userAvatar" class="w-10 h-10 rounded-full border-2 border-amber-300 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-cocoa-700/60">Halo,</p>
          <h1 class="font-display font-bold text-cocoa-700 text-xl leading-tight truncate">{{ firstName }}</h1>
        </div>
        <button @click="auth.signOut()"
                class="text-xs font-semibold bg-white/60 hover:bg-amber-50 text-cocoa-700/50
                       hover:text-amber-600 rounded-xl px-3 min-h-[40px] transition-all active:scale-95 border border-amber-100">
          Keluar
        </button>
      </div>

      <div v-else class="flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <h1 class="font-display font-bold text-cocoa-700 text-xl leading-tight">🍡 Jajanan</h1>
          <p class="text-xs text-cocoa-700/60">Jajanan Teh Upi</p>
        </div>
        <RouterLink to="/login"
                    class="text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-700
                           rounded-xl px-3 min-h-[40px] flex items-center transition-all active:scale-95">
          Masuk
        </RouterLink>
      </div>
    </PageHeader>

    <div class="page pt-4 space-y-3">
      <div v-if="catalog.loading" class="text-center py-10 text-4xl text-amber-300">🍡</div>

      <template v-else>
        <SnackCard v-for="snack in catalog.snacks" :key="snack.id" :snack="snack" />
        <p v-if="catalog.snacks.length === 0" class="text-center text-cocoa-700/50 py-10">
          Belum ada jajanan.
        </p>
      </template>
    </div>

    <!-- Floating cart bar -->
    <div v-if="cart.itemCount > 0"
         class="fixed left-0 right-0 z-40 px-3"
         style="bottom: calc(env(safe-area-inset-bottom, 0px) + 100px)">
      <RouterLink to="/checkout"
                  class="max-w-lg mx-auto flex items-center justify-between gap-3 bg-amber-500 hover:bg-amber-600
                         text-white rounded-3xl shadow-snack-lg px-5 py-4 transition-all active:scale-95">
        <span class="font-display font-bold">{{ cart.itemCount }} item · Rp{{ cart.total.toLocaleString('id-ID') }}</span>
        <span class="font-semibold">Pesan →</span>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useCartStore } from '@/stores/cart'
import { useFavoritesStore } from '@/stores/favorites'
import PageHeader from '@/components/PageHeader.vue'
import SnackCard from '@/components/SnackCard.vue'

const auth = useAuthStore()
const catalog = useCatalogStore()
const cart = useCartStore()
const favorites = useFavoritesStore()

const firstName = computed(() => auth.userName.split(' ')[0])

onMounted(() => {
  catalog.fetchAll()
  favorites.fetchAll()
})
</script>
