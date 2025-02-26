import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// Initialize Supabase client for database operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

// Determine if we're in production mode based on environment and domain
const isProductionBuild = import.meta.env.PROD === true;
const isDevelopmentHost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('.vercel.app'));

// Only enforce subscriptions on the actual production domain AND in a production build
const isProduction = isProductionBuild && !isDevelopmentHost;

/**
 * Enum for subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
  FREE = 'free',
  NONE = 'none'
}

/**
 * Type for subscription data
 */
export type SubscriptionData = {
  status: SubscriptionStatus;
  planId: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  features: string[];
};

/**
 * Default free subscription
 */
const FREE_SUBSCRIPTION: SubscriptionData = {
  status: SubscriptionStatus.FREE,
  planId: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  features: ['basic_access'] // Define what features are available in free tier
};

/**
 * Interface for subscription query result
 */
interface SubscriptionQueryResult {
  status: string;
  price_id: string;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  stripe_prices: {
    product_id: string;
  } | null;
}

/**
 * Check if a user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  // In development or preview environments, always return true
  if (!isProduction) {
    console.log('Subscription check bypassed in development environment');
    return true;
  }

  // In production, check for actual subscription
  try {
    const { data: subscription, error } = await supabase
      .from('customer_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('Error checking subscription status:', error.message);
      return false;
    }

    return !!subscription;
  } catch (error) {
    console.error('Exception checking subscription status:', error);
    return false;
  }
}

/**
 * Get detailed subscription data for a user
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionData> {
  // In development or preview environments, return mock subscription data
  if (!isProduction) {
    // For development, we can either return a mock premium subscription
    // or simply return the free tier
    console.log('Using mock subscription data in development environment');
    return {
      status: SubscriptionStatus.ACTIVE,
      planId: 'mock_premium_plan',
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      cancelAtPeriodEnd: false,
      features: ['basic_access', 'premium_feature_1', 'premium_feature_2', 'premium_feature_3']
    };
  }

  // In production, fetch actual subscription data
  try {
    // First check if user has a subscription
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .select(`
        status,
        price_id,
        current_period_end,
        cancel_at_period_end,
        stripe_prices(product_id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log(`No subscription found for user ${userId}`);
      return FREE_SUBSCRIPTION;
    }

    // Cast the response to our interface
    const subscription = data as unknown as SubscriptionQueryResult;
    
    // Extract the product ID safely
    let productId: string | null = null;
    if (subscription.stripe_prices) {
      productId = subscription.stripe_prices.product_id;
    }
    
    let features: string[] = ['basic_access']; // Always include basic access

    if (productId) {
      const { data: productFeatures, error: featuresError } = await supabase
        .from('product_features')
        .select('feature_id')
        .eq('product_id', productId);

      if (!featuresError && productFeatures && productFeatures.length > 0) {
        // Add the feature IDs to our list
        features = [
          ...features,
          ...productFeatures.map(pf => pf.feature_id)
        ];
      }
    }

    // Convert the subscription status to our enum type
    const status = subscription.status as SubscriptionStatus;
    
    return {
      status,
      planId: subscription.price_id,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      features
    };
  } catch (error) {
    console.error('Exception getting subscription data:', error);
    return FREE_SUBSCRIPTION;
  }
}

/**
 * Check if a user has access to a specific feature
 */
export async function hasFeatureAccess(userId: string, featureId: string): Promise<boolean> {
  // In development or preview environments, always grant access
  if (!isProduction) {
    console.log(`Feature access check for ${featureId} bypassed in development environment`);
    return true;
  }

  try {
    const subscription = await getUserSubscription(userId);
    return subscription.features.includes(featureId);
  } catch (error) {
    console.error(`Error checking feature access for ${featureId}:`, error);
    return false;
  }
}

/**
 * List of supported features in the application
 */
export const FEATURES = {
  BASIC_ACCESS: 'basic_access',
  UNLIMITED_SEARCHES: 'unlimited_searches',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  CUSTOM_REPORTS: 'custom_reports',
  // Add more features as needed
};

export async function getSubscriptionStatus() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return null;
    }

    console.log(`Looking up subscription for user ${user.id}`);

    // Use maybeSingle to avoid errors when no record is found
    const { data: subscription, error } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    if (!subscription) {
      console.log(`No subscription found for user ${user.id}`);
      return null;
    }

    console.log(`Found subscription for user ${user.id}:`, subscription);
    
    // If we need price details, fetch them separately
    if (subscription.stripe_price_id) {
      try {
        const { data: priceData, error: priceError } = await supabase
          .from('stripe_prices')
          .select('*')
          .eq('id', subscription.stripe_price_id)
          .maybeSingle();
        
        if (!priceError && priceData) {
          subscription.price = priceData;
        }
      } catch (priceErr) {
        console.error('Error fetching price details:', priceErr);
        // Continue with subscription without price data
      }
    }

    return subscription;
  } catch (error) {
    console.error('Error in getSubscriptionStatus:', error);
    return null;
  }
}

export async function getSubscriptionByCustomerId(customerId: string) {
  try {
    const { data: subscription, error } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error) {
      console.error('Error fetching subscription by customer ID:', error);
      return null;
    }

    return subscription;
  } catch (error) {
    console.error('Error in getSubscriptionByCustomerId:', error);
    return null;
  }
}

export async function getSubscriptionBySubscriptionId(subscriptionId: string) {
  try {
    const { data: subscription, error } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (error) {
      console.error('Error fetching subscription by subscription ID:', error);
      return null;
    }

    return subscription;
  } catch (error) {
    console.error('Error in getSubscriptionBySubscriptionId:', error);
    return null;
  }
} 