-- Stripe Database Cleanup Script
-- This script cleans up the Stripe-related database tables, removing test and unused entries
-- Run this in your Supabase SQL Editor or via psql

-- Start a transaction
BEGIN;

-- 1. First, update the orphaned price to have a valid product reference
UPDATE stripe_prices
SET stripe_product_id = 'prod_starter'
WHERE id = 'price_1QwAtoCtsTY6FiiZDZ3Jo1YX' AND stripe_product_id IS NULL;

-- 2. Delete prices that are not in our keep list
DELETE FROM stripe_prices
WHERE id NOT IN (
    'price_1QvzQXCtsTY6FiiZniXOiFkM', -- Starter - $19.99
    'price_1QvzQlCtsTY6FiiZdZlSfPJc', -- Creator - $34.99
    'price_1QvzQyCtsTY6FiiZD1DOaPJi', -- Pro - $47.99
    'price_1QvzRBCtsTY6FiiZEtKt3SYA',  -- Agency - $97.99
    'price_1QwAtoCtsTY6FiiZDZ3Jo1YX'   -- Price referenced in customer_subscriptions
);

-- 3. Delete products that are not in our keep list
DELETE FROM stripe_products
WHERE stripe_product_id NOT IN (
    'prod_RpekF2EAu1npzb', -- Starter
    'prod_RpekhttqS8GKpE', -- Creator
    'prod_RpekrPRCVGOqJM', -- Pro
    'prod_Rpek1uw0yBJmLG', -- Agency
    'prod_starter',
    'prod_creator',
    'prod_pro',
    'prod_agency'
)
-- Also keep products referenced by active prices that we kept
AND stripe_product_id NOT IN (
    SELECT DISTINCT stripe_product_id 
    FROM stripe_prices 
    WHERE stripe_product_id IS NOT NULL
);

-- 4. Fix product descriptions for the official products if they're empty
UPDATE stripe_products
SET description = 'Essential features for getting started with Reddit marketing'
WHERE stripe_product_id = 'prod_RpekF2EAu1npzb' AND (description IS NULL OR description = '');

UPDATE stripe_products
SET description = 'Perfect for content creators and growing brands'
WHERE stripe_product_id = 'prod_RpekhttqS8GKpE' AND (description IS NULL OR description = '');

UPDATE stripe_products
SET description = 'Advanced features for professional marketers'
WHERE stripe_product_id = 'prod_RpekrPRCVGOqJM' AND (description IS NULL OR description = '');

UPDATE stripe_products
SET description = 'Full platform access for marketing teams and agencies'
WHERE stripe_product_id = 'prod_Rpek1uw0yBJmLG' AND (description IS NULL OR description = '');

-- 5. Make sure all products are marked as active
UPDATE stripe_products
SET active = true
WHERE active IS NULL OR active = false;

-- 6. Make sure all prices are marked as active
UPDATE stripe_prices
SET active = true
WHERE active IS NULL OR active = false;

-- Commit the transaction
COMMIT;

-- Verify the cleanup results
SELECT 'Products after cleanup' as report, COUNT(*) as count FROM stripe_products
UNION ALL
SELECT 'Prices after cleanup', COUNT(*) FROM stripe_prices;

-- Show the remaining products
SELECT stripe_product_id, name, description, active
FROM stripe_products
ORDER BY name;

-- Show the remaining prices
SELECT p.id, p.unit_amount/100.0 as amount_usd, p.recurring_interval, prod.name as product_name
FROM stripe_prices p
JOIN stripe_products prod ON p.stripe_product_id = prod.stripe_product_id
ORDER BY p.unit_amount; 