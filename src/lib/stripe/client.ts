import Stripe from 'stripe';
import { Database } from '../database.types';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for database operations
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Determine if we're in production mode based on environment and domain
const isProductionBuild = import.meta.env.PROD === true;
const isDevelopmentHost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('.vercel.app'));

// Use test mode on localhost even in production builds
// Only use production mode on the actual production domain AND in a production build
const isProduction = isProductionBuild && !isDevelopmentHost;

// IMPORTANT: Force production mode for subpirate.com domain
// This ensures we always use production keys on the actual production site
if (typeof window !== 'undefined' && window.location.hostname === 'subpirate.com') {
  console.log('On production domain subpirate.com - forcing PRODUCTION mode');
  const isProduction = true;
}

const useTestMode = !isProduction;

if (useTestMode) {
  console.log('Stripe client running in TEST MODE');
  console.log(`Host: ${typeof window !== 'undefined' ? window.location.hostname : 'server'}`);
  console.log(`Production build: ${isProductionBuild}`);
} else {
  console.log('Stripe client running in PRODUCTION MODE');
}

// Use the appropriate API key based on the environment
const stripeSecretKey = useTestMode 
  ? import.meta.env.VITE_STRIPE_TEST_SECRET_KEY || import.meta.env.VITE_STRIPE_SECRET_KEY || ''
  : import.meta.env.VITE_STRIPE_SECRET_KEY || '';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
  telemetry: false,
  maxNetworkRetries: 2,
});

// Display which key we're using (partial for security)
console.log(`Using Stripe key: ${stripeSecretKey ? stripeSecretKey.substring(0, 8) + '...' : 'No key found!'}`);
console.log(`Running on domain: ${typeof window !== 'undefined' ? window.location.hostname : 'server'}`);

// Helper type for Stripe Product with expanded price data
type StripeProductWithPrice = Stripe.Product & {
  default_price: Stripe.Price;
};

// Helper function to get or create a customer for a user
async function getOrCreateCustomerForUser(userId: string): Promise<string> {
  try {
    // First check if the user already has a customer ID in our database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();
    
    // Log Supabase errors for debugging but continue execution
    if (error) {
      console.error(`Supabase error fetching customer profile: ${error.message}`, error);
      // Continue execution - we'll create a new customer if needed
    }
    
    if (profile?.stripe_customer_id) {
      console.log(`Found existing Stripe customer for user ${userId}: ${profile.stripe_customer_id}`);
      
      try {
        // Verify the customer exists in the current environment
        await stripe.customers.retrieve(profile.stripe_customer_id);
        return profile.stripe_customer_id;
      } catch (customerError: any) {
        // If there's an environment mismatch or the customer doesn't exist
        if (customerError.message && 
           (customerError.message.includes('live mode') || 
            customerError.message.includes('test mode') ||
            customerError.message.includes('No such customer'))) {
          
          console.warn(`Customer ID ${profile.stripe_customer_id} exists in a different environment. Creating a new one.`);
          
          // Clear the invalid customer ID from the database
          const { error: clearError } = await supabase
            .from('profiles')
            .update({ stripe_customer_id: null })
            .eq('id', userId);
            
          if (clearError) {
            console.warn('Failed to clear invalid customer ID from database:', clearError);
          }
          
          // Continue to create a new customer below
        } else {
          // Re-throw unexpected errors
          throw customerError;
        }
      }
    }
    
    // If no customer ID, fetch user details to create one
    let email = undefined;
    let name = undefined;
    
    try {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error(`Supabase error fetching user details: ${userError.message}`, userError);
      } else {
        email = user?.email;
        name = user?.full_name;
      }
    } catch (userFetchError) {
      console.error('Exception fetching user details from Supabase:', userFetchError);
    }
    
    // Handle the case where we can't get user email from Supabase
    if (!email) {
      console.warn(`No email found in Supabase for user ${userId}. Using placeholder email.`);
      // Use a placeholder email based on the user ID
      email = `user-${userId.substring(0, 8)}@example.com`;
      name = `User ${userId.substring(0, 8)}`;
    }
    
    // Create a new customer in Stripe
    const customer = await stripe.customers.create({
      email: email,
      name: name || email.split('@')[0],
      metadata: { user_id: userId }
    });
    
    console.log(`Created new Stripe customer for user ${userId}: ${customer.id}`);
    
    // Try to update the user profile with the new customer ID
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);
        
      if (updateError) {
        console.warn('Supabase error updating user profile with Stripe customer ID:', updateError);
      }
    } catch (updateError) {
      // Log but don't fail if we can't update Supabase
      console.warn('Exception updating user profile with Stripe customer ID:', updateError);
    }
    
    return customer.id;
  } catch (error) {
    console.error('Error getting/creating Stripe customer:', error);
    throw error;
  }
}

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

export type CheckoutOptions = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId?: string;
};

export async function createCheckoutSession({ priceId, successUrl, cancelUrl, userId }: CheckoutOptions) {
  // Create session object
  const sessionParams: any = {
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
    // Make automatic tax optional to isolate potential issues
    // automatic_tax: {
    //   enabled: true,
    // },
    client_reference_id: userId, // Add user ID as client reference
    billing_address_collection: 'required',
    tax_id_collection: {
      enabled: true,
    },
    customer_update: {
      name: 'auto',
      address: 'auto', // Also allow updating address
    },
  };

  // Add customer parameter for subscription mode
  if (userId) {
    // Add metadata directly to the session
    sessionParams.metadata = {
      user_id: userId
    };
    
    // Use proper metadata format for subscription data
    sessionParams.subscription_data = {
      ...sessionParams.subscription_data,
      metadata: {
        user_id: userId
      }
    };
    
    try {
      // Add customer parameter for subscription mode
      const customerId = await getOrCreateCustomerForUser(userId);
      if (customerId) {
        sessionParams.customer = customerId;
      } else {
        // If no customer ID was returned, don't include the customer_update parameter
        delete sessionParams.customer_update;
      }
    } catch (customerError: any) {
      console.error('Failed to get or create customer:', customerError);
      
      // If we get a test/live mode mismatch error, don't use customer_update
      if (customerError.message && 
         (customerError.message.includes('live mode') || 
          customerError.message.includes('test mode'))) {
        console.warn('Detected test/live mode mismatch. Continuing without customer_update.');
        delete sessionParams.customer_update;
      }
      // Continue without customer ID - Stripe will create a new one
    }
  } else {
    // If no userId provided, don't use customer_update
    delete sessionParams.customer_update;
  }

  try {
    console.log('Creating Stripe checkout session with parameters:', JSON.stringify(sessionParams, null, 2));
    console.log('Using price ID:', priceId);
    
    const session = await stripe.checkout.sessions.create(sessionParams);
    
    if (!session.url) {
      throw new Error('Failed to create checkout session URL');
    }
    
    return session;
  } catch (error: any) {
    console.error('Stripe checkout session creation failed:');
    console.error('Error message:', error.message);
    
    // If it's a Stripe error, log more details
    if (error.type && error.code) {
      console.error('Stripe error type:', error.type);
      console.error('Stripe error code:', error.code);
      console.error('Stripe error param:', error.param);
    }
    
    // If error is related to tax ID collection, try without it
    if (error.message && error.message.includes('tax_id_collection') || 
        error.message && error.message.includes('Tax ID collection')) {
      console.log('Retrying checkout session creation without tax ID collection...');
      
      // Remove tax ID collection and try again
      delete sessionParams.tax_id_collection;
      
      try {
        const fallbackSession = await stripe.checkout.sessions.create(sessionParams);
        if (fallbackSession.url) {
          return fallbackSession;
        }
      } catch (fallbackError: any) {
        console.error('Fallback checkout session also failed:', fallbackError.message);
        // Continue to throw the original error
      }
    }
    
    throw error;
  }
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

// Get features for a specific product from the database
export async function getProductFeatures(productId: string) {
  try {
    // First fetch feature records from product_features table
    const { data: productFeatures, error: featuresError } = await supabase
      .from('product_features')
      .select(`
        id,
        stripe_product_id,
        feature_key,
        enabled,
        subscription_features:feature_key(
          name,
          description
        )
      `)
      .eq('stripe_product_id', productId)
      .eq('enabled', true);
    
    if (featuresError || !productFeatures) {
      console.error('Error fetching product features:', featuresError);
      return [];
    }
    
    // For debugging - log feature count and name
    console.log(`Found ${productFeatures.length} features for product ${productId}`);
    
    // Format the features for frontend display
    return productFeatures.map(feature => {
      // Access subscription feature data safely
      const featureData = feature.subscription_features as unknown as { 
        name?: string; 
        description?: string;
      } | null;
      
      return {
        id: feature.id,
        key: feature.feature_key,
        name: featureData?.name || feature.feature_key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        description: featureData?.description || '',
        enabled: feature.enabled
      };
    });
  } catch (error) {
    console.error('Error fetching product features:', error);
    return [];
  }
}

// Get all defined features from the database
export async function getAllFeatures() {
  try {
    const { data: features, error: featuresError } = await supabase
      .from('subscription_features')
      .select('*');
      
    if (featuresError) {
      console.error('Error fetching features:', featuresError);
      return [];
    }
    
    return features;
  } catch (error) {
    console.error('Error fetching all features:', error);
    return [];
  }
}

export async function getAvailablePlans() {
  try {
    const products = await getActiveProducts();
    const prices = await getActivePrices();

    // Map prices to products
    const plans = products.map(product => {
      const productPrices = prices.filter(price => price.product === product.id);
      return {
        product,
        prices: productPrices
      };
    });

    return plans;
  } catch (error) {
    console.error('Error getting available plans:', error);
    throw error;
  }
} 