// src/pages/PaymentSuccessPage.tsx

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, LayoutGrid } from 'lucide-react';

export function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // To potentially read session_id from URL

  // Optional: You might want to verify the session_id with your backend here
  // to ensure the payment was truly successful and update any final user states.
  // For this suggestion, we'll focus on the UI/UX and redirect.
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      //console.log('Stripe Checkout Session ID Done', sessionId);
      console.log('Stripe Checkout Session ID Done');
      // In a real application, you would send this sessionId to your backend
      // to verify the payment and provision access.
    }
  }, [searchParams]);

  const handleContinueToDashboard = () => {
    navigate('/dashboard/userdashboard'); // Navigate to the user's main dashboard
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Success Header Section */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="mt-2 text-blue-100">
            Your plan is now active. Welcome to the Pro experience!
          </p>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <div className="mb-8 text-center">
            <p className="text-gray-600">
              Thank you for upgrading. You now have access to all premium features.
              Get ready to supercharge your social media presence!
            </p>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinueToDashboard}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center group shadow-md hover:shadow-lg"
          >
            <LayoutGrid className="mr-2 h-5 w-5" />
            <span className="font-medium">Continue to Dashboard</span>
            <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
}
