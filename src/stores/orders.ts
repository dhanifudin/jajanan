import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { toDynamicQris } from '@/lib/qris'
import { useSettingsStore } from './settings'

export interface OrderItem {
  id: string
  snack_id: string
  qty: number
  unit_price: number
  line_total: number
  snack?: { name: string } | null
}

export interface Order {
  id: string
  user_id: string
  status: 'pending' | 'paid' | 'cancelled'
  total_amount: number
  qris_payload: string | null
  created_at: string
  paid_at: string | null
  order_items: OrderItem[]
}

export const useOrdersStore = defineStore('orders', () => {
  const myOrders = ref<Order[]>([])
  const pendingOrders = ref<Order[]>([]) // admin queue
  const loading = ref(false)

  async function createOrder(cartLines: { snackId: string; qty: number }[]): Promise<Order> {
    const { data: orderId, error } = await supabase.rpc('create_order', {
      p_items: cartLines.map(l => ({ snack_id: l.snackId, qty: l.qty })),
    })
    if (error) throw error

    const settings = useSettingsStore()
    if (!settings.storeSettings) await settings.fetchSettings()
    const staticPayload = settings.storeSettings?.qris_static_payload

    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*, order_items(*, snack:snacks(name))')
      .eq('id', orderId)
      .single()
    if (fetchErr) throw fetchErr

    let qrisPayload: string | null = null
    if (staticPayload) {
      qrisPayload = toDynamicQris(staticPayload, order.total_amount)
      await supabase.from('orders').update({ qris_payload: qrisPayload }).eq('id', orderId)
    }

    return { ...order, qris_payload: qrisPayload } as Order
  }

  async function fetchMine() {
    loading.value = true
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, snack:snacks(name))')
      .order('created_at', { ascending: false })
    if (data) myOrders.value = data as Order[]
    loading.value = false
  }

  async function fetchPending() {
    loading.value = true
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, snack:snacks(name))')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (data) pendingOrders.value = data as Order[]
    loading.value = false
  }

  async function markPaid(orderId: string) {
    const { error } = await supabase.rpc('mark_order_paid', { p_order_id: orderId })
    if (error) throw error
    pendingOrders.value = pendingOrders.value.filter(o => o.id !== orderId)
  }

  return { myOrders, pendingOrders, loading, createOrder, fetchMine, fetchPending, markPaid }
})
