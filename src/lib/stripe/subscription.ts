import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

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