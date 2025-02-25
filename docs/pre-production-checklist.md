# Stripe Integration Pre-Production Checklist

This checklist will help ensure your Stripe integration is fully configured and working correctly before going to production.

## Database Synchronization

- [ ] Run the comprehensive sync script to fix all potential issues:
  ```sql
  -- Run this from your Supabase SQL Editor
  \i docs/sync-stripe-data.sql
  ```

- [ ] Verify all webhooks are properly configured and working:
  - [ ] Check webhook endpoint is accessible at `/api/stripe/webhook`
  - [ ] Ensure webhook signing secret is correctly set in environment variables
  - [ ] Test a subscription creation and verify webhook handling

## Payment and Subscription Flow Testing

- [ ] Test the entire subscription flow with each pricing tier:
  - [ ] Starter plan ($19/mo)
  - [ ] Creator plan ($34/mo)
  - [ ] Pro plan ($49/mo) 
  - [ ] Agency plan ($97/mo)

- [ ] Test subscription management:
  - [ ] Upgrade subscription
  - [ ] Downgrade subscription
  - [ ] Update payment method
  - [ ] Cancel subscription

- [ ] Test subscription renewal (can be tested in test mode by advancing time in Stripe Dashboard)

## Environment Configuration

- [ ] Ensure proper environment variables are set:
  ```
  STRIPE_SECRET_KEY=sk_live_... (production)
  STRIPE_PUBLISHABLE_KEY=pk_live_... (production)
  STRIPE_WEBHOOK_SECRET=whsec_... (production webhook secret)
  ```

- [ ] Double-check you're using the correct Stripe API keys:
  - [ ] Test keys (`sk_test_...`) for development/testing
  - [ ] Live keys (`sk_live_...`) for production

## Stripe Dashboard Configuration

- [ ] Configure Customer Portal settings:
  - [ ] Visit: https://dashboard.stripe.com/settings/billing/portal
  - [ ] Configure branding (logo, colors, business name)
  - [ ] Set up customer permissions (update payment methods, cancel subscription, etc.)
  - [ ] Configure product change options (which plans can be switched to/from)

- [ ] Configure Email settings:
  - [ ] Visit: https://dashboard.stripe.com/settings/billing/automatic
  - [ ] Set up email templates for receipts, upcoming charges, etc.
  - [ ] Configure From email and reply-to addresses

- [ ] Ensure tax settings are properly configured (if applicable):
  - [ ] Visit: https://dashboard.stripe.com/tax/settings

## Data Verification

- [ ] Verify all products exist in both Stripe and your database:
  ```sql
  -- Run in Supabase SQL Editor
  SELECT stripe_product_id, name FROM stripe_products;
  ```

- [ ] Verify all prices exist in both Stripe and your database:
  ```sql
  -- Run in Supabase SQL Editor
  SELECT id, stripe_product_id, unit_amount, currency FROM stripe_prices;
  ```

- [ ] Check all database constraints are properly set up:
  ```sql
  -- Run in Supabase SQL Editor
  SELECT * 
  FROM information_schema.table_constraints 
  WHERE table_name = 'stripe_prices';
  ```

## Application Behavior

- [ ] Verify proper tier assignment based on subscription:
  - [ ] Subscribe to each tier and check that the appropriate features are enabled
  - [ ] Test feature access control for each tier

- [ ] Check error handling for subscription-related actions:
  - [ ] Payment failure handling
  - [ ] Subscription creation failure
  - [ ] API error handling

- [ ] Test application behavior when Stripe services are unavailable:
  - [ ] Default gracefully to free tier
  - [ ] Show appropriate error messages

## Security

- [ ] Ensure sensitive Stripe operations only occur server-side
- [ ] Verify webhook signature verification is implemented
- [ ] Check for proper error handling that doesn't expose sensitive information

## Documentation

- [ ] Update internal documentation with Stripe integration details
- [ ] Document how to handle common Stripe-related issues
- [ ] Create customer-facing FAQs about subscription management

## Final Steps

- [ ] Perform a final end-to-end test of the entire payment flow
- [ ] Set up monitoring for Stripe-related errors
- [ ] Establish a process for handling subscription-related customer support issues

Once all items on this checklist have been completed, your Stripe integration should be ready for production use.

## Additional Resources

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe Go-Live Checklist](https://stripe.com/docs/go-live-checklist)
- [Handling Production Issues](https://support.stripe.com) 