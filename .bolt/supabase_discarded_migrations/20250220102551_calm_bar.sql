/*
  # Add Stripe webhook handling

  1. New Tables
    - `stripe_events` - Store processed Stripe webhook events
      - `id` (text, primary key) - Stripe event ID
      - `type` (text) - Event type
      - `status` (text) - Processing status
      - `created_at` (timestamptz) - When event was received
      - `processed_at` (timestamptz) - When event was processed

  2. Security
    - Enable RLS on stripe_events table
    - Add policy for service role access
*/

-- Create stripe_events table
CREATE TABLE stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  data jsonb
);

-- Enable RLS
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage stripe events"
  ON stripe_events
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX stripe_events_type_idx ON stripe_events (type);
CREATE INDEX stripe_events_status_idx ON stripe_events (status);
CREATE INDEX stripe_events_created_at_idx ON stripe_events (created_at);

-- Add function to handle subscription updates
CREATE OR REPLACE FUNCTION handle_subscription_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update subscription status
  UPDATE subscriptions
  SET 
    status = NEW.status::subscription_status,
    current_period_start = NEW.current_period_start,
    current_period_end = NEW.current_period_end,
    cancel_at = NEW.cancel_at,
    canceled_at = NEW.canceled_at,
    trial_start = NEW.trial_start,
    trial_end = NEW.trial_end,
    ended_at = NEW.ended_at
  WHERE stripe_subscription_id = NEW.stripe_subscription_id;

  RETURN NEW;
END;
$$;