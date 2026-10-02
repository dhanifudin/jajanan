import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface PriceTier {
  id: string
  snack_id: string
  min_qty: number
  unit_price: number
  member_only: boolean
}

export interface Snack {
  id: string
  name: string
  description: string | null
  image_url: string | null
  stock_quantity: number
  active: boolean
  sort_order: number
  price_tiers: PriceTier[]
}

export const useCatalogStore = defineStore('catalog', () => {
  const snacks = ref<Snack[]>([])
  const loading = ref(false)

  async function fetchAll() {
    loading.value = true
    const { data } = await supabase
      .from('snacks')
      .select('*, price_tiers:snack_price_tiers(*)')
      .order('sort_order')
    if (data) snacks.value = data as Snack[]
    loading.value = false
  }

  /**
   * Cheapest unit price for `qty` units — mirrors jajanan.create_order()'s
   * tier pick. `isMember` must match the buyer's actual login state: the
   * RPC excludes member_only tiers for guests, so showing one here to a
   * guest would display a price the server then refuses to charge.
   */
  function priceForQty(snack: Snack, qty: number, isMember: boolean): number | null {
    const eligible = snack.price_tiers.filter(t => t.min_qty <= qty && (!t.member_only || isMember))
    if (eligible.length === 0) return null
    return Math.min(...eligible.map(t => t.unit_price))
  }

  /** Cheapest listed single-unit price, for the catalog card. */
  function startingPrice(snack: Snack, isMember: boolean): number | null {
    return priceForQty(snack, 1, isMember)
  }

  // ── Admin mutations ──────────────────────────────────────────────────

  async function addSnack(input: { name: string; description?: string; stock_quantity: number }) {
    const maxOrder = snacks.value.reduce((m, s) => Math.max(m, s.sort_order), 0)
    const { data, error } = await supabase
      .from('snacks')
      .insert({ ...input, sort_order: maxOrder + 1 })
      .select('*, price_tiers:snack_price_tiers(*)')
      .single()
    if (error) throw error
    snacks.value.push(data as Snack)
    return data as Snack
  }

  async function updateSnack(id: string, patch: Partial<Pick<Snack, 'name' | 'description' | 'stock_quantity' | 'active' | 'image_url'>>) {
    const { error } = await supabase.from('snacks').update(patch).eq('id', id)
    if (error) throw error
    const snack = snacks.value.find(s => s.id === id)
    if (snack) Object.assign(snack, patch)
  }

  async function deleteSnack(id: string) {
    const { error } = await supabase.from('snacks').delete().eq('id', id)
    if (error) throw error
    snacks.value = snacks.value.filter(s => s.id !== id)
  }

  async function addTier(snackId: string, input: { min_qty: number; unit_price: number; member_only: boolean }) {
    const { data, error } = await supabase
      .from('snack_price_tiers')
      .insert({ snack_id: snackId, ...input })
      .select()
      .single()
    if (error) throw error
    const snack = snacks.value.find(s => s.id === snackId)
    if (snack) snack.price_tiers.push(data as PriceTier)
  }

  async function deleteTier(snackId: string, tierId: string) {
    const { error } = await supabase.from('snack_price_tiers').delete().eq('id', tierId)
    if (error) throw error
    const snack = snacks.value.find(s => s.id === snackId)
    if (snack) snack.price_tiers = snack.price_tiers.filter(t => t.id !== tierId)
  }

  return {
    snacks, loading, fetchAll, priceForQty, startingPrice,
    addSnack, updateSnack, deleteSnack, addTier, deleteTier,
  }
})
