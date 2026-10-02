import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

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
  user_id: string | null // null for guest checkouts
  status: 'pending' | 'paid' | 'cancelled'
  total_amount: number
  created_at: string
  paid_at: string | null
  order_items: OrderItem[]
}

export const useOrdersStore = defineStore('orders', () => {
  const myOrders = ref<Order[]>([])
  const pendingOrders = ref<Order[]>([]) // admin queue
  const loading = ref(false)

  /**
   * jajanan.create_order() returns the full receipt as jsonb directly —
   * no follow-up select/update needed, so guest checkout never requires
   * an anon RLS read policy on orders/order_items.
   */
  async function createOrder(cartLines: { snackId: string; qty: number }[]): Promise<Order> {
    const { data, error } = await supabase.rpc('create_order', {
      p_items: cartLines.map(l => ({ snack_id: l.snackId, qty: l.qty })),
    })
    if (error) throw error
    return data as Order
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
