-- Comprehensive Stripe Data Synchronization Script
-- This script will identify and fix all issues related to Stripe products and prices
-- Run this script before going to production to ensure all data is properly synchronized

-----------------------------------------
-- PART 1: VERIFY AND FIX PRODUCT ISSUES
-----------------------------------------

-- 1.1 Identify any missing products referenced by prices
SELECT 'Missing products check' as operation;
SELECT p.stripe_product_id AS missing_product_id, COUNT(*) as price_count
FROM stripe_prices p
LEFT JOIN stripe_products s ON p.stripe_product_id = s.stripe_product_id
WHERE s.stripe_product_id IS NULL
GROUP BY p.stripe_product_id;

-- 1.2 Insert placeholder products for any missing ones
-- Note: These should be updated later with correct information from Stripe
DO $$
DECLARE
    missing_product_id text;
BEGIN
    FOR missing_product_id IN 
        SELECT DISTINCT p.stripe_product_id
        FROM stripe_prices p
        LEFT JOIN stripe_products s ON p.stripe_product_id = s.stripe_product_id
        WHERE s.stripe_product_id IS NULL
    LOOP
        INSERT INTO stripe_products (
            stripe_product_id,
            name,
            description,
            active,
            created_at,
            updated_at
        ) VALUES (
            missing_product_id,
            'Auto-created Product',
            'This product was automatically created to fix database constraints. Update with correct info from Stripe.',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (stripe_product_id) DO NOTHING;
        
        RAISE NOTICE 'Added missing product: %', missing_product_id;
    END LOOP;
END $$;

-----------------------------------------
-- PART 2: VERIFY AND FIX PRICE ISSUES
-----------------------------------------

-- 2.1 Check column names to ensure stripe_product_id is used
SELECT 'Column check' as operation;
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'stripe_prices' AND column_name IN ('product_id', 'stripe_product_id');

-- 2.2 Rename product_id to stripe_product_id if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stripe_prices' AND column_name = 'product_id'
    ) THEN
        ALTER TABLE stripe_prices RENAME COLUMN product_id TO stripe_product_id;
        RAISE NOTICE 'Renamed product_id column to stripe_product_id';
    ELSE
        RAISE NOTICE 'Column is already named stripe_product_id';
    END IF;
END $$;

-- 2.3 Check for missing price referenced in customer_subscriptions
SELECT 'Missing prices check' as operation;
SELECT cs.id as subscription_id, cs.stripe_price_id as missing_price_id
FROM customer_subscriptions cs
LEFT JOIN stripe_prices sp ON cs.stripe_price_id = sp.id
WHERE sp.id IS NULL;

-- 2.4 Insert placeholder prices for missing ones
-- Note: These will need to be updated later with correct information from Stripe
DO $$
DECLARE
    missing_record RECORD;
BEGIN
    FOR missing_record IN 
        SELECT cs.id as subscription_id, cs.stripe_price_id, cs.stripe_subscription_id
        FROM customer_subscriptions cs
        LEFT JOIN stripe_prices sp ON cs.stripe_price_id = sp.id
        WHERE sp.id IS NULL
    LOOP
        -- Get product ID from the subscription if possible, otherwise use a default
        DECLARE
            product_id text := 'prod_default';
        BEGIN
            -- Try to find a product ID in other prices with the same pattern
            SELECT stripe_product_id INTO product_id
            FROM stripe_prices
            WHERE id LIKE SUBSTRING(missing_record.stripe_price_id FROM 1 FOR 10) || '%'
            LIMIT 1;
            
            -- If still not found, use known product IDs based on price range
            IF product_id = 'prod_default' THEN
                -- Use default tier pricing based on standard tiers
                product_id := 'prod_starter';  -- Default to starter tier if we can't determine
            END IF;
            
            INSERT INTO stripe_prices (
                id,
                stripe_product_id,
                unit_amount,
                currency,
                type,
                recurring_interval,
                active,
                created_at,
                updated_at
            ) VALUES (
                missing_record.stripe_price_id,
                product_id,
                1900, -- Default to $19.00 USD as a placeholder price
                'usd', -- Default to USD
                'recurring',
                'month',
                true,
                NOW(),
                NOW()
            )
            ON CONFLICT (id) DO NOTHING;
            
            RAISE NOTICE 'Added missing price: % for product: %', missing_record.stripe_price_id, product_id;
        END;
    END LOOP;
END $$;

-----------------------------------------
-- PART 3: ENSURE PROPER RELATIONSHIPS
-----------------------------------------

-- 3.1 Ensure the stripe_product_id column is properly typed
ALTER TABLE IF EXISTS stripe_prices 
ALTER COLUMN stripe_product_id TYPE text;

-- 3.2 Check that there are no orphaned records after our fixes
SELECT 'Orphaned records check' as operation;
SELECT COUNT(*) AS orphaned_records
FROM stripe_prices p
LEFT JOIN stripe_products s ON p.stripe_product_id = s.stripe_product_id
WHERE s.stripe_product_id IS NULL;

-- 3.3 Add foreign key constraint if it doesn't exist
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
        
        RAISE NOTICE 'Added foreign key constraint: fk_stripe_product';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- 3.4 Ensure there's an index on stripe_product_id for better performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'stripe_prices' AND indexname = 'idx_stripe_prices_product_id'
    ) THEN
        CREATE INDEX idx_stripe_prices_product_id ON stripe_prices(stripe_product_id);
        RAISE NOTICE 'Added index: idx_stripe_prices_product_id';
    ELSE
        RAISE NOTICE 'Index already exists';
    END IF;
END $$;

-----------------------------------------
-- PART 4: VALIDATION
-----------------------------------------

-- 4.1 Verify that the constraints were added
SELECT 'Constraint verification' as operation;
SELECT * 
FROM information_schema.table_constraints 
WHERE constraint_name = 'fk_stripe_product' AND table_name = 'stripe_prices';

-- 4.2 Verify all customer subscriptions have valid price references
SELECT 'Subscription validation' as operation;
SELECT COUNT(*) AS subscriptions_with_missing_prices
FROM customer_subscriptions cs
LEFT JOIN stripe_prices sp ON cs.stripe_price_id = sp.id
WHERE sp.id IS NULL;

-- 4.3 Perform a sample join to verify data integrity
SELECT 'Data integrity check' as operation;
SELECT 
    cs.id AS subscription_id,
    cs.stripe_price_id,
    sp.stripe_product_id,
    prod.name AS product_name
FROM customer_subscriptions cs
JOIN stripe_prices sp ON cs.stripe_price_id = sp.id
JOIN stripe_products prod ON sp.stripe_product_id = prod.stripe_product_id
LIMIT 5;

-- End of script
SELECT 'Database synchronization complete' as status; 