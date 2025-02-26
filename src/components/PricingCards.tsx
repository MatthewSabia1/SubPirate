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

  return (
    <>
      <style>{pricingStyles}</style>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Starter Plan */}
        <div className="pricing-card">
          <h2 className="text-2xl font-bold mb-2">Starter</h2>
          <div className="text-4xl font-bold mb-2">$19.99<span className="text-gray-400 text-lg font-normal">/mo</span></div>
          <p className="text-gray-400 mb-6">Essential features for getting started with Reddit marketing</p>
          <div className="flex-grow mb-6">
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">10 subreddit analyses per month</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">Unlimited competitor intelligence</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">50 opportunity finder subreddits</span>
              </li>
            </ul>
          </div>
          <button 
            className="pricing-button button-outline"
            onClick={() => handleSelectPlan('starter')}
          >
            Get Started
          </button>
        </div>

        {/* Professional Plan */}
        <div className="pricing-card-featured">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-[#C69B7B] text-black px-4 py-1 rounded-full text-sm font-medium">
              MOST POPULAR
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Professional</h2>
          <div className="text-4xl font-bold mb-2">$47.99<span className="text-gray-400 text-lg font-normal">/mo</span></div>
          <p className="text-gray-400 mb-6">Advanced features for professional marketers</p>
          <div className="flex-grow mb-6">
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">50 subreddit analyses monthly</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">Advanced competitor intelligence dashboard</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">Unlimited opportunity finder subreddits</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">5 Reddit account protection system</span>
              </li>
            </ul>
          </div>
          <button 
            className="pricing-button button-primary"
            onClick={() => handleSelectPlan('professional')}
          >
            Get Started
          </button>
        </div>

        {/* Agency Plan */}
        <div className="pricing-card">
          <h2 className="text-2xl font-bold mb-2">Agency</h2>
          <div className="text-4xl font-bold mb-2">$97.99<span className="text-gray-400 text-lg font-normal">/mo</span></div>
          <p className="text-gray-400 mb-6">Full platform access for marketing teams and agencies</p>
          <div className="flex-grow mb-6">
            <ul className="space-y-3">
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">Unlimited subreddit analysis</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">Premium content strategy AI assistant</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">Unlimited subreddit targeting</span>
              </li>
              <li className="flex items-start">
                <Check className="h-5 w-5 text-[#C69B7B] shrink-0 mt-0.5" />
                <span className="ml-3 text-gray-300">Unlimited Reddit account management</span>
              </li>
            </ul>
          </div>
          <button 
            className="pricing-button button-outline"
            onClick={() => handleSelectPlan('agency')}
          >
            Get Started
          </button>
        </div>
      </div>
    </>
  );
};

export default PricingCards; 