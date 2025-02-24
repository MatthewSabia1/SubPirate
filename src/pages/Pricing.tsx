import React from 'react';
import { PricingCard } from '../components/pricing/PricingCard';
import { getActiveProducts, getActivePrices, createCheckoutSession } from '../lib/stripe/client';
import type { Stripe } from 'stripe';

export default function Pricing() {
  const [products, setProducts] = React.useState<Stripe.Product[]>([]);
  const [prices, setPrices] = React.useState<Stripe.Price[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [productsData, pricesData] = await Promise.all([
          getActiveProducts(),
          getActivePrices()
        ]);
        setProducts(productsData);
        setPrices(pricesData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch pricing data'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Error loading pricing data. Please try again later.</div>
      </div>
    );
  }

  const plans = [
    {
      name: 'Starter',
      description: 'Essential features for getting started with Reddit marketing',
      price: 19,
      features: [
        'Analyze up to 10 subreddits per month',
        'Basic marketing friendliness scores',
        'Export data in CSV format',
        'Email support',
      ],
      priceId: prices.find((p) => 
        p.product === products.find(prod => prod.name === 'Starter')?.id
      )?.id,
    },
    {
      name: 'Creator',
      description: 'Perfect for content creators and growing brands',
      price: 34,
      features: [
        'Analyze up to 50 subreddits per month',
        'Advanced marketing friendliness scores',
        'Custom tracking metrics',
        'Export data in multiple formats',
        'Priority email support',
      ],
      isPopular: true,
      priceId: prices.find((p) => 
        p.product === products.find(prod => prod.name === 'Creator')?.id
      )?.id,
    },
    {
      name: 'Pro',
      description: 'Advanced features for professional marketers',
      price: 49,
      features: [
        'Unlimited subreddit analysis',
        'Advanced analytics and reporting',
        'Team collaboration features',
        'API access',
        'Custom tracking metrics',
        'Priority 24/7 support',
      ],
      priceId: prices.find((p) => 
        p.product === products.find(prod => prod.name === 'Pro')?.id
      )?.id,
    },
    {
      name: 'Agency',
      description: 'Full platform access for marketing teams and agencies',
      price: 97,
      features: [
        'Everything in Pro, plus:',
        'Multiple team workspaces',
        'Advanced team permissions',
        'Custom integrations',
        'Dedicated account manager',
        'Training and onboarding',
      ],
      priceId: prices.find((p) => 
        p.product === products.find(prod => prod.name === 'Agency')?.id
      )?.id,
    },
  ];

  async function handleSelectPlan(priceId: string | undefined) {
    if (!priceId) {
      console.error('No price ID found for the selected plan');
      alert('This plan is currently unavailable. Please try another plan or contact support.');
      return;
    }

    try {
      const session = await createCheckoutSession({
        priceId,
        successUrl: `${window.location.origin}/?checkout=success`,
        cancelUrl: `${window.location.origin}/pricing`,
      });

      if (!session?.url) {
        throw new Error('Failed to create checkout session URL');
      }

      window.location.href = session.url;
    } catch (err) {
      console.error('Error creating checkout session:', err);
      alert('Failed to start checkout process. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get started with SubPirate today. Choose the plan that best fits your needs.
            All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              name={plan.name}
              description={plan.description}
              price={plan.price}
              features={plan.features}
              isPopular={plan.isPopular}
              onSelect={() => handleSelectPlan(plan.priceId)}
            />
          ))}
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Enterprise Solutions
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Need a custom solution? We offer tailored plans for large organizations
            with specific requirements.
          </p>
          <a
            href="mailto:enterprise@subpirate.com"
            className="inline-flex items-center justify-center px-6 py-3 border border-[#333333] rounded-md text-white hover:bg-[#1A1A1A] transition-colors duration-150"
          >
            Contact Sales
          </a>
        </div>

        <div className="mt-20 bg-[#050505] border border-[#333333] rounded-2xl p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be
                reflected in your next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-400">
                We accept all major credit cards (Visa, Mastercard, American Express)
                and PayPal.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-400">
                Yes, we offer a 14-day money-back guarantee. If you're not satisfied
                with our service, we'll refund your payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 