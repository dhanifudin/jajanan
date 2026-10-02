-- ============================================================
-- Migration 005: Sample seed data (safe to edit/delete from the admin UI)
-- ============================================================

update jajanan.store_settings set nmid = 'ID1026600772887' where id = 1;

do $$
declare
  v_teh_id uuid;
  v_keripik_id uuid;
begin
  insert into jajanan.snacks (name, description, stock_quantity, sort_order)
  values ('Teh Upi', 'Teh manis dingin segar', 20, 1)
  returning id into v_teh_id;

  insert into jajanan.snack_price_tiers (snack_id, min_qty, unit_price, member_only) values
    (v_teh_id, 1, 3000, false),
    (v_teh_id, 1, 2500, true),
    (v_teh_id, 3, 2000, false);

  insert into jajanan.snacks (name, description, stock_quantity, sort_order)
  values ('Keripik Pedas', 'Keripik singkong pedas renyah', 15, 2)
  returning id into v_keripik_id;

  insert into jajanan.snack_price_tiers (snack_id, min_qty, unit_price, member_only) values
    (v_keripik_id, 1, 5000, false),
    (v_keripik_id, 1, 4500, true);
end $$;
