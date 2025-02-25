import { handleWebhookEvent } from '../../../../lib/stripe/webhook';

const webhookSecret = import.meta.env.VITE_STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: Request) {
  try {
    console.log('Stripe webhook request received');
    
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
    console.error('Unexpected webhook error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed', message: error.message }),
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