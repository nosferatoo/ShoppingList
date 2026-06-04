-- UUIDs MUST match what Supabase auth.users.id contains (referenced by all app data).
-- Get them from Supabase dashboard → Authentication → Users.
-- Bcrypt hashes generated via: node -e "require('bcrypt').hash('pw',12).then(console.log)"
INSERT INTO auth.users (id, email, password_hash) VALUES
  ('<supabase-uuid-tomaz>', 'nosferatoo@gmail.com', '<bcrypt-hash>'),
  ('<supabase-uuid-petra>', 'petra@...', '<bcrypt-hash>')
ON CONFLICT (email) DO NOTHING;
