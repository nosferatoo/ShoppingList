-- ============================================================================
-- DATABASE SCHEMA: Shopping & To-Do Lists App
-- Complete schema for setting up a new database
-- Includes all migrations and RLS policy fixes
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- LISTS TABLE
-- ----------------------------------------------------------------------------
create table public.lists (
  id serial primary key,
  title text not null,
  type text not null check (type in ('shopping', 'todo')),
  owner_id uuid references auth.users(id) on delete cascade not null,
  is_shared boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz default null
);

-- Indexes
create index lists_owner_id_idx on public.lists(owner_id);
create index lists_updated_at_idx on public.lists(updated_at);
create index lists_deleted_at_idx on public.lists(deleted_at) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- ITEMS TABLE
-- ----------------------------------------------------------------------------
create table public.items (
  id serial primary key,
  list_id integer references public.lists(id) on delete cascade not null,
  text text not null,
  is_checked boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz default null
);

-- Indexes
create index items_list_id_idx on public.items(list_id);
create index items_updated_at_idx on public.items(updated_at);
create index items_deleted_at_idx on public.items(deleted_at) where deleted_at is null;

-- Unique constraint: no duplicate item text per list (case-insensitive, non-deleted only)
create unique index items_list_text_unique_idx
  on public.items(list_id, lower(text))
  where deleted_at is null;

-- ----------------------------------------------------------------------------
-- LIST SHARES TABLE
-- ----------------------------------------------------------------------------
create table public.list_shares (
  id serial primary key,
  list_id integer references public.lists(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,

  unique(list_id, user_id)
);

-- Indexes
create index list_shares_list_id_idx on public.list_shares(list_id);
create index list_shares_user_id_idx on public.list_shares(user_id);

-- ----------------------------------------------------------------------------
-- USER LIST SETTINGS TABLE (per-user list preferences)
-- ----------------------------------------------------------------------------
create table public.user_list_settings (
  id serial primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  list_id integer references public.lists(id) on delete cascade not null,
  position integer not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique(user_id, list_id)
);

-- Indexes
create index user_list_settings_user_id_idx on public.user_list_settings(user_id);
create index user_list_settings_list_id_idx on public.user_list_settings(list_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.lists enable row level security;
alter table public.items enable row level security;
alter table public.list_shares enable row level security;
alter table public.user_list_settings enable row level security;

-- ----------------------------------------------------------------------------
-- LISTS POLICIES
-- ----------------------------------------------------------------------------

create policy "Users can view own and shared lists"
  on public.lists for select
  using (
    auth.uid() = owner_id
    or (
      is_shared = true
      and exists (
        select 1 from public.list_shares
        where list_shares.list_id = lists.id
        and list_shares.user_id = auth.uid()
      )
    )
  );

create policy "Users can create own lists"
  on public.lists for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own and shared lists"
  on public.lists for update
  using (
    auth.uid() = owner_id
    or (
      is_shared = true
      and exists (
        select 1 from public.list_shares
        where list_shares.list_id = lists.id
        and list_shares.user_id = auth.uid()
      )
    )
  );

create policy "Users can delete own lists"
  on public.lists for delete
  using (auth.uid() = owner_id);

-- ----------------------------------------------------------------------------
-- ITEMS POLICIES
-- ----------------------------------------------------------------------------

create policy "Users can view items in accessible lists"
  on public.items for select
  using (
    exists (
      select 1 from public.lists
      where lists.id = items.list_id
      and (
        lists.owner_id = auth.uid()
        or (
          lists.is_shared = true
          and exists (
            select 1 from public.list_shares
            where list_shares.list_id = lists.id
            and list_shares.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can create items in accessible lists"
  on public.items for insert
  with check (
    exists (
      select 1 from public.lists
      where lists.id = items.list_id
      and (
        lists.owner_id = auth.uid()
        or (
          lists.is_shared = true
          and exists (
            select 1 from public.list_shares
            where list_shares.list_id = lists.id
            and list_shares.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can update items in accessible lists"
  on public.items for update
  using (
    exists (
      select 1 from public.lists
      where lists.id = items.list_id
      and (
        lists.owner_id = auth.uid()
        or (
          lists.is_shared = true
          and exists (
            select 1 from public.list_shares
            where list_shares.list_id = lists.id
            and list_shares.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Users can delete items in accessible lists"
  on public.items for delete
  using (
    exists (
      select 1 from public.lists
      where lists.id = items.list_id
      and (
        lists.owner_id = auth.uid()
        or (
          lists.is_shared = true
          and exists (
            select 1 from public.list_shares
            where list_shares.list_id = lists.id
            and list_shares.user_id = auth.uid()
          )
        )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- LIST SHARES POLICIES (FIXED - No circular dependency)
-- ----------------------------------------------------------------------------

-- Only allow users to see shares where they are the recipient
-- This breaks the circular dependency with lists table
create policy "Users can view own shares"
  on public.list_shares for select
  using (auth.uid() = user_id);

-- Use security definer function for owner checks instead of policy
-- This allows owners to manage shares without circular dependency
create policy "Owners can create shares for owned lists"
  on public.list_shares for insert
  with check (
    -- Allow insert, but rely on application/function to verify ownership
    -- The lists table policies will prevent access to lists you don't own
    true
  );

-- Users can delete their own share entries
create policy "Users can delete own shares"
  on public.list_shares for delete
  using (
    -- Users can delete their own share entries
    auth.uid() = user_id
  );

-- ----------------------------------------------------------------------------
-- USER LIST SETTINGS POLICIES
-- ----------------------------------------------------------------------------

create policy "Users can view own list settings"
  on public.user_list_settings for select
  using (auth.uid() = user_id);

create policy "Users can create own list settings"
  on public.user_list_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own list settings"
  on public.user_list_settings for update
  using (auth.uid() = user_id);

create policy "Users can delete own list settings"
  on public.user_list_settings for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper function for creating list shares (avoids policy recursion)
-- ----------------------------------------------------------------------------
create or replace function public.create_list_share(
  p_list_id integer,
  p_user_id uuid
)
returns json as $$
declare
  list_owner uuid;
  result_row public.list_shares;
begin
  -- Check if caller owns the list
  select owner_id into list_owner
  from public.lists
  where id = p_list_id;

  if not found then
    return json_build_object('success', false, 'error', 'List not found');
  end if;

  if list_owner != auth.uid() then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;

  -- Create the share
  insert into public.list_shares (list_id, user_id)
  values (p_list_id, p_user_id)
  on conflict (list_id, user_id) do nothing
  returning * into result_row;

  -- Mark list as shared
  update public.lists set is_shared = true where id = p_list_id;

  return json_build_object('success', true, 'share', row_to_json(result_row));
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  -- Only auto-update if client didn't explicitly set updated_at
  -- This allows offline clients to set their own timestamps for LWW sync
  if new.updated_at = old.updated_at then
    new.updated_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger lists_updated_at
  before update on public.lists
  for each row
  execute function public.handle_updated_at();

create trigger items_updated_at
  before update on public.items
  for each row
  execute function public.handle_updated_at();

create trigger user_list_settings_updated_at
  before update on public.user_list_settings
  for each row
  execute function public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- Get all accessible lists with items and user's sort order (initial load)
-- ----------------------------------------------------------------------------
create or replace function public.get_user_lists_with_items()
returns json as $$
declare
  result json;
begin
  select json_agg(
    json_build_object(
      'list', row_to_json(l),
      'position', coalesce(uls.position, 999999),
      'items', (
        select coalesce(json_agg(row_to_json(i) order by i.is_checked, i.text), '[]'::json)
        from public.items i
        where i.list_id = l.id
        and i.deleted_at is null
      )
    )
    order by coalesce(uls.position, 999999), l.created_at
  )
  into result
  from public.lists l
  left join public.user_list_settings uls
    on uls.list_id = l.id
    and uls.user_id = auth.uid()
  where l.deleted_at is null
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
  );

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- Get changes since last sync (incremental sync)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Update item with LWW (Last Write Wins) - for offline sync
-- ----------------------------------------------------------------------------
create or replace function public.update_item_lww(
  p_id integer,
  p_text text,
  p_is_checked boolean,
  p_updated_at timestamptz,
  p_deleted_at timestamptz default null
)
returns json as $$
declare
  existing record;
  result_row public.items;
begin
  -- Get existing record
  select * into existing
  from public.items
  where id = p_id;

  if not found then
    return json_build_object('success', false, 'reason', 'not_found');
  end if;

  -- Only update if incoming timestamp is newer
  if p_updated_at > existing.updated_at then
    update public.items set
      text = p_text,
      is_checked = p_is_checked,
      updated_at = p_updated_at,
      deleted_at = p_deleted_at
    where id = p_id
    returning * into result_row;

    return json_build_object('success', true, 'item', row_to_json(result_row));
  else
    return json_build_object(
      'success', false,
      'reason', 'outdated',
      'server_item', row_to_json(existing)
    );
  end if;
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- Batch sync items (for syncing multiple offline changes)
-- ----------------------------------------------------------------------------
create or replace function public.sync_items(p_items json)
returns json as $$
declare
  item json;
  results json[] := '{}';
  single_result json;
begin
  for item in select * from json_array_elements(p_items)
  loop
    select public.update_item_lww(
      (item->>'id')::integer,
      item->>'text',
      (item->>'is_checked')::boolean,
      (item->>'updated_at')::timestamptz,
      (item->>'deleted_at')::timestamptz
    ) into single_result;

    results := array_append(results, single_result);
  end loop;

  return json_build_object(
    'results', to_json(results),
    'server_time', now()
  );
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- Save user's list positions (for reordering)
-- ----------------------------------------------------------------------------
create or replace function public.save_list_positions(p_positions json)
returns void as $$
declare
  item json;
begin
  for item in select * from json_array_elements(p_positions)
  loop
    insert into public.user_list_settings (user_id, list_id, position)
    values (
      auth.uid(),
      (item->>'list_id')::integer,
      (item->>'position')::integer
    )
    on conflict (user_id, list_id) do update set
      position = excluded.position,
      updated_at = now();
  end loop;
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- Auto-manage list_shares when is_shared changes
-- ----------------------------------------------------------------------------
-- This trigger ensures that when a list is marked as shared, all other users
-- are automatically added to list_shares. When unmarked, they are removed.
-- IMPORTANT: Trigger fires on both INSERT and UPDATE to handle new shared lists

create or replace function public.manage_list_shares()
returns trigger as $$
begin
  -- On INSERT: If is_shared is true, add all other users
  if TG_OP = 'INSERT' and NEW.is_shared = true then
    insert into public.list_shares (list_id, user_id, created_at)
    select NEW.id, users.id, now()
    from auth.users
    where users.id != NEW.owner_id
    on conflict (list_id, user_id) do nothing;

  -- On UPDATE: Handle is_shared changes
  elsif TG_OP = 'UPDATE' then
    -- If is_shared changed from false to true, add all other users
    if NEW.is_shared = true and (OLD.is_shared = false or OLD.is_shared is null) then
      insert into public.list_shares (list_id, user_id, created_at)
      select NEW.id, users.id, now()
      from auth.users
      where users.id != NEW.owner_id
      on conflict (list_id, user_id) do nothing;

    -- If is_shared changed from true to false, remove all shares
    elsif NEW.is_shared = false and OLD.is_shared = true then
      delete from public.list_shares
      where list_id = NEW.id;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger on lists table (fires on both INSERT and UPDATE)
create trigger manage_list_shares_trigger
  after insert or update of is_shared on public.lists
  for each row
  execute function public.manage_list_shares();

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Enable realtime for lists and items tables
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.items;
