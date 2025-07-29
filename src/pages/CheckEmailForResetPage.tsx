// src/pages/CheckEmailForResetPage.tsx
import React from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CheckEmailForResetPage() {
  const navigate = useNavigate();

  const handleReturnToLogin = () => {
    navigate('/login'); // Navigate back to the login page
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden p-8">
        {/* Icon and Main Heading */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Your Email</h1>
        </div>

        {/* Core Message and Instructions */}
        <div className="text-center mb-8">
          <p className="text-gray-600 text-lg mb-4">
            A password reset link has been sent to your inbox.
          </p>
          <p className="text-gray-500 text-sm">
            Please click the link in the email to set a new password.
          </p>
          <p className="mt-4 text-gray-500 text-xs">
            (If you don't see it, please check your spam folder.)
          </p>
        </div>

        {/* Call to Action Button */}
        <div className="space-y-4">
          <button
            onClick={handleReturnToLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center group shadow-md hover:shadow-lg"
          >
            <span>Return to Login</span>
            <ArrowLeft className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* Subtle Reinforcement */}
        <p className="mt-8 text-center text-gray-500 text-xs">
          For security, this link is valid for a limited time.
        </p>
      </div>
    </div>
  );
}
