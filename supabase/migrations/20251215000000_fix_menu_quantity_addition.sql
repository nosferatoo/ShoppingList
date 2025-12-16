-- Fix confirm_menu_and_update_quantities to add quantities for unchecked items
-- instead of overwriting them

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
