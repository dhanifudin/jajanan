-- ============================================================
-- Migration 006: Notify members who favorited a snack when its stock
-- crosses sold-out (-> 0) or restocked (0 -> some). Fires the
-- notify-favorite-stock Edge Function via pg_net (async, non-blocking).
--
-- One-time manual setup required after this migration runs (same pattern
-- as lulu's send-reminders cron — see README "Push notifications" step):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>',                'service_role_key');
-- Until those secrets exist the trigger silently no-ops (net.http_post
-- is skipped) rather than breaking stock updates.
-- ============================================================

create extension if not exists pg_net with schema extensions;

create or replace function jajanan.notify_favorite_stock_change()
returns trigger
language plpgsql
security definer
as $$
declare
  v_project_url text;
  v_service_key text;
  v_event text;
begin
  if old.stock_quantity = new.stock_quantity then
    return new;
  end if;

  if old.stock_quantity > 0 and new.stock_quantity = 0 then
    v_event := 'sold_out';
  elsif old.stock_quantity = 0 and new.stock_quantity > 0 then
    v_event := 'restocked';
  else
    return new;
  end if;

  select decrypted_secret into v_project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_service_key from vault.decrypted_secrets where name = 'service_role_key';

  if v_project_url is null or v_service_key is null then
    return new; -- secrets not configured yet — no-op
  end if;

  perform net.http_post(
    url     := v_project_url || '/functions/v1/notify-favorite-stock',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_service_key
               ),
    body    := jsonb_build_object('snack_id', new.id, 'event', v_event)
  );

  return new;
end;
$$;

create trigger trg_notify_favorite_stock_change
  after update on jajanan.snacks
  for each row
  execute function jajanan.notify_favorite_stock_change();
