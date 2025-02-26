import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Check } from 'lucide-react';
import { 
  getActiveProducts, 
  getActivePrices, 
  createCheckoutSession,
  getProductFeatures 
} from '../lib/stripe/client';
import type { Stripe } from 'stripe';
import Logo from '../components/Logo';

// Types from Pricing.tsx
interface ProductFeature {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

// Map of plan names to their corresponding product IDs - same as in Pricing.tsx
const PRODUCT_ID_MAP = {
  Starter: 'prod_starter',
  Creator: 'prod_creator',
  Pro: 'prod_pro',
  Agency: 'prod_agency'
};

// Fallback features for each plan - used if database features can't be loaded
const FALLBACK_FEATURES = {
  Starter: [
    '<span class="font-bold text-white">10</span> subreddit analyses per month',
    '<span class="font-bold text-white">Unlimited</span> competitor intelligence',
    '<span class="font-bold text-white">50</span> opportunity finder subreddits',
    '<span class="font-bold text-white">1</span> Reddit account protection',
    '<span class="font-bold text-white">2</span> marketing campaigns',
  ],
  Creator: [
    '<span class="font-bold text-white">25</span> subreddit analyses monthly',
    '<span class="font-bold text-white">Advanced</span> competitor intelligence',
    '<span class="font-bold text-white">100</span> opportunity finder subreddits',
    '<span class="font-bold text-white">3</span> Reddit account protection',
    '<span class="font-bold text-white">5</span> marketing campaigns',
    '<span class="font-bold text-white">Basic</span> optimal posting scheduler',
  ],
  Pro: [
    '<span class="font-bold text-white">Unlimited</span> subreddit analyses',
    '<span class="font-bold text-white">Advanced</span> competitor intelligence',
    '<span class="font-bold text-white">200</span> opportunity finder subreddits',
    '<span class="font-bold text-white">5</span> Reddit account protection',
    '<span class="font-bold text-white">10</span> marketing campaigns',
    '<span class="font-bold text-white">Advanced</span> optimal posting scheduler',
    '<span class="font-bold text-white">Priority</span> support',
  ],
  Agency: [
    '<span class="font-bold text-white">Everything</span> in Pro plan',
    '<span class="font-bold text-white">Unlimited</span> opportunity finder',
    '<span class="font-bold text-white">10</span> team members',
    '<span class="font-bold text-white">10</span> Reddit account protection',
    '<span class="font-bold text-white">20</span> marketing campaigns',
    '<span class="font-bold text-white">White-label</span> reports',
    '<span class="font-bold text-white">Enterprise</span> support',
    '<span class="font-bold text-white">API</span> access',
  ],
};

// Default descriptions in case database fails
const DEFAULT_DESCRIPTIONS = {
  Starter: 'Essential features for getting started with Reddit marketing',
  Creator: 'Perfect for content creators and growing brands',
  Pro: 'Advanced features for professional marketers',
  Agency: 'Full platform access for marketing teams and agencies'
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Stripe.Product[]>([]);
  const [prices, setPrices] = useState<Stripe.Price[]>([]);
  const [productFeatures, setProductFeatures] = useState<Record<string, ProductFeature[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);

  // If not a new user, redirect to dashboard - but only if specifically marked as a new user
  useEffect(() => {
    const state = location.state as { newUser?: boolean } | null;
    
    // Only redirect to dashboard if:
    // 1. The user is authenticated AND
    // 2. This is not explicitly marked as a new user flow (via state)
    // 3. We're not coming from an external redirect (like a checkout success)
    if (user && !state?.newUser && !location.search.includes('checkout=')) {
      console.log('SubscriptionPage: User is authenticated but not marked as new user, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    } else {
      console.log('SubscriptionPage: User needs to see subscription options', { 
        isNewUser: state?.newUser, 
        hasSearch: !!location.search,
        user: !!user
      });
    }
  }, [location, navigate, user]);

  // Fetch products and prices
  useEffect(() => {
    async function fetchData() {
      try {
        // Check if we're in test mode
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
        const testPublishableKey = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;
        const isTestMode = publishableKey === testPublishableKey;
        setIsTestMode(isTestMode);
        
        // Fetch products and prices from Stripe
        const productsData = await getActiveProducts();
        const pricesData = await getActivePrices();
        
        setProducts(productsData);
        setPrices(pricesData);
        
        // After setting products, fetch features for each product
        const featuresPromises = productsData.map(product => 
          getProductFeatures(product.id).then(features => ({ productId: product.id, features }))
        );
        
        const featuresResults = await Promise.all(featuresPromises);
        
        // Convert array of results to a record object for easy lookup
        const featuresMap: Record<string, ProductFeature[]> = {};
        featuresResults.forEach(result => {
          featuresMap[result.productId] = result.features;
        });
        
        setProductFeatures(featuresMap);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pricing data'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-xl">Loading subscription options...</div>
    </div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Error loading subscription data. Please try again later.</div>
      </div>
    );
  }

  // Fallback price IDs if the real ones can't be found
  const priceFallbacks = {
    Starter: 'price_starter_monthly',
    Creator: 'price_creator_monthly',
    Pro: 'price_pro_monthly',
    Agency: 'price_agency_monthly'
  };

  // Function to get price for a specific product
  const getPriceForProduct = (productId: string): Stripe.Price | undefined => {
    return prices.find(price => 
      price.product === productId && 
      price.active && 
      price.type === 'recurring'
    );
  };

  // Get a formatted price with fallback
  const getFormattedPrice = (planName: string): string => {
    // Find the product with matching name from the actual products array
    const product = products.find(p => p.name === planName);
    const productId = product?.id || PRODUCT_ID_MAP[planName as keyof typeof PRODUCT_ID_MAP];
    
    if (!productId || !prices.length) {
      // Fallback prices if Stripe data isn't loaded
      return planName === 'Starter' ? '$19' :
             planName === 'Creator' ? '$34' :
             planName === 'Pro' ? '$49' :
             planName === 'Agency' ? '$97' : '$0';
    }
    
    const price = getPriceForProduct(productId);
    if (!price || !price.unit_amount) {
      // Fallback prices if price isn't found
      return planName === 'Starter' ? '$19' :
             planName === 'Creator' ? '$34' :
             planName === 'Pro' ? '$49' :
             planName === 'Agency' ? '$97' : '$0';
    }
    
    // Format the price from cents to dollars
    return `$${(price.unit_amount / 100)}`;
  };

  // Get product description with fallback
  const getProductDescription = (planName: string): string => {
    // Find the product with matching name
    const product = products.find(p => p.name === planName);
    const productId = product?.id; 
    
    if (!productId || !products.length) {
      return DEFAULT_DESCRIPTIONS[planName as keyof typeof DEFAULT_DESCRIPTIONS] || '';
    }
    
    return product?.description || 
      DEFAULT_DESCRIPTIONS[planName as keyof typeof DEFAULT_DESCRIPTIONS] || '';
  };
  
  // Get features for a plan from the database or use fallbacks
  const getFeatures = (planName: string): string[] => {
    // Find the product with matching name
    const product = products.find(p => p.name === planName);
    const productId = product?.id || PRODUCT_ID_MAP[planName as keyof typeof PRODUCT_ID_MAP];
    
    const features = productFeatures[productId];
    
    if (!features || features.length === 0) {
      // Use fallback features if database features aren't available
      return FALLBACK_FEATURES[planName as keyof typeof FALLBACK_FEATURES] || [];
    }
    
    // Transform database features into formatted HTML strings
    return features.map(feature => {
      // Extract any numeric values from the feature description for highlighting
      const description = feature.description;
      const numberMatch = description.match(/(\d+)/);
      
      if (numberMatch) {
        const number = numberMatch[1];
        // Replace the number with a highlighted version
        return description.replace(
          number, 
          `<span class="font-bold text-white">${number}</span>`
        );
      }
      
      // If no number found, just return the description
      return description;
    });
  };

  // Create a TestModeIndicator component that matches the one in LandingPage.tsx
  const TestModeIndicator = () => (
    <div className="bg-amber-900/20 border border-amber-800 text-amber-200 px-4 py-2 rounded-md text-sm mb-6 max-w-3xl mx-auto text-center">
      <p><span className="font-bold">Test Mode Active:</span> Using Stripe test data. All plans use test prices and features.</p>
    </div>
  );

  async function handleSelectPlan(planName: string) {
    // Find the product with matching name
    const product = products.find(p => p.name === planName);
    const productId = product?.id || PRODUCT_ID_MAP[planName as keyof typeof PRODUCT_ID_MAP];
    
    if (!productId) {
      console.error('Invalid plan name:', planName);
      return;
    }

    const price = getPriceForProduct(productId);
    const priceId = price?.id || priceFallbacks[planName as keyof typeof priceFallbacks];

    if (!priceId) {
      console.error('No price ID found for the selected plan');
      console.log('Available products:', products);
      console.log('Available prices:', prices);
      
      alert('Price ID not found. Please contact support.');
      return;
    }

    if (!user) {
      console.error('User is not authenticated');
      alert('Please sign in to subscribe to a plan.');
      return;
    }

    try {
      // Create a Stripe checkout session
      const { url } = await createCheckoutSession({
        priceId,
        successUrl: `${window.location.origin}/dashboard?checkout=success`,
        cancelUrl: `${window.location.origin}/subscription?checkout=canceled`,
        userId: user.id
      });
      
      if (url) {
        // Redirect to the Stripe Checkout page
        window.location.href = url;
      } else {
        throw new Error('Could not create checkout session');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      
      // Check for the specific error about test/live mode mismatch
      if (error.message && error.message.includes('similar object exists in live mode, but a test mode key was used')) {
        // Special handling for test/live mode mismatch
        try {
          // Create a checkout session without the customer ID
          // This will create a new customer in the current mode
          const { url } = await createCheckoutSession({
            priceId,
            successUrl: `${window.location.origin}/dashboard?checkout=success`,
            cancelUrl: `${window.location.origin}/subscription?checkout=canceled`,
            // Don't pass userId to avoid using the mismatched customer
          });
          
          if (url) {
            window.location.href = url;
            return;
          }
        } catch (retryError) {
          console.error('Second attempt at creating checkout session failed:', retryError);
          alert('Failed to create checkout session. Please try again later or contact support.');
          return;
        }
      }
      
      // General error handling
      alert('Failed to create checkout session. Please try again.');
    }
  }

  // CSS styles for consistent appearance with Pricing.tsx
  const styles = `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      background-color: rgba(198, 155, 123, 0.1);
      border: 1px solid rgba(198, 155, 123, 0.2);
      color: #C69B7B;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    
    .pricing-card {
      background-color: #0f0f0f;
      border-radius: 1rem;
      padding: 2rem;
      border: 1px solid #222222;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      height: 100%;
    }
    
    .pricing-card:hover {
      border-color: #333333;
      transform: translateY(-4px);
    }
    
    .pricing-card-featured {
      background-color: #0f0f0f;
      border-radius: 1rem;
      padding: 2rem;
      border: 2px solid #C69B7B;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.3s ease;
      height: 100%;
      box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.2);
    }
    
    .pricing-button {
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    
    .button-outline {
      color: #C69B7B;
      border: 1px solid #C69B7B;
    }
    
    .button-outline:hover {
      background-color: #C69B7B;
      color: #000000;
    }
    
    .button-primary {
      background-color: #C69B7B;
      color: #000000;
      box-shadow: 0 4px 14px rgba(198, 155, 123, 0.25);
    }
    
    .button-primary:hover {
      background-color: #B38A6A;
    }
  `;

  return (
    <div className="min-h-screen bg-black">
      <style>{styles}</style>

      <div className="container mx-auto px-6 py-12">
        <div className="flex justify-center mb-8">
          <Logo size="xl" className="mb-4" />
        </div>

        {isTestMode && <TestModeIndicator />}
        
        <div className="text-center mb-16">
          <div className="badge mx-auto mb-3">SUBSCRIPTION REQUIRED</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your <span className="text-[#C69B7B]">Plan</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            A subscription is required to use SubPirate. Please select a plan to continue.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {/* Starter Plan */}
          <div className="pricing-card">
            <h3 className="text-xl font-semibold mb-2">Starter</h3>
            <div className="text-[#C69B7B] text-4xl font-bold mb-2">{getFormattedPrice('Starter')}<span className="text-lg text-gray-400">/mo</span></div>
            <p className="text-gray-400 mb-6">{getProductDescription('Starter')}</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              {getFeatures('Starter').map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => handleSelectPlan('Starter')} 
              className="pricing-button button-outline"
            >
              Select Starter
            </button>
          </div>

          {/* Creator Plan */}
          <div className="pricing-card-featured">
            <div className="absolute top-0 right-0 bg-[#C69B7B] text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
              MOST POPULAR
            </div>
            <h3 className="text-xl font-semibold mb-2">Creator</h3>
            <div className="text-[#C69B7B] text-4xl font-bold mb-2">{getFormattedPrice('Creator')}<span className="text-lg text-gray-400">/mo</span></div>
            <p className="text-gray-400 mb-6">{getProductDescription('Creator')}</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              {getFeatures('Creator').map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => handleSelectPlan('Creator')} 
              className="pricing-button button-primary"
            >
              Select Creator
            </button>
          </div>

          {/* Pro Plan */}
          <div className="pricing-card">
            <h3 className="text-xl font-semibold mb-2">Pro</h3>
            <div className="text-[#C69B7B] text-4xl font-bold mb-2">{getFormattedPrice('Pro')}<span className="text-lg text-gray-400">/mo</span></div>
            <p className="text-gray-400 mb-6">{getProductDescription('Pro')}</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              {getFeatures('Pro').map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => handleSelectPlan('Pro')} 
              className="pricing-button button-outline"
            >
              Select Pro
            </button>
          </div>

          {/* Agency Plan */}
          <div className="pricing-card">
            <h3 className="text-xl font-semibold mb-2">Agency</h3>
            <div className="text-[#C69B7B] text-4xl font-bold mb-2">{getFormattedPrice('Agency')}<span className="text-lg text-gray-400">/mo</span></div>
            <p className="text-gray-400 mb-6">{getProductDescription('Agency')}</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              {getFeatures('Agency').map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check size={18} className="text-[#C69B7B] shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
            
            <button 
              onClick={() => handleSelectPlan('Agency')} 
              className="pricing-button button-outline"
            >
              Select Agency
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 