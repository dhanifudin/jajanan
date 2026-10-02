-- ============================================================
-- Migration 001: Create jajanan schema and all tables
-- Runs on the shared Supabase instance; isolated from public.*
-- ============================================================

create schema if not exists jajanan;

grant usage on schema jajanan to anon, authenticated;
alter default privileges in schema jajanan grant all on tables to anon, authenticated;
alter default privileges in schema jajanan grant all on sequences to anon, authenticated;
alter default privileges in schema jajanan grant all on functions to anon, authenticated;

-- ============================================================
-- snacks — catalog
-- ============================================================
create table jajanan.snacks (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  image_url       text,
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  active          boolean not null default true,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- snack_price_tiers — qty-break and member pricing
-- Buyer always gets the cheapest tier whose min_qty <= cart qty.
-- member_only tiers (e.g. min_qty 1, lower price) are only reachable by
-- signed-in buyers, since checkout requires sign-in in this app — see
-- jajanan.create_order() in 003_orders_rpc.sql.
-- ============================================================
create table jajanan.snack_price_tiers (
  id           uuid primary key default gen_random_uuid(),
  snack_id     uuid not null references jajanan.snacks(id) on delete cascade,
  min_qty      integer not null check (min_qty > 0),
  unit_price   integer not null check (unit_price > 0),
  member_only  boolean not null default false,
  unique (snack_id, min_qty, member_only)
);
create index on jajanan.snack_price_tiers (snack_id);

-- ============================================================
-- favorites
-- ============================================================
create table jajanan.favorites (
  user_id     uuid not null references auth.users(id) on delete cascade,
  snack_id    uuid not null references jajanan.snacks(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, snack_id)
);

-- ============================================================
-- orders / order_items
-- ============================================================
create table jajanan.orders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  total_amount  integer not null default 0 check (total_amount >= 0),
  qris_payload  text,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);
create index on jajanan.orders (user_id, created_at desc);
create index on jajanan.orders (status, created_at desc);

create table jajanan.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references jajanan.orders(id) on delete cascade,
  snack_id    uuid not null references jajanan.snacks(id),
  qty         integer not null check (qty > 0),
  unit_price  integer not null check (unit_price >= 0),
  line_total  integer not null check (line_total >= 0)
);
create index on jajanan.order_items (order_id);

-- ============================================================
-- push_subscriptions / notification_prefs
-- ============================================================
create table jajanan.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create table jajanan.notification_prefs (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users(id) on delete cascade,
  stock_alerts_enabled   boolean not null default true
);

-- ============================================================
-- store_settings — singleton row (admin-managed QRIS payload)
-- ============================================================
create table jajanan.store_settings (
  id                    smallint primary key default 1 check (id = 1),
  merchant_name         text not null default 'Jajanan Teh Upi',
  nmid                  text,
  qris_static_payload   text
);
insert into jajanan.store_settings (id) values (1);
