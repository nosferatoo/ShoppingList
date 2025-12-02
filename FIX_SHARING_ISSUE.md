# Fix: Shared Lists Not Visible to Other Users

## Problem

When user A marks a list as shared (`is_shared = true`), user B cannot see that list. This is because the `list_shares` table is not being populated automatically.

## Root Cause

The sharing mechanism requires **two conditions** to be met:
1. The list must have `is_shared = true`
2. The user must exist in the `list_shares` table for that list

The bug: When a list is marked as shared, only the `is_shared` flag is updated, but the `list_shares` table is not populated with entries for other users.

## Solution

Created a database trigger that automatically manages the `list_shares` table:
- When `is_shared` changes from `false` to `true`: Adds all users (except owner) to `list_shares`
- When `is_shared` changes from `true` to `false`: Removes all entries from `list_shares`

## Files Changed

1. **supabase/migrations/003_auto_manage_list_shares.sql** (NEW)
   - Migration file with trigger function and backfill for existing shared lists

2. **supabase/schema.sql** (UPDATED)
   - Added `manage_list_shares()` function at line 510-530
   - Added `manage_list_shares_on_update` trigger at line 533-536

## How to Apply

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/003_auto_manage_list_shares.sql`
4. Paste into SQL Editor and click **Run**

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Manual Query

Run this SQL in your database:

```sql
-- Function to automatically manage list_shares entries
create or replace function public.manage_list_shares()
returns trigger as $$
begin
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

  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger
create trigger manage_list_shares_on_update
  after update of is_shared on public.lists
  for each row
  execute function public.manage_list_shares();

-- Backfill existing shared lists
insert into public.list_shares (list_id, user_id, created_at)
select l.id, u.id, now()
from public.lists l
cross join auth.users u
where l.is_shared = true
  and l.deleted_at is null
  and u.id != l.owner_id
on conflict (list_id, user_id) do nothing;
```

## Testing

After applying the migration:

1. **Login as User A**
   - Mark an existing list as shared (or create a new shared list)

2. **Login as User B**
   - You should now see User A's shared lists

3. **Test unmarking**
   - As User A, unmark the list as shared
   - As User B, the list should disappear from your view

## What Happens

### Before Fix
```
User A marks list as shared
  ↓
lists.is_shared = true
  ↓
list_shares table: (empty) ❌
  ↓
User B cannot see the list
```

### After Fix
```
User A marks list as shared
  ↓
lists.is_shared = true
  ↓
TRIGGER fires automatically
  ↓
list_shares table: User B added ✅
  ↓
User B can see the list
```

## Backfill

The migration includes a backfill query that will automatically add entries to `list_shares` for any lists that are already marked as shared. This ensures that existing shared lists start working immediately after the migration is applied.
