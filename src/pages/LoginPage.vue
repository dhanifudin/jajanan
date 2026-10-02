<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-sm">
      <div class="card text-center shadow-snack-lg">
        <div class="text-7xl mb-3 animate-pop">🍡</div>
        <h1 class="font-display font-bold text-amber-600 text-3xl mb-1">Jajanan</h1>
        <p class="text-cocoa-700/60 text-sm mb-8">Jajanan Teh Upi</p>

        <div class="flex justify-center gap-3 text-2xl mb-8 select-none">
          🍪 🍬 🥤 🍫 🍡
        </div>

        <button @click="signIn" :disabled="loading" class="btn-primary">
          <svg v-if="!loading" class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span v-if="loading" class="text-xl">🍡</span>
          {{ loading ? 'Menghubungkan…' : 'Masuk dengan Google' }}
        </button>

        <p class="text-xs text-cocoa-700/40 mt-4">
          Masuk untuk simpan favorit &amp; dapat notifikasi stok
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loading = ref(false)

async function signIn() {
  loading.value = true
  try {
    await auth.signInWithGoogle()
  } catch {
    loading.value = false
  }
}
</script>
