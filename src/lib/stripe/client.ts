import Stripe from 'stripe';
import { Database } from '@/lib/database.types';

// Use Vite's import.meta.env instead of process.env
const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
  telemetry: false,
  maxNetworkRetries: 2,
});

// Helper type for Stripe Product with expanded price data
type StripeProductWithPrice = Stripe.Product & {
  default_price: Stripe.Price;
};

// Helper functions for Stripe operations
export async function getActiveProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  });
  return products.data;
}

export async function getActivePrices() {
  const prices = await stripe.prices.list({
    active: true,
    type: 'recurring',
  });
  return prices.data;
}

export async function createCustomer(params: {
  email: string;
  name: string;
}) {
  return stripe.customers.create({
    email: params.email,
    name: params.name,
  });
}

export interface CheckoutOptions {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession({ priceId, successUrl, cancelUrl }: CheckoutOptions) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14,
    },
    allow_promotion_codes: true,
    automatic_tax: {
      enabled: true,
    },
    customer_email: undefined, // Will be collected in Checkout
    billing_address_collection: 'required',
    tax_id_collection: {
      enabled: true,
    },
  });
  
  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }
  
  return session;
}

export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}

// Type guard for Stripe webhook events
export function isValidStripeWebhookEvent(
  event: any
): event is Stripe.Event {
  return (
    typeof event === 'object' &&
    event !== null &&
    typeof event.type === 'string' &&
    typeof event.id === 'string' &&
    typeof event.object === 'string' &&
    event.object === 'event'
  );
} 