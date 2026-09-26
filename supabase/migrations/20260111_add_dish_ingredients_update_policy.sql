-- Migration: Add UPDATE policy for dish_ingredients table
-- This allows updating item_id and item_text when re-linking orphaned ingredients

create policy "All users can update dish ingredients"
  on public.dish_ingredients for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
