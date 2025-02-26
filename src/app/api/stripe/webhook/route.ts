import { handleWebhookEvent } from '../../../../lib/stripe/webhook';

// Determine if we're in production mode based on environment
const isProductionBuild = process.env.NODE_ENV === 'production';

// Use the appropriate webhook secret based on environment
const webhookSecret = isProductionBuild
  ? process.env.VITE_STRIPE_PROD_WEBHOOK_SECRET || process.env.VITE_STRIPE_WEBHOOK_SECRET || ''
  : process.env.VITE_STRIPE_TEST_WEBHOOK_SECRET || process.env.VITE_STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  try {
    // Check the host to determine if we're in production or development
    const host = request.headers.get('host') || '';
    const isDevelopmentHost = 
      host.includes('localhost') || 
      host.includes('127.0.0.1') || 
      host.includes('.vercel.app');
    
    // Only use production mode on the actual production domain AND in a production build
    const isProduction = isProductionBuild && !isDevelopmentHost;
    
    console.log(`Stripe webhook request received in ${isProduction ? 'PRODUCTION' : 'TEST'} mode`);
    console.log(`Running on host: ${host}`);
    
    if (!webhookSecret) {
      console.error('No webhook secret found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Webhook secret is not configured' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const body = await request.text();
    console.log('Webhook body length:', body.length);
    
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('No Stripe signature found in headers');
      return new Response(
        JSON.stringify({ error: 'No signature found' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Signature received:', signature.substring(0, 20) + '...');
    
    try {
      await handleWebhookEvent(body, signature, webhookSecret);
      console.log('Webhook processed successfully');
      
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (webhookError: any) {
      console.error('Error processing webhook:', webhookError.message);
      
      return new Response(
        JSON.stringify({ error: 'Webhook handler failed', message: webhookError.message }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('Unexpected webhook error:', error.message);
    
    return new Response(
      JSON.stringify({ error: 'Unexpected error', message: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Disable body parsing, as Stripe needs the raw body to validate the event
export const config = {
  api: {
    bodyParser: false,
  },
}; 