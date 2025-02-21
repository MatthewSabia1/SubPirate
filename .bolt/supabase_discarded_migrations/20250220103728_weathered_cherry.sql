/*
  # Add support for dynamic subscription tiers

  1. New Tables
    - `subscription_tiers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `stripe_price_id` (text)
      - `price` (integer)
      - `interval` (text)
      - `features` (text[])
      - `active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `tier_id` to subscriptions table
    - Add RLS policies for subscription tiers
*/

-- Create subscription tiers table
CREATE TABLE subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  stripe_price_id text NOT NULL UNIQUE,
  price integer NOT NULL,
  interval text NOT NULL,
  features text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add tier_id to subscriptions
ALTER TABLE subscriptions
ADD COLUMN tier_id uuid REFERENCES subscription_tiers(id);

-- Enable RLS
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Service role can manage tiers"
  ON subscription_tiers
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to update tier timestamps
CREATE OR REPLACE FUNCTION update_tier_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updating timestamps
CREATE TRIGGER update_tier_updated_at
  BEFORE UPDATE ON subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_updated_at();