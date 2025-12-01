# DATABASE.md — Supabase Database Schema

## Overview

PostgreSQL database hosted on Supabase with Row Level Security (RLS), real-time subscriptions, and functions for offline sync support.

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              auth.users                                  │
│                         (Managed by Supabase)                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ id (uuid)  │  email  │  encrypted_password  │  ...              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────┬───────────────────────────────────────┘
           │                      │
           │ owner_id             │ user_id
           ▼                      │
┌──────────────────────────────┐  │
│       public.lists           │  │
│  ┌────────────────────────┐  │  │
│  │ id         │ serial PK │  │  │
│  │ title      │ text      │  │  │
│  │ type       │ text      │  │  │
│  │ owner_id   │ uuid FK   │  │  │
│  │ is_shared  │ boolean   │  │  │
│  │ created_at │ timestamp │  │  │
│  │ updated_at │ timestamp │  │  │
│  │ deleted_at │ timestamp │  │  │
│  └────────────────────────┘  │  │
└──────────┬───────────────────┘  │
           │                      │
           │ list_id              │
           ▼                      │
┌──────────────────────────────┐  │    ┌─────────────────────────────────┐
│       public.items           │  │    │  public.user_list_settings      │
│  ┌────────────────────────┐  │  │    │  ┌───────────────────────────┐  │
│  │ id         │ serial PK │  │  │    │  │ id         │ serial    PK │  │
│  │ list_id    │ int FK    │  │  │    │  │ user_id    │ uuid      FK │◄─┘
│  │ text       │ text      │  │  │    │  │ list_id    │ int       FK │◄─┐
│  │ is_checked │ boolean   │  │  │    │  │ position   │ int          │  │
│  │ created_at │ timestamp │  │  │    │  │ created_at │ timestamp    │  │
│  │ updated_at │ timestamp │  │  │    │  │ updated_at │ timestamp    │  │
│  │ deleted_at │ timestamp │  │  │    │  └───────────────────────────┘  │
│  └────────────────────────┘  │  │    │                                 │
│                               │  │    │  UNIQUE(user_id, list_id)       │
│  UNIQUE(list_id, lower(text)) │  │    └─────────────────────────────────┘
│  WHERE deleted_at IS NULL     │  │
└───────────────────────────────┘  │
                                   │    ┌─────────────────────────────────┐
                                   │    │     public.list_shares          │
                                   │    │  ┌───────────────────────────┐  │
                                   └────│  │ list_id    │ int       FK │  │
                                        │  │ user_id    │ uuid      FK │  │
                                        │  │ id         │ serial    PK │  │
                                        │  │ created_at │ timestamp    │  │
                                        │  └───────────────────────────┘  │
                                        │                                 │
                                        │  UNIQUE(list_id, user_id)       │
                                        └─────────────────────────────────┘
```

## Complete SQL Schema

```sql
-- ============================================================================
-- DATABASE SCHEMA: Shopping & To-Do Lists App
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
-- LIST SHARES POLICIES
-- ----------------------------------------------------------------------------

create policy "Users can view relevant shares"
  on public.list_shares for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.lists
      where lists.id = list_shares.list_id
      and lists.owner_id = auth.uid()
    )
  );

create policy "Owners can create shares"
  on public.list_shares for insert
  with check (
    exists (
      select 1 from public.lists
      where lists.id = list_shares.list_id
      and lists.owner_id = auth.uid()
    )
  );

create policy "Owners can delete shares"
  on public.list_shares for delete
  using (
    exists (
      select 1 from public.lists
      where lists.id = list_shares.list_id
      and lists.owner_id = auth.uid()
    )
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

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Enable realtime for lists and items tables
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.items;
```

## TypeScript Types

Generate types from Supabase:

```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/types/database.ts
```

Or define manually:

```typescript
// src/lib/types.ts

export interface List {
  id: number;
  title: string;
  type: 'shopping' | 'todo';
  owner_id: string;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Item {
  id: number;
  list_id: number;
  text: string;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ListShare {
  id: number;
  list_id: number;
  user_id: string;
  created_at: string;
}

export interface UserListSettings {
  id: number;
  user_id: string;
  list_id: number;
  position: number;
  created_at: string;
  updated_at: string;
}

// Combined type for UI
export interface ListWithItems {
  list: List;
  position: number;
  items: Item[];
}
```

## Supabase Setup Steps

1. **Create project** at [supabase.com](https://supabase.com)

2. **Run schema SQL** in SQL Editor (Dashboard → SQL Editor → New Query)

3. **Create users** in Authentication → Users → Add User
   - Use email/password
   - Note the user UUIDs for sharing setup

4. **Set up sharing** (SQL Editor):
   ```sql
   -- Get user IDs
   select id, email from auth.users;
   
   -- Share a list (replace IDs)
   insert into public.list_shares (list_id, user_id)
   values (1, 'other-user-uuid-here');
   ```

5. **Enable Realtime** in Database → Replication
   - Ensure `lists` and `items` tables have realtime enabled

6. **Get API keys** from Settings → API
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`

## Seed Data (Optional)

```sql
-- After creating users, insert test data
-- Replace UUIDs with actual user IDs from auth.users

-- User 1's lists
insert into public.lists (title, type, owner_id, is_shared) values
  ('Groceries', 'shopping', 'USER_1_UUID', true),
  ('Home Tasks', 'todo', 'USER_1_UUID', false);

-- Share Groceries with User 2
insert into public.list_shares (list_id, user_id) values
  (1, 'USER_2_UUID');

-- Sample items
insert into public.items (list_id, text, is_checked) values
  (1, 'Milk', false),
  (1, 'Bread', false),
  (1, 'Eggs', true),
  (2, 'Fix sink', false),
  (2, 'Call plumber', false);

-- User positions
insert into public.user_list_settings (user_id, list_id, position) values
  ('USER_1_UUID', 1, 0),
  ('USER_1_UUID', 2, 1),
  ('USER_2_UUID', 1, 0);
```
