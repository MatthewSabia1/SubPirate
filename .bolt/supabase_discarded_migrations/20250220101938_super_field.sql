/*
  # Add Stripe Subscriptions Support

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `stripe_customer_id` (text)
      - `stripe_subscription_id` (text)
      - `status` (subscription_status)
      - `price_id` (text)
      - `quantity` (integer)
      - `cancel_at_period_end` (boolean)
      - `cancel_at` (timestamptz)
      - `canceled_at` (timestamptz)
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `created_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `trial_start` (timestamptz)
      - `trial_end` (timestamptz)

  2. Security
    - Enable RLS on subscriptions table
    - Add policies for subscription access
*/

-- Create subscription status enum
CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'unpaid',
  'paused'
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status subscription_status NOT NULL,
  price_id text,
  quantity integer DEFAULT 1,
  cancel_at_period_end boolean DEFAULT false,
  cancel_at timestamptz,
  canceled_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Add subscription_id to profiles
ALTER TABLE profiles
ADD COLUMN subscription_id uuid REFERENCES subscriptions(id);

-- Create function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = user_uuid
    AND status IN ('trialing', 'active')
    AND (
      trial_end IS NULL OR
      trial_end > now()
    )
    AND (
      current_period_end > now()
    )
  );
END;
$$;