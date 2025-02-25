# Fixing Stripe Integration Issues

This document outlines the steps required to fix the current Stripe integration issues in the SubPirate application.

## 1. Sync Stripe Products and Prices

First, run the sync script to ensure your Stripe product and price data is properly synchronized with your database:

```bash
cd /Users/matthewsabia/SubPirate
node sync-stripe-products-commonjs.js
```

This will synchronize your Stripe products and prices with your Supabase database, ensuring all the relationships are properly established. The script specifically looks for and adds the missing product with ID `prod_RpeDBw9OteYUhH` that's causing the foreign key constraint issue.

## 2. Remove Orphaned Price Records

If you're still encountering foreign key constraint issues, you can use a simplified approach to just remove the orphaned price records first:

1. Log in to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to your project
3. Open the SQL Editor
4. Copy and paste the contents of the `docs/drop-orphaned-prices.sql` file or the following SQL:

```sql
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
```

5. Execute the SQL by clicking the "Run" button

This will identify and remove any orphaned price records that are causing issues with the foreign key constraint.

## 3. Fix the Database Schema Relationship

After removing the orphaned records, you can now execute the following SQL to fix the relationship:

1. Log in to your [Supabase Dashboard](https://app.supabase.com/) if you're not already there
2. Open the SQL Editor
3. Copy and paste the contents of the `docs/fix-stripe-schema.sql` file or the following SQL:

```sql
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
```

4. Execute the SQL by clicking the "Run" button

This will fix the relationship issue, allowing the application to properly query price data with its associated product information.

## 4. Configure the Stripe Customer Portal

The error `No configuration provided and your test mode default configuration has not been created` indicates that the Stripe Customer Portal needs to be configured in your Stripe Dashboard.

### Steps to Configure the Customer Portal:

1. **Log in to your Stripe Dashboard**: Go to [https://dashboard.stripe.com/test/](https://dashboard.stripe.com/test/) to access your test environment.

2. **Navigate to Customer Portal Settings**: 
   - Go to Settings (gear icon) in the bottom left
   - Select "Customer Portal" from the settings menu
   - Or directly visit: [https://dashboard.stripe.com/test/settings/billing/portal](https://dashboard.stripe.com/test/settings/billing/portal)

3. **Configure Basic Settings**:
   - **Branding**: Add your company name and logo
   - **Customer actions**: Enable the actions you want customers to be able to perform:
     - Update payment methods
     - Cancel subscriptions
     - Update quantities
     - Update plans

4. **Configure Products and Prices**:
   - Make sure all your products and prices are properly set up
   - Configure which products are available for switching in the portal

5. **Set Up Business Information**:
   - Add your business details, terms of service, and privacy policy URLs

6. **Save Changes**:
   - Click "Save" to apply your configuration

7. **Test the Portal**:
   - After configuration, test the portal to ensure it works correctly

## Verifying the Fixes

After applying these fixes, you should:

1. Restart your application server
2. Navigate to the pricing page to ensure products and prices are displayed correctly
3. Test the subscription process:
   - Select a plan
   - Complete the checkout process with a test card
     - Use card number: 4242 4242 4242 4242
     - Any future expiration date
     - Any 3-digit CVC
     - Any 5-digit ZIP code
4. Test the "Manage subscription" button on the Settings page
   - It should now open the Stripe Customer Portal without errors

These steps should resolve both the database relationship issue and the customer portal configuration error.

## Fixing Stripe Issues

### Missing Products in stripe_products Table

If you encounter foreign key constraint errors when adding relationships between `stripe_prices` and `stripe_products`, you need to insert the missing products first.

Run the SQL script in `docs/insert-missing-products.sql` to add these products:

```sql
-- Run this from your database interface
\i docs/insert-missing-products.sql
```

### Missing Prices in stripe_prices Table

If you encounter 406 errors like:
```
GET https://pdgnyhkngewmneujsheq.supabase.co/rest/v1/stripe_prices?select=...&id=eq.price_1QwAtoCtsTY6FiiZDZ3Jo1YX 406 (Not Acceptable)
```

It means that a subscription is referencing a price that doesn't exist in your database. Follow these steps:

1. Get the price information from Stripe (using Stripe Dashboard or API)
2. Use this information to fill in the SQL script in `docs/insert-missing-price.sql`
3. Run the script to add the missing price

```bash
# If using psql directly
psql YOUR_DATABASE_URL -f docs/insert-missing-price.sql

# If using Supabase Studio
# Copy and paste the SQL script into the SQL Editor and run it
```

### Schema Changes

When moving from `product_id` to `stripe_product_id` in the `stripe_prices` table:

1. Make sure all missing products are inserted first
2. Run the SQL commands to rename the column
3. Add the foreign key constraint

```sql
-- Rename the column if needed
ALTER TABLE stripe_prices RENAME COLUMN product_id TO stripe_product_id;

-- Add the foreign key constraint
ALTER TABLE stripe_prices ADD CONSTRAINT fk_stripe_product
FOREIGN KEY (stripe_product_id) REFERENCES stripe_products(stripe_product_id);

-- Create an index for better performance
CREATE INDEX idx_stripe_prices_product_id ON stripe_prices(stripe_product_id);
``` 