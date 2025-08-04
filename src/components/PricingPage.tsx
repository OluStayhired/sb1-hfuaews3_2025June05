// src/pages/PricingPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, CheckCircle2, Sparkles, Users, CalendarDays, DollarSign, ArrowRight } from 'lucide-react'; // Icons for features
import { useAuth } from '../context/AuthContext'; 

export function PricingPage() {
  // Define the features for the Pro Plan, drawing from benefits and upgrade details
  const proPlanFeatures = [
    "Get instant content ideas from any website",
    "Craft scroll-stopping posts with AI assistance",
    "Attract clients on autopilot with scheduled content",
    "Manage up to 20 Content Campaigns",
    "Connect up to 8 Social Media Accounts (LinkedIn, Twitter, Bluesky)",
    "Build 30-Day Content Calendars",
    "Enjoy Unlimited AI Rewrites for your posts",
    //"Access to advanced analytics and insights",
    "Priority customer support",
  ];

  // Access the authenticated user
  const { user } = useAuth();

  // State for loading and error feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: State to manage the billing period toggle (true for monthly, false for yearly)
  const [isMonthlyBilling, setIsMonthlyBilling] = useState(true);

  // Define Stripe Price IDs
  const STRIPE_PRICE_IDS = {
    monthly: 'price_1Ro8sHGatbp3kZShvhQWkgJU', // LIVE Replace with your actual monthly Stripe Price ID
    yearly: 'price_1Ro8sHGatbp3kZShHnp5sYZ6',   //LIVE Replace with your actual yearly Stripe Price ID
    
    //monthly: 'price_1RoPyXGatbp3kZShAzyx4HWi', // test stripe id
    //yearly:  'price_1RoPyXGatbp3kZSh0iMW92rh', // test stripe id

    
  };

  // Define the URL for your create-checkout-session Edge Function
  // Ensure this environment variable is set in your .env file
  const VITE_CREATE_CHECKOUT_SESSION_URL = import.meta.env.VITE_CREATE_CHECKOUT_SESSION_URL;

  // New: handleCreateCheckoutSession function
  const handleCreateCheckoutSession = async (priceId: string) => {
    if (!user) {
      setError('You must be logged in to subscribe.');
      return;
    }
    if (!VITE_CREATE_CHECKOUT_SESSION_URL) {
      setError('Checkout session URL is not configured.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(VITE_CREATE_CHECKOUT_SESSION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // If your Edge Function requires authentication, add it here
          // 'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          user_id: user.id, // Pass the Supabase user ID
          price_id: priceId, // Pass the selected Stripe Price ID
          quantity: 1, // Assuming 1 unit of the subscription
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session.');
      }

      const { url } = await response.json();
      if (url) {
        // Redirect the user to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('Stripe Checkout URL not received.');
      }
    } catch (err: any) {
      console.error('Error creating checkout session:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
     <div className="p-4">
      <div className="max-w-8xl mx-auto">
        {/*Header Section Starts Here*/}
        <div className="flex items-center space-x-2 mb-8">
          <div className="p-2 bg-blue-100 rounded-md">
            <DollarSign className="w-5 h-5 text-blue-500"/>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Pricing</h2>
        </div>
        {/*End Header Section Here*/}
        
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header Section - Overall Page Title */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 text-white text-center">
          <h1 className="text-4xl font-extrabold mb-3">Upgrade Plan</h1>
          <p className="text-blue-100 text-lg">
            Unlock powerful features to supercharge your social media presence.
          </p>
        </div>

        {/* Pricing Card Container */}
        <div className="p-8">
          {/* Pro Plan Card - The Single Pricing Option */}
          <div className="p-6 text-center bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-lg hover:border-blue-300 transition-all group shadow-m">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Pro Plan</h2>

             {/* NEW: Toggle Switch for Monthly/Yearly */}
            <div className="flex justify-center items-center mb-6">
              <span className={`text-sm font-medium ${isMonthlyBilling ? 'text-blue-600' : 'text-gray-500'}`}>Monthly</span>
              <label className="relative inline-flex items-center cursor-pointer mx-4">
                <input
                  type="checkbox"
                  value=""
                  className="sr-only peer"
                  checked={!isMonthlyBilling} // Checked when yearly is selected
                  onChange={() => setIsMonthlyBilling(!isMonthlyBilling)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className={`text-sm font-medium ${!isMonthlyBilling ? 'text-blue-600' : 'text-gray-500'}`}>Yearly</span>
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Save $50!</span>
            </div>
            

           {/* Price Display - Conditional based on toggle */}
            <div className="flex items-center justify-center mb-6">
              <span className="text-5xl font-extrabold text-blue-600">
                ${isMonthlyBilling ? '25' : '250'}
              </span>
              <span className="text-xl font-medium text-gray-600">
                /{isMonthlyBilling ? 'month' : 'year'}
              </span>
            </div>

        {/* Error message display */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}


            {/* Features List - Detailed Value Proposition */}
            <ul className="space-y-3 text-left mb-8">
              {proPlanFeatures.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* Call to Action Button - Clear and Action-Oriented */}
            <button
              //onClick={() => handleCreateCheckoutSession('price_monthly_pro')} // Replace with your actual Stripe Price ID
               onClick={() => handleCreateCheckoutSession(isMonthlyBilling ? STRIPE_PRICE_IDS.monthly : STRIPE_PRICE_IDS.yearly)}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/50"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span className="font-semibold text-lg">Redirecting...</span>
                </>
              ) : (
                <>
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold text-lg">Upgrade Now</span>
              <ArrowRight className="w-5 h-5 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                   </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}

export default PricingPage;
