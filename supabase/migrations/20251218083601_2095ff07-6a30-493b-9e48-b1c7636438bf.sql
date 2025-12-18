-- Drop existing constraint and add new one with discount_20
ALTER TABLE public.rewards DROP CONSTRAINT rewards_reward_type_check;
ALTER TABLE public.rewards ADD CONSTRAINT rewards_reward_type_check CHECK (reward_type = ANY (ARRAY['discount_20'::text, 'discount_30'::text, 'discount_50'::text, 'prop_account'::text]));

-- Add 20% discount reward
INSERT INTO public.rewards (name, description, coin_cost, reward_type, expiry_days, max_claims_per_user, is_enabled)
VALUES ('20% Discount Coupon', 'Get 20% off on your next PropScholar challenge purchase. One-time use, expires in 14 days.', 100, 'discount_20', 14, 999, true);