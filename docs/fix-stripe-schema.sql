-- fix-stripe-schema.sql
-- This script fixes the relationship between stripe_prices and stripe_products tables
-- Run this AFTER removing orphaned records with drop-orphaned-prices.sql

-- First verify the column name
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'stripe_prices' AND column_name IN ('product_id', 'stripe_product_id');

-- Now rename the product_id column to stripe_product_id if it's still named product_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stripe_prices' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE stripe_prices RENAME COLUMN product_id TO stripe_product_id;
  END IF;
END
$$;

-- Ensure the stripe_product_id column is properly typed
ALTER TABLE IF EXISTS stripe_prices 
ALTER COLUMN stripe_product_id TYPE text;

-- Check that there are no orphaned records before adding constraint
SELECT COUNT(*) AS orphaned_records
FROM stripe_prices p
LEFT JOIN stripe_products s ON p.stripe_product_id = s.stripe_product_id
WHERE s.stripe_product_id IS NULL;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_stripe_product' AND table_name = 'stripe_prices'
  ) THEN
    ALTER TABLE stripe_prices
    ADD CONSTRAINT fk_stripe_product
    FOREIGN KEY (stripe_product_id)
    REFERENCES stripe_products(stripe_product_id)
    ON DELETE CASCADE;
  END IF;
END
$$;

-- Ensure there's an index on stripe_product_id for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_prices_product_id ON stripe_prices(stripe_product_id);

-- Verify that the constraint was added
SELECT * 
FROM information_schema.table_constraints 
WHERE constraint_name = 'fk_stripe_product' AND table_name = 'stripe_prices'; 