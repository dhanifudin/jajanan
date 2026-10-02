<template>
  <div class="min-h-screen bg-cream pb-28">
    <PageHeader><h1 class="font-display font-bold text-cocoa-700 text-xl">Favorit</h1></PageHeader>

    <div class="page pt-4 space-y-3">
      <div v-if="catalog.loading" class="text-center py-10 text-4xl text-amber-300">🍡</div>

      <template v-else>
        <SnackCard v-for="snack in favoriteSnacks" :key="snack.id" :snack="snack" />
        <p v-if="favoriteSnacks.length === 0" class="text-center text-cocoa-700/50 py-10">
          Belum ada favorit. Tap ☆ di daftar jajanan untuk menandai favorit, dan dapatkan notifikasi saat stoknya berubah.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { useFavoritesStore } from '@/stores/favorites'
import PageHeader from '@/components/PageHeader.vue'
import SnackCard from '@/components/SnackCard.vue'

const catalog = useCatalogStore()
const favorites = useFavoritesStore()

const favoriteSnacks = computed(() => catalog.snacks.filter(s => favorites.isFavorite(s.id)))

onMounted(async () => {
  if (catalog.snacks.length === 0) await catalog.fetchAll()
  await favorites.fetchAll()
})
</script>
