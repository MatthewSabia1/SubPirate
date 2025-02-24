import { stripe, isValidStripeWebhookEvent } from './client';
import { Database } from '@/lib/database.types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper function to update subscription status in database
async function updateSubscriptionStatus(subscription: any) {
  const { stripe_subscription_id, status, customer: stripe_customer_id } = subscription;
  
  try {
    const { data: customer } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('stripe_customer_id', stripe_customer_id)
      .single();

    if (customer) {
      await supabase
        .from('customer_subscriptions')
        .update({
          stripe_subscription_id,
          status,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .eq('stripe_customer_id', stripe_customer_id);
    }
  } catch (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

// Helper function to sync product data
async function syncProductData(product: any) {
  try {
    const { data: existingProduct } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('stripe_product_id', product.id)
      .single();

    if (existingProduct) {
      await supabase
        .from('stripe_products')
        .update({
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
        })
        .eq('stripe_product_id', product.id);
    } else {
      await supabase.from('stripe_products').insert({
        stripe_product_id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
      });
    }
  } catch (error) {
    console.error('Error syncing product data:', error);
    throw error;
  }
}

// Helper function to sync price data
async function syncPriceData(price: any) {
  try {
    const { data: existingPrice } = await supabase
      .from('stripe_prices')
      .select('*')
      .eq('stripe_price_id', price.id)
      .single();

    if (existingPrice) {
      await supabase
        .from('stripe_prices')
        .update({
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring_interval: price.recurring?.interval,
          recurring_interval_count: price.recurring?.interval_count,
          active: price.active,
          metadata: price.metadata,
        })
        .eq('stripe_price_id', price.id);
    } else {
      await supabase.from('stripe_prices').insert({
        stripe_price_id: price.id,
        stripe_product_id: price.product,
        currency: price.currency,
        unit_amount: price.unit_amount,
        recurring_interval: price.recurring?.interval,
        recurring_interval_count: price.recurring?.interval_count,
        active: price.active,
        metadata: price.metadata,
      });
    }
  } catch (error) {
    console.error('Error syncing price data:', error);
    throw error;
  }
}

// Main webhook handler
export async function handleWebhookEvent(
  event: any,
  signature: string,
  webhookSecret: string
) {
  try {
    // Verify webhook signature
    const stripeEvent = stripe.webhooks.constructEvent(
      event,
      signature,
      webhookSecret
    );

    if (!isValidStripeWebhookEvent(stripeEvent)) {
      throw new Error('Invalid Stripe webhook event');
    }

    // Handle different event types
    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await updateSubscriptionStatus(stripeEvent.data.object);
        break;

      case 'product.created':
      case 'product.updated':
        await syncProductData(stripeEvent.data.object);
        break;

      case 'price.created':
      case 'price.updated':
        await syncPriceData(stripeEvent.data.object);
        break;

      // Add more event handlers as needed
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
} 