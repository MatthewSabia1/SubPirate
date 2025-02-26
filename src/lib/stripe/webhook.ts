import { stripe, isValidStripeWebhookEvent } from './client';
import { Database } from '../database.types';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

// Helper function to update subscription status in database
async function updateSubscriptionStatus(subscription: any) {
  const { id: stripe_subscription_id, status, customer: stripe_customer_id } = subscription;
  
  try {
    console.log(`Processing subscription update: ${stripe_subscription_id} for customer ${stripe_customer_id}`);
    
    // Get subscription data from database
    const { data: existingSubscription } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('stripe_customer_id', stripe_customer_id)
      .single();

    // Prepare subscription data
    const subscriptionData = {
      stripe_subscription_id,
      stripe_customer_id,
      status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    };

    if (existingSubscription) {
      console.log(`Updating existing subscription for customer ${stripe_customer_id}`);
      // Update existing subscription
      await supabase
        .from('customer_subscriptions')
        .update(subscriptionData)
        .eq('stripe_customer_id', stripe_customer_id);
    } else {
      console.log(`Creating new subscription for customer ${stripe_customer_id}`);
      
      // Try to get customer info from Stripe
      const stripeCustomer = await stripe.customers.retrieve(stripe_customer_id) as any;
      
      // Extract user_id from metadata
      const user_id = stripeCustomer.metadata?.user_id;
      
      if (!user_id) {
        console.error(`No user_id found for customer ${stripe_customer_id}`);
        return;
      }
      
      // Create new subscription
      await supabase.from('customer_subscriptions').insert({
        ...subscriptionData,
        user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

// Helper function to handle invoice payment success
async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await updateSubscriptionStatus(subscription);
    }
  } catch (error) {
    console.error('Error handling invoice payment success:', error);
    throw error;
  }
}

// Helper function to handle invoice payment failure
async function handleInvoicePaymentFailed(invoice: any) {
  try {
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      await updateSubscriptionStatus(subscription);
      
      // TODO: Implement notification system for failed payments
      console.log(`Payment failed for subscription: ${invoice.subscription}`);
    }
  } catch (error) {
    console.error('Error handling invoice payment failure:', error);
    throw error;
  }
}

// New helper function to extract features from product metadata
function extractFeaturesFromMetadata(metadata: Record<string, any>): Array<{key: string, enabled: boolean, limit?: number | null}> {
  if (!metadata) return [];
  
  // First look for feature_* keys that indicate enabled features
  const featureKeys = Object.keys(metadata)
    .filter(key => key.startsWith('feature_'))
    .map(key => ({
      key: key.replace('feature_', ''),
      enabled: metadata[key] === 'true' || metadata[key] === true,
      limit: null as number | null
    }));
  
  // Then look for feature_limit_* keys that indicate feature limits
  Object.keys(metadata)
    .filter(key => key.startsWith('feature_limit_'))
    .forEach(key => {
      const featureKey = key.replace('feature_limit_', '');
      const limit = parseInt(metadata[key], 10);
      
      // Find if we already have this feature from the enabled flags
      const existingFeature = featureKeys.find(f => f.key === featureKey);
      if (existingFeature) {
        existingFeature.limit = isNaN(limit) ? null : limit;
      } else {
        // If not found, add it as a new feature with default enabled=true
        featureKeys.push({
          key: featureKey,
          enabled: true,
          limit: isNaN(limit) ? null : limit
        });
      }
    });
  
  return featureKeys;
}

// Helper function to sync product data
async function syncProductData(product: any) {
  try {
    console.log(`Syncing product data for product ${product.id}`);
    
    const { data: existingProduct } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('stripe_product_id', product.id)
      .single();

    // Extract features from metadata
    const featureKeys = extractFeaturesFromMetadata(product.metadata || {});

    if (existingProduct) {
      await supabase
        .from('stripe_products')
        .update({
          name: product.name,
          description: product.description,
          active: product.active,
          metadata: product.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_product_id', product.id);
    } else {
      await supabase.from('stripe_products').insert({
        stripe_product_id: product.id,
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    // Update product features if metadata contains feature information
    if (featureKeys.length > 0) {
      await syncProductFeatures(product.id, featureKeys);
    } else {
      console.log(`No features found in metadata for product ${product.id}`);
    }
    
    console.log(`Successfully synced product ${product.id}`);
  } catch (error) {
    console.error('Error syncing product data:', error);
    throw error;
  }
}

// Update helper function to sync product features with limit support
async function syncProductFeatures(
  productId: string, 
  features: Array<{key: string, enabled: boolean, limit?: number | null}>
) {
  try {
    console.log(`Syncing features for product ${productId}: ${features.map(f => f.key).join(', ')}`);
    
    // Get existing features for this product
    const { data: existingFeatures } = await supabase
      .from('product_features')
      .select('*')
      .eq('stripe_product_id', productId);
    
    // Create a lookup map of existing features for quick access
    const existingFeatureMap = new Map();
    if (existingFeatures) {
      existingFeatures.forEach(feature => {
        existingFeatureMap.set(feature.feature_key, feature);
      });
    }
    
    // Process each feature from metadata
    for (const feature of features) {
      // Store limit in metadata if provided
      const featureMetadata = feature.limit !== undefined && feature.limit !== null
        ? { limit: feature.limit }
        : null;
        
      if (existingFeatureMap.has(feature.key)) {
        // Update existing feature
        await supabase
          .from('product_features')
          .update({
            enabled: feature.enabled,
            metadata: featureMetadata
          })
          .eq('stripe_product_id', productId)
          .eq('feature_key', feature.key);
      } else {
        // Check if the feature exists in the subscription_features table
        const { data: featureExists } = await supabase
          .from('subscription_features')
          .select('feature_key')
          .eq('feature_key', feature.key)
          .single();
        
        // If the feature doesn't exist in the subscription_features table, create it
        if (!featureExists) {
          // Create a formatted name and description from the key
          const featureName = feature.key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l: string) => l.toUpperCase());
          
          await supabase
            .from('subscription_features')
            .insert({
              feature_key: feature.key,
              name: featureName,
              description: feature.limit !== undefined && feature.limit !== null
                ? `${featureName} (Limit: ${feature.limit})`
                : featureName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
        
        // Create new product feature mapping
        await supabase
          .from('product_features')
          .insert({
            stripe_product_id: productId,
            feature_key: feature.key,
            enabled: feature.enabled,
            metadata: featureMetadata,
            created_at: new Date().toISOString()
          });
      }
    }
    
    console.log(`Successfully synced features for product ${productId}`);
  } catch (error) {
    console.error('Error syncing product features:', error);
    throw error;
  }
}

// Helper function to sync price data
async function syncPriceData(price: any) {
  try {
    const { data: existingPrice } = await supabase
      .from('stripe_prices')
      .select('*')
      .eq('id', price.id)
      .single();

    if (existingPrice) {
      await supabase
        .from('stripe_prices')
        .update({
          currency: price.currency,
          unit_amount: price.unit_amount,
          recurring_interval: price.recurring?.interval,
          type: price.type,
          active: price.active,
          product_id: price.product,
          updated_at: new Date().toISOString(),
        })
        .eq('id', price.id);
    } else {
      await supabase.from('stripe_prices').insert({
        id: price.id,
        product_id: price.product,
        currency: price.currency,
        unit_amount: price.unit_amount,
        recurring_interval: price.recurring?.interval,
        type: price.type,
        active: price.active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error syncing price data:', error);
    throw error;
  }
}

// Helper function to handle checkout session completed
async function handleCheckoutSessionCompleted(session: any) {
  try {
    console.log('Processing checkout.session.completed event', session.id);
    
    if (session.subscription) {
      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Get price details
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      
      // Get customer details
      const customerId = session.customer;
      const customer = await stripe.customers.retrieve(customerId) as any;
      
      const userId = customer.metadata?.user_id;
      
      if (!userId) {
        console.error(`No user_id found in customer metadata for ${customerId}`);
        return;
      }

      console.log(`Found user_id ${userId} for customer ${customerId}`);
      
      // Check if subscription record already exists
      const { data: existingSubscription } = await supabase
        .from('customer_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      // Check if price exists in our database
      const { data: existingPrice } = await supabase
        .from('stripe_prices')
        .select('*')
        .eq('id', priceId)
        .maybeSingle();
      
      // If price doesn't exist, create it
      if (!existingPrice) {
        console.log(`Creating new price record for ${priceId}`);
        await syncPriceData(price);
      }
      
      // Prepare subscription data
      const subscriptionData = {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (existingSubscription) {
        console.log(`Updating existing subscription for customer ${customerId}`);
        // Update existing subscription
        await supabase
          .from('customer_subscriptions')
          .update(subscriptionData)
          .eq('stripe_customer_id', customerId);
      } else {
        console.log(`Creating new subscription for customer ${customerId}`);
        
        // Try to get customer info from Stripe
        const stripeCustomer = await stripe.customers.retrieve(customerId) as any;
        
        // Extract user_id from metadata
        const user_id = stripeCustomer.metadata?.user_id;
        
        if (!user_id) {
          console.error(`No user_id found for customer ${customerId}`);
          return;
        }
        
        // Create new subscription
        await supabase.from('customer_subscriptions').insert({
          ...subscriptionData,
          user_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
    throw error;
  }
}

// Helper function to handle product deletion
async function handleProductDeleted(product: any) {
  try {
    const { data, error } = await supabase
      .from('stripe_products')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('stripe_product_id', product.id);

    if (error) {
      console.error(`Error marking product ${product.id} as inactive:`, error);
      throw error;
    }

    console.log(`Successfully marked product ${product.id} as inactive`);
  } catch (error) {
    console.error('Error handling product deletion:', error);
    throw error;
  }
}

// Helper function to handle price deletion
async function handlePriceDeleted(price: any) {
  try {
    const { data, error } = await supabase
      .from('stripe_prices')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', price.id);

    if (error) {
      console.error(`Error marking price ${price.id} as inactive:`, error);
      throw error;
    }

    console.log(`Successfully marked price ${price.id} as inactive`);
  } catch (error) {
    console.error('Error handling price deletion:', error);
    throw error;
  }
}

// Main webhook handler
export async function handleWebhookEvent(
  rawBody: string,
  signature: string,
  webhookSecret: string
) {
  try {
    console.log('Constructing Stripe event from webhook payload');
    
    // Verify webhook signature
    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`✓ Webhook verified! Event type: ${stripeEvent.type}`);

    // Handle different event types
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        console.log('Processing checkout.session.completed event');
        await handleCheckoutSessionCompleted(stripeEvent.data.object);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        console.log(`Processing ${stripeEvent.type} event`);
        await updateSubscriptionStatus(stripeEvent.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(stripeEvent.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(stripeEvent.data.object);
        break;

      case 'product.created':
      case 'product.updated':
        console.log(`Processing ${stripeEvent.type} event`);
        // Check if this is a metadata update
        if (stripeEvent.data.previous_attributes && 
            stripeEvent.data.previous_attributes.metadata) {
          console.log('Detected metadata changes, syncing product features');
        }
        await syncProductData(stripeEvent.data.object);
        break;
        
      case 'product.deleted':
        console.log(`Processing ${stripeEvent.type} event`);
        await handleProductDeleted(stripeEvent.data.object);
        break;

      case 'price.created':
      case 'price.updated':
        console.log(`Processing ${stripeEvent.type} event`);
        await syncPriceData(stripeEvent.data.object);
        break;
        
      case 'price.deleted':
        console.log(`Processing ${stripeEvent.type} event`);
        await handlePriceDeleted(stripeEvent.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    throw error;
  }
}