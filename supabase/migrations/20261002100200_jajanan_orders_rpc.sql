-- ============================================================
-- Migration 003: Order RPCs
-- Prices/totals are always computed server-side here — never trust a
-- client-submitted amount, since that amount is what gets embedded in
-- the QRIS payment QR.
-- ============================================================

create or replace function jajanan.create_order(p_items jsonb)
returns uuid
language plpgsql
security definer
as $$
declare
  v_order_id   uuid;
  v_total      integer := 0;
  v_item       jsonb;
  v_snack_id   uuid;
  v_qty        integer;
  v_price      integer;
  v_line_total integer;
begin
  if auth.uid() is null then
    raise exception 'sign in required';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'cart is empty';
  end if;

  insert into jajanan.orders (user_id, status, total_amount)
  values (auth.uid(), 'pending', 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_snack_id := (v_item ->> 'snack_id')::uuid;
    v_qty      := (v_item ->> 'qty')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'invalid qty for snack %', v_snack_id;
    end if;

    -- cheapest eligible tier wins — covers both qty-break pricing
    -- (buy 3 = Rp1.500) and member pricing (lower min_qty=1 tier)
    select unit_price into v_price
    from jajanan.snack_price_tiers
    where snack_id = v_snack_id and min_qty <= v_qty
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

  return v_order_id;
end;
$$;

grant execute on function jajanan.create_order(jsonb) to authenticated;

-- ============================================================
-- mark_order_paid — admin-only. Atomically flips the order to paid and
-- decrements stock; the snacks.stock_quantity >= 0 CHECK constraint
-- aborts (rolls back) the whole transaction on oversell.
-- ============================================================
create or replace function jajanan.mark_order_paid(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not jajanan.is_admin() then
    raise exception 'not authorized';
  end if;

  update jajanan.orders
  set status = 'paid', paid_at = now()
  where id = p_order_id and status = 'pending';

  if not found then
    raise exception 'order not found or not pending';
  end if;

  update jajanan.snacks s
  set stock_quantity = s.stock_quantity - oi.qty
  from jajanan.order_items oi
  where oi.order_id = p_order_id and oi.snack_id = s.id;
end;
$$;

grant execute on function jajanan.mark_order_paid(uuid) to authenticated;
