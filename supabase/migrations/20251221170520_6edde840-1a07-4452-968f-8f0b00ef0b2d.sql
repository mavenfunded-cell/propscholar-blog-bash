-- Create functions to get admin data without RLS restrictions

-- Function to get all user coins
CREATE OR REPLACE FUNCTION public.get_all_user_coins()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  balance integer,
  total_earned integer,
  total_spent integer,
  referral_code text,
  signup_coins_claimed boolean,
  referred_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, user_id, email, balance, total_earned, total_spent, referral_code, signup_coins_claimed, referred_by, created_at, updated_at
  FROM public.user_coins
  ORDER BY created_at DESC;
$$;

-- Function to get all coin transactions for a user
CREATE OR REPLACE FUNCTION public.get_user_coin_transactions(_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  amount integer,
  transaction_type text,
  source text,
  source_id uuid,
  description text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, user_id, amount, transaction_type, source, source_id, description, created_at
  FROM public.coin_transactions
  WHERE coin_transactions.user_id = _user_id
  ORDER BY created_at DESC
  LIMIT 50;
$$;

-- Function to get all referrals
CREATE OR REPLACE FUNCTION public.get_all_referrals()
RETURNS TABLE(
  id uuid,
  referrer_id uuid,
  referred_id uuid,
  referred_email text,
  status text,
  coins_rewarded integer,
  created_at timestamptz,
  qualified_at timestamptz,
  rewarded_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, referrer_id, referred_id, referred_email, status, coins_rewarded, created_at, qualified_at, rewarded_at
  FROM public.referrals
  ORDER BY created_at DESC;
$$;

-- Function to get all social follows
CREATE OR REPLACE FUNCTION public.get_all_social_follows()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  platform text,
  coins_earned integer,
  claimed_at timestamptz,
  screenshot_url text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, user_id, platform, coins_earned, claimed_at, screenshot_url, status
  FROM public.social_follows
  ORDER BY claimed_at DESC;
$$;

-- Function to get blog votes with submission info
CREATE OR REPLACE FUNCTION public.get_votes_for_event(_event_id uuid)
RETURNS TABLE(
  vote_id uuid,
  submission_id uuid,
  voter_name text,
  voter_email text,
  created_at timestamptz,
  submission_name text,
  blog_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    v.id as vote_id,
    v.submission_id,
    v.voter_name,
    v.voter_email,
    v.created_at,
    s.name as submission_name,
    s.blog_title
  FROM public.blog_votes v
  JOIN public.submissions s ON s.id = v.submission_id
  WHERE s.event_id = _event_id
  ORDER BY v.created_at DESC;
$$;

-- Function to get submissions with vote counts for an event
CREATE OR REPLACE FUNCTION public.get_submissions_with_votes(_event_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  blog_title text,
  vote_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    s.id,
    s.name,
    s.email,
    s.blog_title,
    COUNT(v.id) as vote_count
  FROM public.submissions s
  LEFT JOIN public.blog_votes v ON v.submission_id = s.id
  WHERE s.event_id = _event_id
  GROUP BY s.id, s.name, s.email, s.blog_title
  ORDER BY vote_count DESC;
$$;