-- pg_notify trigger for SSE realtime (replaces Supabase Realtime)
CREATE OR REPLACE FUNCTION notify_data_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('data_changed', '');
  RETURN NULL;
END;
$$;

CREATE TRIGGER notify_items_changed AFTER INSERT OR UPDATE OR DELETE ON items
  FOR EACH STATEMENT EXECUTE FUNCTION notify_data_changed();
CREATE TRIGGER notify_lists_changed AFTER INSERT OR UPDATE OR DELETE ON lists
  FOR EACH STATEMENT EXECUTE FUNCTION notify_data_changed();
CREATE TRIGGER notify_dishes_changed AFTER INSERT OR UPDATE OR DELETE ON dishes
  FOR EACH STATEMENT EXECUTE FUNCTION notify_data_changed();
CREATE TRIGGER notify_dish_ingredients_changed AFTER INSERT OR UPDATE OR DELETE ON dish_ingredients
  FOR EACH STATEMENT EXECUTE FUNCTION notify_data_changed();
CREATE TRIGGER notify_menus_changed AFTER INSERT OR UPDATE OR DELETE ON menus
  FOR EACH STATEMENT EXECUTE FUNCTION notify_data_changed();
CREATE TRIGGER notify_user_list_settings_changed AFTER INSERT OR UPDATE OR DELETE ON user_list_settings
  FOR EACH STATEMENT EXECUTE FUNCTION notify_data_changed();

-- Grant sl_user access to all public tables, sequences, and functions
-- (pg_restore creates tables owned by the dump's original owner, not sl_user)
GRANT ALL ON ALL TABLES IN SCHEMA public TO sl_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO sl_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO sl_user;

-- Reset serial sequences (pg_restore doesn't update these for data-bearing dumps)
SELECT setval('lists_id_seq', COALESCE((SELECT MAX(id) FROM lists), 0));
SELECT setval('items_id_seq', COALESCE((SELECT MAX(id) FROM items), 0));
SELECT setval('list_shares_id_seq', COALESCE((SELECT MAX(id) FROM list_shares), 0));
SELECT setval('user_list_settings_id_seq', COALESCE((SELECT MAX(id) FROM user_list_settings), 0));
SELECT setval('item_check_logs_id_seq', COALESCE((SELECT MAX(id) FROM item_check_logs), 0));
SELECT setval('user_preferences_id_seq', COALESCE((SELECT MAX(id) FROM user_preferences), 0));
SELECT setval('dishes_id_seq', COALESCE((SELECT MAX(id) FROM dishes), 0));
SELECT setval('dish_ingredients_id_seq', COALESCE((SELECT MAX(id) FROM dish_ingredients), 0));
SELECT setval('menus_id_seq', COALESCE((SELECT MAX(id) FROM menus), 0));
