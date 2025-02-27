import React from 'react';
import { Check } from 'lucide-react';

// Pricing card styles
const pricingStyles = `
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
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.15);
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
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.2);
    height: 100%;
  }

  .pricing-card-wide {
    background-color: #0f0f0f;
    border-radius: 1rem;
    padding: 2rem;
    border: 1px solid #222222;
    transition: all 0.3s ease;
  }
  
  .pricing-card-wide:hover {
    border-color: #333333;
    transform: translateY(-4px);
    box-shadow: 0 10px 30px -15px rgba(198, 155, 123, 0.15);
  }
  
  .pricing-button {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s ease;
    margin-top: auto;
  }
  
  .button-outline {
    color: #ffffff;
    border: 1px solid #C69B7B;
  }
  
  .button-outline:hover {
    background-color: #C69B7B;
    color: #000000;
  }
  
  .button-primary {
    background-color: #C69B7B;
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(198, 155, 123, 0.25);
  }
  
  .button-primary:hover {
    background-color: #B38A6A;
  }
`;

interface PricingCardsProps {
  onSelectPlan?: (plan: string) => void;
}

const PricingCards: React.FC<PricingCardsProps> = ({ onSelectPlan }) => {
  const handleSelectPlan = (plan: string) => {
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  // Define features for plans
  const starterFeatures = [
    '10 subreddit analyses per month',
    'Unlimited competitor intelligence',
    '50 opportunity finder subreddits',
    '1 Reddit account protection',
    '2 marketing campaigns'
  ];

  const creatorFeatures = [
    '25 subreddit analyses monthly',
    'Advanced competitor intelligence',
    '100 opportunity finder subreddits',
    '3 Reddit account protection',
    '5 marketing campaigns',
    'Basic optimal posting scheduler'
  ];

  const proFeatures = [
    'Unlimited subreddit analyses',
    'Advanced competitor intelligence',
    '200 opportunity finder subreddits',
    '5 Reddit account protection',
    '10 marketing campaigns',
    'Advanced optimal posting scheduler',
    'Priority support'
  ];

  const agencyFeatures = [
    '3 Reddit account protection',
    '3 Reddit account protection',
    '25 subreddit analyses monthly',
    '3 Reddit account protection',
    'Advanced competitor intelligence',
    '25 subreddit analyses monthly',
    '3 Reddit account protection',
    '3 Reddit account protection'
  ];

  return (
    <>
      <style>{pricingStyles}</style>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Starter Plan */}
        <div className="pricing-card">
          <h2 className="text-2xl font-bold mb-2">Starter</h2>
          <div className="text-4xl font-bold mb-2">$19<span className="text-gray-400 text-lg font-normal">/mo</span></div>
          <p className="text-gray-400 mb-6">Essential features for getting started with Reddit marketing</p>
          <div className="flex-grow mb-6">
            <ul className="space-y-3">
              {starterFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                  <span className="ml-3 text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <button 
            className="pricing-button button-outline"
            onClick={() => handleSelectPlan('starter')}
          >
            Get Started
          </button>
        </div>

        {/* Creator Plan */}
        <div className="pricing-card-featured">
          <div className="absolute top-0 right-0 bg-[#C69B7B] text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
            MOST POPULAR
          </div>
          <h2 className="text-2xl font-bold mb-2">Creator</h2>
          <div className="text-4xl font-bold mb-2">$34<span className="text-gray-400 text-lg font-normal">/mo</span></div>
          <p className="text-gray-400 mb-6">Perfect for content creators and growing brands</p>
          <div className="flex-grow mb-6">
            <ul className="space-y-3">
              {creatorFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                  <span className="ml-3 text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <button 
            className="pricing-button button-primary"
            onClick={() => handleSelectPlan('creator')}
          >
            Get Started
          </button>
        </div>

        {/* Pro Plan */}
        <div className="pricing-card">
          <h2 className="text-2xl font-bold mb-2">Pro</h2>
          <div className="text-4xl font-bold mb-2">$49<span className="text-gray-400 text-lg font-normal">/mo</span></div>
          <p className="text-gray-400 mb-6">Advanced features for professional marketers</p>
          <div className="flex-grow mb-6">
            <ul className="space-y-3">
              {proFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                  <span className="ml-3 text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <button 
            className="pricing-button button-outline"
            onClick={() => handleSelectPlan('pro')}
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Agency Plan - Wide box at the bottom */}
      <div className="mb-12">
        <div className="pricing-card-wide border border-gray-800 rounded-lg bg-gray-900/50">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Agency</h2>
              <div className="text-4xl font-bold mb-2">$199<span className="text-gray-400 text-lg font-normal">/mo</span></div>
              <p className="text-gray-400 mb-6">Perfect for content creators and growing brands</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ul className="space-y-3">
                {agencyFeatures.slice(0, Math.ceil(agencyFeatures.length / 2)).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                    <span className="ml-3 text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-3">
                {agencyFeatures.slice(Math.ceil(agencyFeatures.length / 2)).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                    <span className="ml-3 text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <button 
              className="pricing-button button-outline max-w-xs"
              onClick={() => handleSelectPlan('agency')}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PricingCards; 