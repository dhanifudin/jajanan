import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useCatalogStore } from './catalog'
import { useAuthStore } from './auth'

const STORAGE_KEY = 'jajanan-cart'

export const useCartStore = defineStore('cart', () => {
  const items = ref<Record<string, number>>({}) // snack_id -> qty

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) items.value = JSON.parse(saved)
  } catch { /* ignore corrupt/unavailable storage */ }

  watch(items, (val) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)) } catch { /* ignore */ }
  }, { deep: true })

  const itemCount = computed(() =>
    Object.values(items.value).reduce((s, qty) => s + qty, 0)
  )

  function setQty(snackId: string, qty: number) {
    if (qty <= 0) {
      delete items.value[snackId]
      items.value = { ...items.value }
    } else {
      items.value = { ...items.value, [snackId]: qty }
    }
  }

  function qtyOf(snackId: string): number {
    return items.value[snackId] ?? 0
  }

  function increment(snackId: string) {
    setQty(snackId, qtyOf(snackId) + 1)
  }

  function decrement(snackId: string) {
    setQty(snackId, qtyOf(snackId) - 1)
  }

  function clear() {
    items.value = {}
  }

  /**
   * Line totals using current catalog prices (cheapest eligible tier,
   * excluding member_only tiers for guests — matches what create_order()
   * actually charges).
   */
  function lines() {
    const catalog = useCatalogStore()
    const auth = useAuthStore()
    return Object.entries(items.value).map(([snackId, qty]) => {
      const snack = catalog.snacks.find(s => s.id === snackId)
      const unitPrice = snack ? catalog.priceForQty(snack, qty, auth.isLoggedIn) : null
      return { snackId, snack, qty, unitPrice, lineTotal: unitPrice != null ? unitPrice * qty : null }
    }).filter(l => l.snack)
  }

  const total = computed(() =>
    lines().reduce((s, l) => s + (l.lineTotal ?? 0), 0)
  )

  return { items, itemCount, total, setQty, qtyOf, increment, decrement, clear, lines }
})
