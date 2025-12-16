-- ============================================================================
-- SEED MENUS - Mockup data for the past 40 days
-- ============================================================================
-- This script creates sample dishes and menus for testing the meal planner
-- Run this script in the Supabase SQL Editor
-- ============================================================================

-- Get the first user ID (for owner_id in dishes)
DO $$
DECLARE
  v_user_id uuid;
  v_dish_ids integer[];
  v_current_date date;
  v_dish_count integer;
  v_random_dish_id integer;
  v_random_dish_name text;
  v_day_offset integer;
BEGIN
  -- Get first user ID
  SELECT id INTO v_user_id
  FROM auth.users
  LIMIT 1;

  -- Exit if no users exist
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Please create a user first.';
  END IF;

  RAISE NOTICE 'Using user ID: %', v_user_id;

  -- ============================================================================
  -- CREATE SAMPLE DISHES (if they don't exist)
  -- ============================================================================

  -- Insert sample dishes (ON CONFLICT DO NOTHING to avoid errors if they exist)
  INSERT INTO public.dishes (name, owner_id, created_at, updated_at)
  VALUES
    ('Spaghetti Bolognese', v_user_id, now(), now()),
    ('Chicken Curry', v_user_id, now(), now()),
    ('Beef Tacos', v_user_id, now(), now()),
    ('Salmon with Rice', v_user_id, now(), now()),
    ('Vegetable Stir Fry', v_user_id, now(), now()),
    ('Pizza Margherita', v_user_id, now(), now()),
    ('Greek Salad', v_user_id, now(), now()),
    ('Chicken Caesar Salad', v_user_id, now(), now()),
    ('Mushroom Risotto', v_user_id, now(), now()),
    ('Pad Thai', v_user_id, now(), now()),
    ('Lasagna', v_user_id, now(), now()),
    ('Grilled Chicken Breast', v_user_id, now(), now()),
    ('Fish and Chips', v_user_id, now(), now()),
    ('Beef Stew', v_user_id, now(), now()),
    ('Pork Chops', v_user_id, now(), now()),
    ('Vegetable Soup', v_user_id, now(), now()),
    ('Chicken Noodle Soup', v_user_id, now(), now()),
    ('Burgers', v_user_id, now(), now()),
    ('Quesadillas', v_user_id, now(), now()),
    ('Pasta Carbonara', v_user_id, now(), now())
  ON CONFLICT (lower(name)) WHERE deleted_at IS NULL DO NOTHING;

  RAISE NOTICE 'Sample dishes created/verified';

  -- Get all dish IDs into an array
  SELECT array_agg(id) INTO v_dish_ids
  FROM public.dishes
  WHERE deleted_at IS NULL;

  v_dish_count := array_length(v_dish_ids, 1);
  RAISE NOTICE 'Found % dishes', v_dish_count;

  -- ============================================================================
  -- CREATE MENUS FOR PAST 40 DAYS
  -- ============================================================================

  -- Loop through past 40 days (from 40 days ago to 1 day ago)
  FOR v_day_offset IN 1..40 LOOP
    -- Calculate the date (going backwards from today)
    v_current_date := CURRENT_DATE - v_day_offset;

    -- Pick a random dish
    v_random_dish_id := v_dish_ids[1 + floor(random() * v_dish_count)::integer];

    -- Get dish name
    SELECT name INTO v_random_dish_name
    FROM public.dishes
    WHERE id = v_random_dish_id;

    -- Insert menu (ON CONFLICT DO NOTHING to avoid errors if menu already exists)
    INSERT INTO public.menus (
      planned_date,
      dish_id,
      dish_name,
      is_confirmed,
      confirmed_at,
      confirmed_by,
      created_at,
      updated_at
    )
    VALUES (
      v_current_date,
      v_random_dish_id,
      v_random_dish_name,
      -- Confirm most past menus (90% chance)
      (random() < 0.9),
      -- If confirmed, set confirmed_at to the date itself
      CASE WHEN random() < 0.9 THEN v_current_date::timestamp ELSE NULL END,
      -- If confirmed, set confirmed_by to the user
      CASE WHEN random() < 0.9 THEN v_user_id ELSE NULL END,
      v_current_date::timestamp - interval '7 days', -- Created 7 days before planned date
      v_current_date::timestamp - interval '7 days'
    )
    ON CONFLICT (planned_date) DO NOTHING;

    -- Log progress every 10 days
    IF v_day_offset % 10 = 0 THEN
      RAISE NOTICE 'Created menus up to % days ago', v_day_offset;
    END IF;
  END LOOP;

  RAISE NOTICE 'Successfully created menus for 40 days';
  RAISE NOTICE 'Date range: % to %', CURRENT_DATE - 40, CURRENT_DATE - 1;

END $$;

-- ============================================================================
-- VERIFY THE DATA
-- ============================================================================

-- Show count of created menus
SELECT
  'Total menus created' as info,
  COUNT(*) as count
FROM public.menus;

-- Show date range
SELECT
  'Date range' as info,
  MIN(planned_date) as earliest_date,
  MAX(planned_date) as latest_date
FROM public.menus;

-- Show confirmed vs unconfirmed
SELECT
  is_confirmed,
  COUNT(*) as count
FROM public.menus
GROUP BY is_confirmed
ORDER BY is_confirmed;

-- Show sample of recent menus
SELECT
  planned_date,
  dish_name,
  is_confirmed
FROM public.menus
ORDER BY planned_date DESC
LIMIT 10;
