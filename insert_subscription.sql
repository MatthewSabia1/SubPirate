-- Manual insert for the subscription we just created
INSERT INTO customer_subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_price_id,
  status,
  trial_start,
  trial_end,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
)
VALUES (
  'bc14941b-4cd0-4bc6-878a-da4006051880', -- User ID from browser logs
  'cus_Rpr5CFs6G0FIyG',                   -- Stripe Customer ID
  'sub_1QwBUdCtsTY6FiiZ65LzLi8c',         -- Subscription ID from webhook logs
  'price_1QwAtoCtsTY6FiiZDZ3Jo1YX',       -- Price ID from webhook logs
  'trialing',                              -- Status from webhook logs
  '2025-02-24T18:55:23Z',                 -- Trial start (from logs, timestamp 1740441323)
  '2025-03-10T18:55:23Z',                 -- Trial end (from logs, timestamp 1741650923)
  '2025-02-24T18:55:23Z',                 -- Current period start (from logs)
  '2025-03-10T18:55:23Z',                 -- Current period end (from logs)
  false,                                  -- Cancel at period end
  NOW(),                                  -- Created at
  NOW()                                   -- Updated at
)
ON CONFLICT (stripe_subscription_id) 
DO UPDATE SET
  status = EXCLUDED.status,
  trial_start = EXCLUDED.trial_start,
  trial_end = EXCLUDED.trial_end,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  cancel_at_period_end = EXCLUDED.cancel_at_period_end,
  updated_at = NOW();

-- Verify the subscription was created
SELECT * FROM customer_subscriptions 
WHERE user_id = 'bc14941b-4cd0-4bc6-878a-da4006051880'; 