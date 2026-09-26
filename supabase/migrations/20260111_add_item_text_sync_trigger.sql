-- Migration: Add trigger to sync item_text in dish_ingredients when items.text changes
-- This keeps dish_ingredients.item_text in sync when users rename items in shopping lists

-- Create the sync function
create or replace function public.sync_item_text_to_ingredients()
returns trigger as $$
begin
  -- Only sync if text actually changed
  if OLD.text is distinct from NEW.text then
    update public.dish_ingredients
    set item_text = NEW.text
    where item_id = NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Create the trigger (fires after UPDATE on items.text column)
create trigger sync_item_text_to_dish_ingredients
  after update of text on public.items
  for each row
  execute function public.sync_item_text_to_ingredients();

-- One-time fix: Sync any existing stale item_text values
update public.dish_ingredients di
set item_text = i.text
from public.items i
where di.item_id = i.id
  and di.item_text is distinct from i.text;
