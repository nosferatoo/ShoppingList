-- Migration: Auto-manage list_shares when is_shared changes
-- This trigger ensures that when a list is marked as shared, all other users
-- are automatically added to list_shares. When unmarked, they are removed.

-- Drop existing trigger and function if they exist
drop trigger if exists manage_list_shares_on_update on public.lists;
drop function if exists public.manage_list_shares();

-- Function to automatically manage list_shares entries
create or replace function public.manage_list_shares()
returns trigger as $$
begin
  -- If is_shared changed from false to true, add all other users
  if NEW.is_shared = true and (OLD.is_shared = false or OLD.is_shared is null) then
    -- Add all users except the owner to list_shares
    insert into public.list_shares (list_id, user_id, created_at)
    select NEW.id, users.id, now()
    from auth.users
    where users.id != NEW.owner_id
    on conflict (list_id, user_id) do nothing; -- Avoid duplicates

  -- If is_shared changed from true to false, remove all shares
  elsif NEW.is_shared = false and OLD.is_shared = true then
    delete from public.list_shares
    where list_id = NEW.id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger on lists table
create trigger manage_list_shares_on_update
  after update of is_shared on public.lists
  for each row
  execute function public.manage_list_shares();

-- Backfill: Add shares for existing shared lists
insert into public.list_shares (list_id, user_id, created_at)
select l.id, u.id, now()
from public.lists l
cross join auth.users u
where l.is_shared = true
  and l.deleted_at is null
  and u.id != l.owner_id
on conflict (list_id, user_id) do nothing;
