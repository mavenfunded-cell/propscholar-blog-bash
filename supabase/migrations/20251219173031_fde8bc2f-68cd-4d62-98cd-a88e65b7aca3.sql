-- Remove forbidden FK reference to auth.users (keep as plain uuid)
ALTER TABLE public.user_sessions
  DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;

-- Note: keep column type as uuid; no FK to auth schema.
