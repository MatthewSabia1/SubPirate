-- drop-orphaned-prices.sql
-- This script identifies and removes any orphaned price records (where the product doesn't exist)
-- Run this first if you're having issues with foreign key constraints

-- First, identify and list orphaned price records
SELECT p.id, p.product_id
FROM stripe_prices p
LEFT JOIN stripe_products s ON p.product_id = s.stripe_product_id
WHERE s.stripe_product_id IS NULL;

-- Delete orphaned records
DELETE FROM stripe_prices 
WHERE product_id IN (
  SELECT p.product_id
  FROM stripe_prices p
  LEFT JOIN stripe_products s ON p.product_id = s.stripe_product_id
  WHERE s.stripe_product_id IS NULL
);

-- Check the result
SELECT COUNT(*) FROM stripe_prices;

-- Display any remaining orphaned records (should be none)
SELECT p.id, p.product_id
FROM stripe_prices p
LEFT JOIN stripe_products s ON p.product_id = s.stripe_product_id
WHERE s.stripe_product_id IS NULL; 