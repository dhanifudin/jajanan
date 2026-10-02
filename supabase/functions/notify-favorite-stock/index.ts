/**
 * Supabase Edge Function: notify-favorite-stock
 *
 * Called by the jajanan.notify_favorite_stock_change() DB trigger (via
 * pg_net) whenever a snack's stock crosses sold-out or restocked.
 * Push-notifies every member who favorited that snack.
 *
 * Body: { snack_id: string, event: 'sold_out' | 'restocked' }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL = 'mailto:dhanifudin@gmail.com'

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const { snack_id, event } = await req.json()
  if (!snack_id || !event) {
    return new Response(JSON.stringify({ error: 'snack_id and event required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'jajanan' } })

  const { data: snack } = await supabase.from('snacks').select('name').eq('id', snack_id).maybeSingle()
  const snackName = snack?.name ?? 'Jajanan favoritmu'

  const { data: favorites } = await supabase.from('favorites').select('user_id').eq('snack_id', snack_id)
  const userIds = (favorites ?? []).map((f: { user_id: string }) => f.user_id)
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no favorites' }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const { data: prefs } = await supabase
    .from('notification_prefs')
    .select('user_id, stock_alerts_enabled')
    .in('user_id', userIds)
  const prefsMap = new Map((prefs ?? []).map((p: { user_id: string; stock_alerts_enabled: boolean }) => [p.user_id, p.stock_alerts_enabled]))
  const enabledUserIds = userIds.filter((id: string) => prefsMap.get(id) ?? true)

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', enabledUserIds.length ? enabledUserIds : ['00000000-0000-0000-0000-000000000000'])

  const title = event === 'sold_out' ? `😢 ${snackName} habis` : `🎉 ${snackName} ada lagi!`
  const body = event === 'sold_out'
    ? 'Stok favoritmu baru saja habis.'
    : 'Favoritmu baru saja direstock, yuk jajan!'

  const payload = JSON.stringify({ title, body, icon: '/icon-192.png', badge: '/icon-192.png', url: '/', tag: `jajanan-${event}-${snack_id}` })

  const staleIds: string[] = []
  let sent = 0
  for (const sub of (subs ?? [])) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 3600 }
      )
      sent++
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) staleIds.push(sub.id)
    }
  }
  if (staleIds.length) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }

  return new Response(JSON.stringify({ sent, subsFound: subs?.length ?? 0, stale: staleIds.length }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
})
