# Setting Up the Stripe Customer Portal

To fix the "No configuration provided" error when accessing the customer portal, you need to configure the Stripe Customer Portal in your Stripe dashboard.

## Steps to Configure the Customer Portal

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
   - You can create a test customer and subscription, then access the portal

## Code Implementation

The code to create a customer portal session is already correctly implemented in your application:

```javascript
export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}
```

## Additional Configuration Options

You can also configure additional options when creating a portal session:

```javascript
export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
    // Optional configuration for this specific session
    configuration: {
      business_profile: {
        headline: 'Manage your subscription',
      },
      features: {
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          proration_behavior: 'none',
        },
        subscription_update: {
          enabled: true,
          products: ['prod_ABC123', 'prod_DEF456'],
          proration_behavior: 'always_invoice',
        },
      },
    },
  });
}
```

Remember that the configuration in the Stripe dashboard will serve as the default for all customer portal sessions. 