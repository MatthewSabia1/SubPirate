import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '../../../lib/stripe/client';
import { handleWebhookEvent } from '../../../lib/stripe/webhook';

// Determine if we're in production mode based on environment
const isProduction = import.meta.env.PROD === true;

// Use the appropriate webhook secret based on environment
const webhookSecret = isProduction
  ? import.meta.env.VITE_STRIPE_PROD_WEBHOOK_SECRET || import.meta.env.VITE_STRIPE_WEBHOOK_SECRET || ''
  : import.meta.env.VITE_STRIPE_TEST_WEBHOOK_SECRET || import.meta.env.VITE_STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  console.log(`Stripe webhook request received in ${isProduction ? 'PRODUCTION' : 'TEST'} mode`);
  
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found in headers');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    await handleWebhookEvent(payload, signature, webhookSecret);
    console.log('Webhook processed successfully');
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return NextResponse.json(
      { error: 'Webhook handler failed', message: err.message },
      { status: 400 }
    );
  }
} 