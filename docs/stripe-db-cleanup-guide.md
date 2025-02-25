# Stripe Database Cleanup Guide

This guide explains how to clean up your Stripe-related database tables, removing test and unused products and prices while preserving the essential data.

## Current Database State

As of the analysis on February 25, 2025, the database contains:
- 56 products in the `stripe_products` table
- 47 prices in the `stripe_prices` table

Most of these are test products and prices created by the Stripe CLI or automatically added to fix database constraints. We need to clean these up and keep only the official subscription tiers and their associated prices.

## Products to Keep

We'll keep the following products:
1. **Tier Products**:
   - `prod_RpekF2EAu1npzb` - Starter
   - `prod_RpekhttqS8GKpE` - Creator
   - `prod_RpekrPRCVGOqJM` - Pro
   - `prod_Rpek1uw0yBJmLG` - Agency

2. **Legacy Products** (referenced in `product_features`):
   - `prod_starter`
   - `prod_creator`
   - `prod_pro`
   - `prod_agency`

## Prices to Keep

We'll keep the following prices:
1. **Tier Prices**:
   - `price_1QvzQXCtsTY6FiiZniXOiFkM` - Starter ($19.99)
   - `price_1QvzQlCtsTY6FiiZdZlSfPJc` - Creator ($34.99)
   - `price_1QvzQyCtsTY6FiiZD1DOaPJi` - Pro ($47.99)
   - `price_1QvzRBCtsTY6FiiZEtKt3SYA` - Agency ($97.99)

2. **Referenced Price** (in `customer_subscriptions`):
   - `price_1QwAtoCtsTY6FiiZDZ3Jo1YX` - $19.00

## Running the Cleanup Script

1. Open your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy the content of `docs/stripe-db-cleanup.sql` into the editor
4. Run the script

Alternatively, if you have PostgreSQL client installed locally:

```bash
psql YOUR_DATABASE_URL -f docs/stripe-db-cleanup.sql
```

## What the Script Does

1. Updates the orphaned price to have a valid product reference
2. Deletes all prices except the ones we want to keep
3. Deletes all products except the ones we want to keep
4. Fixes product descriptions for the official products if they're empty
5. Makes sure all remaining products and prices are marked as active
6. Displays a verification report of the remaining products and prices

## After Running the Script

After running the cleanup script, your database should contain:
- 8 products in the `stripe_products` table (4 current tier products and 4 legacy products)
- 5 prices in the `stripe_prices` table (4 tier prices and 1 referenced in a subscription)

## Updating Your Sync Script

The Stripe synchronization script (`src/lib/stripe/sync-products.js`) has been updated to prevent future database clutter:

1. It now includes lists of official product and price IDs to track
2. It filters out test products using these criteria:
   - Products created by the Stripe CLI
   - Products with "test" in the name or description
   - Products that aren't in the official list

This update ensures that only legitimate products and prices are synchronized with your database, preventing the accumulation of test data and keeping your database clean.

### What's New in the Sync Script

- Added `OFFICIAL_PRODUCT_IDS` array to track important product IDs
- Added `OFFICIAL_PRICE_IDS` array to track important price IDs
- Added smart filtering functions to detect test products:
  - `isTestProduct()` checks for test indicators in products
  - `isTestPrice()` identifies test prices based on various criteria
- Modified the synchronization logic to filter products and prices before adding them
- Added improved logging to track what's being filtered
- Maintained backward compatibility with existing code

### Running the Updated Script

The updated script can be run with the same command:

```bash
npm run stripe:sync
```

This will now synchronize only the legitimate products and prices while filtering out test data.

### Additional Maintenance

Even with the updated script, it's a good practice to periodically check your database for test or unused products and prices. The cleanup script in this guide can be run whenever needed to clean up any accumulated test data. 