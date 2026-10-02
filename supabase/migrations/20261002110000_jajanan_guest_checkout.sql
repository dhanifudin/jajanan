-- ============================================================
-- Guest checkout: login becomes optional for buyers.
-- Catalog/settings readable by anon; orders can have user_id = null;
-- create_order() returns the full receipt directly (no follow-up
-- SELECT needed, so no anon SELECT policy on orders is ever required).
-- ============================================================

-- ── 1. Open catalog/settings reads to anon ──────────────────────────
drop policy "members read active snacks, admin reads all" on jajanan.snacks;
create policy "anyone reads active snacks, admin reads all"
  on jajanan.snacks for select
  using (active or jajanan.is_admin());

drop policy "members read price tiers" on jajanan.snack_price_tiers;
create policy "anyone reads price tiers"
  on jajanan.snack_price_tiers for select
  using (true);

drop policy "members read store settings" on jajanan.store_settings;
create policy "anyone reads store settings"
  on jajanan.store_settings for select
  using (true);

-- ── 2. orders.user_id becomes optional (guest orders) ───────────────
alter table jajanan.orders alter column user_id drop not null;
alter table jajanan.orders alter column user_id drop default;
alter table jajanan.orders drop column qris_payload;

-- ── 3. create_order(): guest-aware, member_only-gated, returns receipt ──
drop function jajanan.create_order(jsonb);

create function jajanan.create_order(p_items jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_order_id   uuid;
  v_user_id    uuid := auth.uid(); -- null for guests
  v_total      integer := 0;
  v_item       jsonb;
  v_snack_id   uuid;
  v_qty        integer;
  v_price      integer;
  v_line_total integer;
  v_order      jsonb;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'cart is empty';
  end if;

  insert into jajanan.orders (user_id, status, total_amount)
  values (v_user_id, 'pending', 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_snack_id := (v_item ->> 'snack_id')::uuid;
    v_qty      := (v_item ->> 'qty')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'invalid qty for snack %', v_snack_id;
    end if;

    -- cheapest eligible tier wins; member_only tiers only count for
    -- signed-in buyers, otherwise a guest could get member pricing free
    select unit_price into v_price
    from jajanan.snack_price_tiers
    where snack_id = v_snack_id
      and min_qty <= v_qty
      and (not member_only or v_user_id is not null)
    order by unit_price asc
    limit 1;

    if v_price is null then
      raise exception 'no price tier for snack %', v_snack_id;
    end if;

    v_line_total := v_price * v_qty;
    v_total := v_total + v_line_total;

    insert into jajanan.order_items (order_id, snack_id, qty, unit_price, line_total)
    values (v_order_id, v_snack_id, v_qty, v_price, v_line_total);
  end loop;

  update jajanan.orders set total_amount = v_total where id = v_order_id;

  select jsonb_build_object(
    'id', o.id,
    'user_id', o.user_id,
    'status', o.status,
    'total_amount', o.total_amount,
    'created_at', o.created_at,
    'paid_at', o.paid_at,
    'order_items', (
      select jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'snack_id', oi.snack_id,
        'qty', oi.qty,
        'unit_price', oi.unit_price,
        'line_total', oi.line_total,
        'snack', jsonb_build_object('name', s.name)
      ))
      from jajanan.order_items oi
      join jajanan.snacks s on s.id = oi.snack_id
      where oi.order_id = o.id
    )
  )
  into v_order
  from jajanan.orders o
  where o.id = v_order_id;

  return v_order;
end;
$$;

grant execute on function jajanan.create_order(jsonb) to anon, authenticated;
