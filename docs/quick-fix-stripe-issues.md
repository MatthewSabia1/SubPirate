# Quick Fix Guide for Stripe Integration Issues

This guide provides straightforward steps to fix Stripe integration issues in your SubPirate application.

## 1. Fix Database Schema Issues

1. Log in to your Supabase Dashboard
2. Open the SQL Editor
3. Copy and paste the contents from `docs/sync-stripe-data.sql`
4. Run the script to fix all database issues:
   - Missing products
   - Missing prices
   - Column naming
   - Foreign key constraints

## 2. Sync Data with Stripe

After fixing the database structure, sync your products and prices with Stripe:

```bash
# Run from your project root
npm run stripe:sync
```

This will:
- Fetch all products and prices from Stripe
- Add any missing ones to your database
- Fix missing prices referenced in subscriptions

## 3. Update Your Frontend Code

If your application is still having issues with Stripe integration, check:

1. Column name references in queries (make sure they match the database schema)
2. In `FeatureAccessContext.tsx`, ensure you're using `id` instead of `stripe_price_id` in queries

## 4. Configure Stripe Customer Portal

If you see the "No configuration provided" error:

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/test/)
2. Go to Settings > Customer Portal (or visit https://dashboard.stripe.com/test/settings/billing/portal)
3. Configure the basic settings:
   - Set branding (logo, colors)
   - Enable customer actions (update payment methods, cancel subscriptions, etc.)
   - Configure product options
4. Save your changes

## 5. Rebuild and Test

After making all changes:

1. Rebuild your application:
```bash
npm run build
```

2. Start your application:
```bash
npm run dev
```

3. Test the subscription flow:
   - Create a new subscription
   - Access the customer portal
   - Update subscription details
   - Cancel subscription

## Troubleshooting Common Issues

### Missing Database Columns
If you see errors about missing columns:
- Check column names in the database and make sure your code is referencing them correctly
- Use `stripe_product_id` instead of `product_id` in queries

### Foreign Key Constraints
If you encounter foreign key constraint errors:
- Run the SQL script in step 1 to fix missing relationships
- Make sure all referenced products exist in the database

### Stripe Webhook Issues
If webhooks aren't working:
- Make sure your webhook listener is running (`stripe listen --forward-to...`)
- Check that your webhook endpoint is correctly configured in Stripe Dashboard
- Verify the signing secret is properly set in your environment variables 