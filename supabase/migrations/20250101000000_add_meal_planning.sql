-- ============================================================================
-- MEAL PLANNING FEATURE - Database Migration
-- ============================================================================
-- This migration adds support for meal planning with dishes and menus
--
-- New tables: dishes, dish_ingredients, menus
-- Modified tables: lists (add is_food), items (add quantity)
-- New RPC functions: get_dishes_with_ingredients, get_menus_with_dishes,
--                     confirm_menu_and_update_quantities
-- ============================================================================

-- ============================================================================
-- MODIFY EXISTING TABLES
-- ============================================================================

-- Add is_food column to lists table
ALTER TABLE public.lists
ADD COLUMN is_food boolean DEFAULT false NOT NULL;

-- Add index for filtering food lists
CREATE INDEX lists_is_food_idx ON public.lists(is_food)
WHERE is_food = true AND deleted_at IS NULL;

-- Add quantity column to items table
ALTER TABLE public.items
ADD COLUMN quantity integer DEFAULT NULL;

-- Add index for items with quantities (for efficient queries)
CREATE INDEX items_quantity_idx ON public.items(quantity)
WHERE quantity > 0 AND deleted_at IS NULL;

-- ============================================================================
-- CREATE NEW TABLES
-- ============================================================================

-- DISHES TABLE
-- Stores dish definitions (recipes/meals)
-- Shared between all users (like shared lists)
CREATE TABLE public.dishes (
  id serial PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz DEFAULT NULL
);

-- Indexes for dishes
CREATE INDEX dishes_owner_id_idx ON public.dishes(owner_id);
CREATE INDEX dishes_updated_at_idx ON public.dishes(updated_at);
CREATE INDEX dishes_deleted_at_idx ON public.dishes(deleted_at)
  WHERE deleted_at IS NULL;

-- Unique constraint: no duplicate dish names (case-insensitive, non-deleted only)
CREATE UNIQUE INDEX dishes_name_unique_idx
  ON public.dishes(lower(name))
  WHERE deleted_at IS NULL;

-- DISH_INGREDIENTS TABLE
-- Junction table linking dishes to items (ingredients)
-- item_id is nullable to handle deleted items (soft delete cascade)
CREATE TABLE public.dish_ingredients (
  id serial PRIMARY KEY,
  dish_id integer REFERENCES public.dishes(id) ON DELETE CASCADE NOT NULL,
  item_id integer REFERENCES public.items(id) ON DELETE SET NULL,
  item_text text NOT NULL, -- Denormalized for display when item is deleted
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for dish_ingredients
CREATE INDEX dish_ingredients_dish_id_idx ON public.dish_ingredients(dish_id);
CREATE INDEX dish_ingredients_item_id_idx ON public.dish_ingredients(item_id)
  WHERE item_id IS NOT NULL;

-- Unique constraint: no duplicate ingredients per dish
CREATE UNIQUE INDEX dish_ingredients_unique_idx
  ON public.dish_ingredients(dish_id, item_id)
  WHERE item_id IS NOT NULL;

-- MENUS TABLE
-- Stores planned meals (one dish per day)
-- Tracks confirmation status and resulting quantities
CREATE TABLE public.menus (
  id serial PRIMARY KEY,
  planned_date date NOT NULL,
  dish_id integer REFERENCES public.dishes(id) ON DELETE SET NULL,
  dish_name text NOT NULL, -- Denormalized for display when dish is deleted
  is_confirmed boolean DEFAULT false NOT NULL,
  confirmed_at timestamptz DEFAULT NULL,
  confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for menus
CREATE INDEX menus_planned_date_idx ON public.menus(planned_date DESC);
CREATE INDEX menus_dish_id_idx ON public.menus(dish_id)
  WHERE dish_id IS NOT NULL;
CREATE INDEX menus_is_confirmed_idx ON public.menus(is_confirmed);

-- Unique constraint: one dish per date
CREATE UNIQUE INDEX menus_date_unique_idx
  ON public.menus(planned_date);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for dishes
CREATE TRIGGER dishes_updated_at
  BEFORE UPDATE ON public.dishes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-update updated_at for menus
CREATE TRIGGER menus_updated_at
  BEFORE UPDATE ON public.menus
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- DISHES TABLE
ALTER TABLE public.dishes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all dishes (shared resource)
CREATE POLICY "All users can view all dishes"
  ON public.dishes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can create own dishes
CREATE POLICY "Users can create own dishes"
  ON public.dishes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- All authenticated users can update all dishes (collaborative editing)
CREATE POLICY "All users can update all dishes"
  ON public.dishes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Only owners can delete their dishes (soft delete)
CREATE POLICY "Owners can delete own dishes"
  ON public.dishes FOR DELETE
  USING (auth.uid() = owner_id);

-- DISH_INGREDIENTS TABLE
ALTER TABLE public.dish_ingredients ENABLE ROW LEVEL SECURITY;

-- All users can view all ingredients (follows dish visibility)
CREATE POLICY "All users can view all dish ingredients"
  ON public.dish_ingredients FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All users can manage ingredients (collaborative editing)
CREATE POLICY "All users can create dish ingredients"
  ON public.dish_ingredients FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "All users can delete dish ingredients"
  ON public.dish_ingredients FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- MENUS TABLE
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

-- All users can view all menus (shared planning)
CREATE POLICY "All users can view all menus"
  ON public.menus FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All users can create menus (shared planning)
CREATE POLICY "All users can create menus"
  ON public.menus FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- All users can update menus (shared planning)
CREATE POLICY "All users can update menus"
  ON public.menus FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- All users can delete menus
CREATE POLICY "All users can delete menus"
  ON public.menus FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Get all dishes with their ingredients
CREATE OR REPLACE FUNCTION public.get_dishes_with_ingredients()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'dish', row_to_json(d),
      'ingredients', (
        SELECT coalesce(json_agg(
          json_build_object(
            'ingredient', row_to_json(di),
            'item', CASE
              WHEN di.item_id IS NOT NULL THEN (
                SELECT row_to_json(i)
                FROM public.items i
                WHERE i.id = di.item_id
              )
              ELSE NULL
            END
          )
        ), '[]'::json)
        FROM public.dish_ingredients di
        WHERE di.dish_id = d.id
      )
    )
    ORDER BY d.name
  )
  INTO result
  FROM public.dishes d
  WHERE d.deleted_at IS NULL;

  RETURN coalesce(result, '[]'::json);
END;
$$;

-- Get menus with dishes for date range
CREATE OR REPLACE FUNCTION public.get_menus_with_dishes(
  p_start_date date,
  p_end_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'menu', row_to_json(m),
      'dish', CASE
        WHEN m.dish_id IS NOT NULL THEN (
          SELECT row_to_json(d)
          FROM public.dishes d
          WHERE d.id = m.dish_id
        )
        ELSE NULL
      END,
      'ingredients', CASE
        WHEN m.dish_id IS NOT NULL THEN (
          SELECT coalesce(json_agg(
            json_build_object(
              'ingredient', row_to_json(di),
              'item', CASE
                WHEN di.item_id IS NOT NULL THEN (
                  SELECT row_to_json(i)
                  FROM public.items i
                  WHERE i.id = di.item_id
                )
                ELSE NULL
              END
            )
          ), '[]'::json)
          FROM public.dish_ingredients di
          WHERE di.dish_id = m.dish_id
        )
        ELSE '[]'::json
      END
    )
    ORDER BY m.planned_date DESC
  )
  INTO result
  FROM public.menus m
  WHERE m.planned_date >= p_start_date
    AND m.planned_date <= p_end_date;

  RETURN coalesce(result, '[]'::json);
END;
$$;

-- Confirm menu and update item quantities
-- This function:
-- 1. Marks selected menus as confirmed
-- 2. Calculates ingredient quantities (count of dishes using each item)
-- 3. Unchecks all ingredient items
-- 4. Updates item quantities
CREATE OR REPLACE FUNCTION public.confirm_menu_and_update_quantities(
  p_menu_ids integer[],
  p_excluded_item_ids integer[] DEFAULT '{}'::integer[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_items integer := 0;
  result json;
BEGIN
  -- Mark menus as confirmed
  UPDATE public.menus
  SET
    is_confirmed = true,
    confirmed_at = now(),
    confirmed_by = auth.uid(),
    updated_at = now()
  WHERE id = ANY(p_menu_ids);

  -- Calculate ingredient quantities and update items
  -- Count how many dishes (from p_menu_ids) use each ingredient
  WITH ingredient_usage AS (
    SELECT
      di.item_id,
      COUNT(DISTINCT m.id) as usage_count
    FROM public.menus m
    INNER JOIN public.dish_ingredients di ON di.dish_id = m.dish_id
    WHERE m.id = ANY(p_menu_ids)
      AND di.item_id IS NOT NULL
      AND NOT (di.item_id = ANY(p_excluded_item_ids))
    GROUP BY di.item_id
  )
  -- Update items: uncheck and set quantity
  UPDATE public.items i
  SET
    is_checked = false,
    quantity = iu.usage_count,
    updated_at = now()
  FROM ingredient_usage iu
  WHERE i.id = iu.item_id
    AND i.deleted_at IS NULL;

  -- Get count of affected items
  GET DIAGNOSTICS affected_items = ROW_COUNT;

  -- Return summary
  SELECT json_build_object(
    'confirmed_menus', array_length(p_menu_ids, 1),
    'affected_items', affected_items
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dishes_with_ingredients() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_menus_with_dishes(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_menu_and_update_quantities(integer[], integer[]) TO authenticated;
