import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface StoreSettings {
  id: number
  merchant_name: string
  nmid: string | null
  qris_static_payload: string | null
}

export const useSettingsStore = defineStore('settings', () => {
  const storeSettings = ref<StoreSettings | null>(null)
  const loading = ref(false)

  async function fetchSettings() {
    loading.value = true
    const { data } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle()
    storeSettings.value = data
    loading.value = false
  }

  async function updateSettings(patch: Partial<StoreSettings>) {
    const { data, error } = await supabase
      .from('store_settings')
      .update(patch)
      .eq('id', 1)
      .select()
      .single()
    if (error) throw error
    storeSettings.value = data
  }

  return { storeSettings, loading, fetchSettings, updateSettings }
})
