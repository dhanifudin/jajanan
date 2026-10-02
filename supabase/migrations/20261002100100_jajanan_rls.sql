-- ============================================================
-- Migration 002: Row Level Security
-- Two tiers: any signed-in Google account (member) vs. admin allowlist.
-- schema-local: does NOT affect other projects on this instance
-- ============================================================

create or replace function jajanan.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select auth.jwt() ->> 'email' in ('ulfillah49@gmail.com', 'dhanifudin@gmail.com')
$$;

alter table jajanan.snacks             enable row level security;
alter table jajanan.snack_price_tiers  enable row level security;
alter table jajanan.favorites          enable row level security;
alter table jajanan.orders             enable row level security;
alter table jajanan.order_items        enable row level security;
alter table jajanan.push_subscriptions enable row level security;
alter table jajanan.notification_prefs enable row level security;
alter table jajanan.store_settings     enable row level security;

-- ---- snacks ----
create policy "members read active snacks, admin reads all"
  on jajanan.snacks for select
  using (auth.role() = 'authenticated' and (active or jajanan.is_admin()));

create policy "admin writes snacks"
  on jajanan.snacks for insert
  with check (jajanan.is_admin());
create policy "admin updates snacks"
  on jajanan.snacks for update
  using (jajanan.is_admin());
create policy "admin deletes snacks"
  on jajanan.snacks for delete
  using (jajanan.is_admin());

-- ---- snack_price_tiers ----
create policy "members read price tiers"
  on jajanan.snack_price_tiers for select
  using (auth.role() = 'authenticated');

create policy "admin writes price tiers"
  on jajanan.snack_price_tiers for insert
  with check (jajanan.is_admin());
create policy "admin updates price tiers"
  on jajanan.snack_price_tiers for update
  using (jajanan.is_admin());
create policy "admin deletes price tiers"
  on jajanan.snack_price_tiers for delete
  using (jajanan.is_admin());

-- ---- favorites (own rows only) ----
create policy "members manage own favorites"
  on jajanan.favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- orders ----
-- Writes only via jajanan.create_order() / jajanan.mark_order_paid()
-- (security definer, bypasses RLS) so totals/prices can't be forged client-side.
create policy "members read own orders, admin reads all"
  on jajanan.orders for select
  using (user_id = auth.uid() or jajanan.is_admin());

create policy "admin updates orders"
  on jajanan.orders for update
  using (jajanan.is_admin());

-- ---- order_items ----
create policy "members read own order items, admin reads all"
  on jajanan.order_items for select
  using (
    jajanan.is_admin()
    or exists (select 1 from jajanan.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ---- push_subscriptions (own row only) ----
create policy "members manage own push_subscriptions"
  on jajanan.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- notification_prefs (own row only) ----
create policy "members manage own notification_prefs"
  on jajanan.notification_prefs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- store_settings ----
create policy "members read store settings"
  on jajanan.store_settings for select
  using (auth.role() = 'authenticated');

create policy "admin updates store settings"
  on jajanan.store_settings for update
  using (jajanan.is_admin());
