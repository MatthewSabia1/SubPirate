-- This script inserts the missing price record into the stripe_prices table
-- Run this script to fix the 406 error when fetching subscription data

-- First, check if the price already exists to avoid duplicate errors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM stripe_prices WHERE id = 'price_1QwAtoCtsTY6FiiZDZ3Jo1YX') THEN
        -- Insert the missing price
        -- Note: You may need to adjust the product ID, amount, and other details based on the actual Stripe data
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
            'price_1QwAtoCtsTY6FiiZDZ3Jo1YX',  -- The missing price ID from the error
            'prod_starter',                     -- Replace with the correct product ID from stripe_products
            1000,                               -- Replace with the actual amount in cents
            'usd',                              -- Replace with the actual currency
            'recurring',                        -- Assuming it's a recurring subscription
            'month',                            -- Assuming monthly billing
            true,                               -- Setting as active
            NOW(),                              -- Current timestamp
            NOW()                               -- Current timestamp
        );
        
        RAISE NOTICE 'Missing price record inserted successfully';
    ELSE
        RAISE NOTICE 'Price record already exists';
    END IF;
END $$;

-- Verify the price exists now
SELECT * FROM stripe_prices WHERE id = 'price_1QwAtoCtsTY6FiiZDZ3Jo1YX'; 