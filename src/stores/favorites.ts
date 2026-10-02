import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'

export const useFavoritesStore = defineStore('favorites', () => {
  const snackIds = ref<Set<string>>(new Set())
  const loading = ref(false)

  async function fetchAll() {
    const auth = useAuthStore()
    if (!auth.user) return
    loading.value = true
    const { data } = await supabase
      .from('favorites')
      .select('snack_id')
      .eq('user_id', auth.user.id)
    snackIds.value = new Set((data ?? []).map((f: { snack_id: string }) => f.snack_id))
    loading.value = false
  }

  function isFavorite(snackId: string): boolean {
    return snackIds.value.has(snackId)
  }

  async function toggle(snackId: string) {
    const auth = useAuthStore()
    if (!auth.user) return
    const next = new Set(snackIds.value)
    if (next.has(snackId)) {
      next.delete(snackId)
      snackIds.value = next
      await supabase.from('favorites').delete().eq('user_id', auth.user.id).eq('snack_id', snackId)
    } else {
      next.add(snackId)
      snackIds.value = next
      await supabase.from('favorites').insert({ user_id: auth.user.id, snack_id: snackId })
    }
  }

  return { snackIds, loading, fetchAll, isFavorite, toggle }
})
