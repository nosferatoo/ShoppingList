-- Local auth schema replacing Supabase's auth.users
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text UNIQUE NOT NULL,
  password_hash  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- GUC-based shim: reads the user UUID from request.jwt.claims set by withUser()
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
$$;

-- Grant sl_user access to auth schema (needed for login lookups and auth.uid() in RLS)
GRANT USAGE ON SCHEMA auth TO sl_user;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO sl_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO sl_user;
