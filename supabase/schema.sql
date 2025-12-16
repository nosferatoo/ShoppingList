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
  is_food boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz default null
);

-- Indexes
create index lists_owner_id_idx on public.lists(owner_id);
create index lists_updated_at_idx on public.lists(updated_at);
create index lists_deleted_at_idx on public.lists(deleted_at) where deleted_at is null;
create index lists_is_food_idx on public.lists(is_food) where is_food = true and deleted_at is null;

-- ----------------------------------------------------------------------------
-- ITEMS TABLE
-- ----------------------------------------------------------------------------
create table public.items (
  id serial primary key,
  list_id integer references public.lists(id) on delete cascade not null,
  text text not null,
  is_checked boolean default false,
  quantity integer default null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz default null
);

-- Indexes
create index items_list_id_idx on public.items(list_id);
create index items_updated_at_idx on public.items(updated_at);
create index items_deleted_at_idx on public.items(deleted_at) where deleted_at is null;
create index items_quantity_idx on public.items(quantity) where quantity > 0 and deleted_at is null;

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

-- ----------------------------------------------------------------------------
-- ITEM CHECK LOGS TABLE (for statistics)
-- ----------------------------------------------------------------------------
create table public.item_check_logs (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  list_name text not null,
  item_name text not null,
  checked_at timestamptz not null,

  -- Optional: Store IDs for efficient queries while they still exist
  list_id integer references public.lists(id) on delete set null,
  item_id integer references public.items(id) on delete set null
);

-- Indexes for efficient statistics queries
create index item_check_logs_user_id_idx on public.item_check_logs(user_id);
create index item_check_logs_checked_at_idx on public.item_check_logs(checked_at desc);
create index item_check_logs_list_name_idx on public.item_check_logs(list_name);
create index item_check_logs_item_name_idx on public.item_check_logs(item_name);

-- ----------------------------------------------------------------------------
-- USER PREFERENCES TABLE (theme and other user-specific settings)
-- ----------------------------------------------------------------------------
create table public.user_preferences (
  id serial primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  theme_color text not null default 'orange' check (theme_color in ('orange', 'teal', 'blue', 'purple')),
  theme_mode text not null default 'dark' check (theme_mode in ('light', 'dark')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index user_preferences_user_id_idx on public.user_preferences(user_id);

-- ----------------------------------------------------------------------------
-- DISHES TABLE (meal planning)
-- ----------------------------------------------------------------------------
create table public.dishes (
  id serial primary key,
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  deleted_at timestamptz default null
);

-- Indexes
create index dishes_owner_id_idx on public.dishes(owner_id);
create index dishes_updated_at_idx on public.dishes(updated_at);
create index dishes_deleted_at_idx on public.dishes(deleted_at) where deleted_at is null;

-- Unique constraint: no duplicate dish names (case-insensitive, non-deleted only)
create unique index dishes_name_unique_idx
  on public.dishes(lower(name))
  where deleted_at is null;

-- ----------------------------------------------------------------------------
-- DISH INGREDIENTS TABLE (meal planning)
-- ----------------------------------------------------------------------------
create table public.dish_ingredients (
  id serial primary key,
  dish_id integer references public.dishes(id) on delete cascade not null,
  item_id integer references public.items(id) on delete set null,
  item_text text not null,
  created_at timestamptz default now() not null
);

-- Indexes
create index dish_ingredients_dish_id_idx on public.dish_ingredients(dish_id);
create index dish_ingredients_item_id_idx on public.dish_ingredients(item_id) where item_id is not null;

-- Unique constraint: no duplicate ingredients per dish
create unique index dish_ingredients_unique_idx
  on public.dish_ingredients(dish_id, item_id)
  where item_id is not null;

-- ----------------------------------------------------------------------------
-- MENUS TABLE (meal planning)
-- ----------------------------------------------------------------------------
create table public.menus (
  id serial primary key,
  planned_date date not null,
  dish_id integer references public.dishes(id) on delete set null,
  dish_name text not null,
  is_confirmed boolean default false not null,
  confirmed_at timestamptz default null,
  confirmed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index menus_planned_date_idx on public.menus(planned_date desc);
create index menus_dish_id_idx on public.menus(dish_id) where dish_id is not null;
create index menus_is_confirmed_idx on public.menus(is_confirmed);

-- Unique constraint: one dish per date
create unique index menus_date_unique_idx on public.menus(planned_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.lists enable row level security;
alter table public.items enable row level security;
alter table public.list_shares enable row level security;
alter table public.user_list_settings enable row level security;
alter table public.item_check_logs enable row level security;
alter table public.user_preferences enable row level security;
alter table public.dishes enable row level security;
alter table public.dish_ingredients enable row level security;
alter table public.menus enable row level security;

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

-- ----------------------------------------------------------------------------
-- ITEM CHECK LOGS POLICIES
-- ----------------------------------------------------------------------------

create policy "Users can view own check logs"
  on public.item_check_logs for select
  using (auth.uid() = user_id);

create policy "Users can create own check logs"
  on public.item_check_logs for insert
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- USER PREFERENCES POLICIES
-- ----------------------------------------------------------------------------

create policy "Users can view own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can create own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

create policy "Users can delete own preferences"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- DISHES POLICIES
-- ----------------------------------------------------------------------------

create policy "All users can view all dishes"
  on public.dishes for select
  using (auth.uid() is not null);

create policy "Users can create own dishes"
  on public.dishes for insert
  with check (auth.uid() = owner_id);

create policy "All users can update all dishes"
  on public.dishes for update
  using (auth.uid() is not null);

create policy "Owners can delete own dishes"
  on public.dishes for delete
  using (auth.uid() = owner_id);

-- ----------------------------------------------------------------------------
-- DISH INGREDIENTS POLICIES
-- ----------------------------------------------------------------------------

create policy "All users can view all dish ingredients"
  on public.dish_ingredients for select
  using (auth.uid() is not null);

create policy "All users can create dish ingredients"
  on public.dish_ingredients for insert
  with check (auth.uid() is not null);

create policy "All users can delete dish ingredients"
  on public.dish_ingredients for delete
  using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- MENUS POLICIES
-- ----------------------------------------------------------------------------

create policy "All users can view all menus"
  on public.menus for select
  using (auth.uid() is not null);

create policy "All users can create menus"
  on public.menus for insert
  with check (auth.uid() is not null);

create policy "All users can update menus"
  on public.menus for update
  using (auth.uid() is not null);

create policy "All users can delete menus"
  on public.menus for delete
  using (auth.uid() is not null);

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

create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row
  execute function public.handle_updated_at();

create trigger dishes_updated_at
  before update on public.dishes
  for each row
  execute function public.handle_updated_at();

create trigger menus_updated_at
  before update on public.menus
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
-- Get all dishes with their ingredients (meal planning)
-- ----------------------------------------------------------------------------
create or replace function public.get_dishes_with_ingredients()
returns json as $$
declare
  result json;
begin
  select json_agg(
    json_build_object(
      'dish', row_to_json(d),
      'ingredients', (
        select coalesce(json_agg(
          json_build_object(
            'ingredient', row_to_json(di),
            'item', case
              when di.item_id is not null then (
                select row_to_json(i)
                from public.items i
                where i.id = di.item_id
              )
              else null
            end
          )
        ), '[]'::json)
        from public.dish_ingredients di
        where di.dish_id = d.id
      )
    )
    order by d.name
  )
  into result
  from public.dishes d
  where d.deleted_at is null;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- Get menus with dishes for date range (meal planning)
-- ----------------------------------------------------------------------------
create or replace function public.get_menus_with_dishes(
  p_start_date date,
  p_end_date date
)
returns json as $$
declare
  result json;
begin
  select json_agg(
    json_build_object(
      'menu', row_to_json(m),
      'dish', case
        when m.dish_id is not null then (
          select row_to_json(d)
          from public.dishes d
          where d.id = m.dish_id
        )
        else null
      end,
      'ingredients', case
        when m.dish_id is not null then (
          select coalesce(json_agg(
            json_build_object(
              'ingredient', row_to_json(di),
              'item', case
                when di.item_id is not null then (
                  select row_to_json(i)
                  from public.items i
                  where i.id = di.item_id
                )
                else null
              end
            )
          ), '[]'::json)
          from public.dish_ingredients di
          where di.dish_id = m.dish_id
        )
        else '[]'::json
      end
    )
    order by m.planned_date desc
  )
  into result
  from public.menus m
  where m.planned_date >= p_start_date
    and m.planned_date <= p_end_date;

  return coalesce(result, '[]'::json);
end;
$$ language plpgsql security definer;

-- ----------------------------------------------------------------------------
-- Confirm menu and update item quantities (meal planning)
-- ----------------------------------------------------------------------------
create or replace function public.confirm_menu_and_update_quantities(
  p_menu_ids integer[],
  p_excluded_item_ids integer[] default '{}'::integer[]
)
returns json as $$
declare
  affected_items integer := 0;
  result json;
begin
  -- Mark menus as confirmed
  update public.menus
  set
    is_confirmed = true,
    confirmed_at = now(),
    confirmed_by = auth.uid(),
    updated_at = now()
  where id = any(p_menu_ids);

  -- Calculate ingredient quantities and update items
  with ingredient_usage as (
    select
      di.item_id,
      count(distinct m.id) as usage_count
    from public.menus m
    inner join public.dish_ingredients di on di.dish_id = m.dish_id
    where m.id = any(p_menu_ids)
      and di.item_id is not null
      and not (di.item_id = any(p_excluded_item_ids))
    group by di.item_id
  )
  update public.items i
  set
    is_checked = false,
    quantity = case
      when i.is_checked = true then iu.usage_count
      else coalesce(i.quantity, 0) + iu.usage_count
    end,
    updated_at = now()
  from ingredient_usage iu
  where i.id = iu.item_id
    and i.deleted_at is null;

  get diagnostics affected_items = row_count;

  select json_build_object(
    'confirmed_menus', array_length(p_menu_ids, 1),
    'affected_items', affected_items
  ) into result;

  return result;
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
alter publication supabase_realtime add table public.item_check_logs;

-- Enable realtime for meal planning tables
alter publication supabase_realtime add table public.dishes;
alter publication supabase_realtime add table public.dish_ingredients;
alter publication supabase_realtime add table public.menus;
