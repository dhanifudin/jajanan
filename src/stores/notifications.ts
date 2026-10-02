import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'

export interface NotifPrefs {
  id?: string
  user_id?: string
  stock_alerts_enabled: boolean
}

const DEFAULT_PREFS: NotifPrefs = { stock_alerts_enabled: true }

export const useNotificationsStore = defineStore('notifications', () => {
  const prefs = ref<NotifPrefs>({ ...DEFAULT_PREFS })
  const supported = ref('Notification' in window && 'PushManager' in window)
  const permission = ref<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )
  const subscribed = ref(false)

  async function fetchPrefs() {
    const auth = useAuthStore()
    const { data } = await supabase
      .from('notification_prefs')
      .select('*')
      .eq('user_id', auth.user?.id)
      .maybeSingle()
    if (data) prefs.value = data
  }

  async function savePrefs(p: Partial<NotifPrefs>) {
    prefs.value = { ...prefs.value, ...p }
    const auth = useAuthStore()
    await supabase
      .from('notification_prefs')
      .upsert({ ...prefs.value, user_id: auth.user?.id }, { onConflict: 'user_id' })
  }

  async function requestPermission(): Promise<boolean> {
    if (!supported.value) return false
    const result = await Notification.requestPermission()
    permission.value = result
    return result === 'granted'
  }

  async function subscribe() {
    if (!supported.value || permission.value !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const json = sub.toJSON()
    const auth = useAuthStore()

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: auth.user?.id,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    }, { onConflict: 'endpoint' })

    if (error) {
      await sub.unsubscribe()
      throw new Error(error.message)
    }

    subscribed.value = true
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      await sub.unsubscribe()
    }
    subscribed.value = false
  }

  async function checkSubscription() {
    if (!supported.value) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    subscribed.value = !!sub
  }

  return {
    prefs, supported, permission, subscribed,
    fetchPrefs, savePrefs, requestPermission, subscribe, unsubscribe, checkSubscription,
  }
})

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}
