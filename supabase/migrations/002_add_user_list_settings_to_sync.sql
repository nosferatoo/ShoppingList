-- Migration: Add user_list_settings to get_changes_since function
-- Date: 2025-12-02
-- Description: Updates the get_changes_since RPC function to include user_list_settings
--              changes so that list order changes are properly synced to clients.

create or replace function public.get_changes_since(last_sync timestamptz)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'lists', (
      select coalesce(json_agg(row_to_json(l)), '[]'::json)
      from public.lists l
      where l.updated_at > last_sync
      and (
        l.owner_id = auth.uid()
        or (
          l.is_shared = true
          and exists (
            select 1 from public.list_shares ls
            where ls.list_id = l.id
            and ls.user_id = auth.uid()
          )
        )
      )
    ),
    'items', (
      select coalesce(json_agg(row_to_json(i)), '[]'::json)
      from public.items i
      inner join public.lists l on l.id = i.list_id
      where i.updated_at > last_sync
      and (
        l.owner_id = auth.uid()
        or (
          l.is_shared = true
          and exists (
            select 1 from public.list_shares ls
            where ls.list_id = l.id
            and ls.user_id = auth.uid()
          )
        )
      )
    ),
    'user_list_settings', (
      select coalesce(json_agg(row_to_json(uls)), '[]'::json)
      from public.user_list_settings uls
      where uls.updated_at > last_sync
      and uls.user_id = auth.uid()
    ),
    'server_time', now()
  )
  into result;

  return result;
end;
$$ language plpgsql security definer;
