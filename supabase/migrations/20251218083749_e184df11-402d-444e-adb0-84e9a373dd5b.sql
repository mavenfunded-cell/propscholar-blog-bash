-- Update coupon_pools constraint to allow discount_20
ALTER TABLE public.coupon_pools DROP CONSTRAINT IF EXISTS coupon_pools_reward_type_check;
ALTER TABLE public.coupon_pools ADD CONSTRAINT coupon_pools_reward_type_check CHECK (reward_type = ANY (ARRAY['discount_20'::text, 'discount_30'::text, 'discount_50'::text]));