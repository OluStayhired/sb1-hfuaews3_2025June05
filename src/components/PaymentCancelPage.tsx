// src/pages/PaymentCancelPage.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, LayoutGrid, DollarSign } from 'lucide-react';

export function PaymentCancelPage() {
  const navigate = useNavigate();

  const handleReturnToDashboard = () => {
    navigate('/dashboard/userdashboard'); // Navigate back to the user's main dashboard
  };

  const handleViewPricing = () => {
    // Assuming you have a pricing page or a section in the dashboard for pricing
    navigate('/dashboard/pricing'); // Or a dedicated  pricing route like '/pricing'
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-6 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-10 w-10 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold">Payment Canceled</h1>
          <p className="mt-2 text-gray-100">
            No charges were made. Your plan remains unchanged.
          </p>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <div className="mb-8 text-center">
            <p className="text-gray-600">
              You've decided not to proceed with the upgrade at this time.
              We understand, and you can always upgrade later to access all premium features.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleReturnToDashboard}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center group shadow-md hover:shadow-lg"
            >
              <LayoutGrid className="mr-2 h-5 w-5" />
              <span className="font-medium">Return to Dashboard</span>
              <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={handleViewPricing}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg transition-colors flex items-center justify-center group"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              <span className="font-medium">View Pricing Plans</span>
              <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
