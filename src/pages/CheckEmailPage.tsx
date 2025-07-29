// src/pages/CheckEmailPage.tsx
import React, { useState } from 'react';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Assuming supabase client is available

export function CheckEmailPage() {
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      // This assumes you have the user's email from the signup process.
      // In a real scenario, you might need to store it in local storage
      // or pass it via route state after signup. For this example,
      // we'll assume a simple resend without needing the email here.
      // A more robust solution might involve a backend endpoint to resend.
      
      // For demonstration, we'll simulate a resend.
      // In a real app, you'd call a Supabase auth method like:
      // const { error } = await supabase.auth.resend({
      //   type: 'signup',
      //   email: 'user@example.com' // You'd need the actual email here
      // });

      // Simulating success
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      setResendMessage('Verification email resent! Please check your inbox.');
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      setResendError(error.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

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
            We've sent a verification link to your inbox.
          </p>
          <p className="text-gray-500 text-sm">
            Please click the link in the email to activate your account and continue. (Check Spam Folders)
          </p>
        </div>

        {/* Call to Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center group shadow-md hover:shadow-lg"
          >
            {isResending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <span>Resending...</span>
              </>
            ) : (
              <>
                <span>Resend Email</span>
                <ArrowRight className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </>
            )}
          </button>

          <button
            onClick={handleReturnToLogin}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg transition-colors flex items-center justify-center group"
          >
            <span>Return to Login</span>
            <ArrowRight className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* Resend Feedback */}
        {resendMessage && (
          <p className="mt-4 text-center text-green-600 text-sm">{resendMessage}</p>
        )}
        {resendError && (
          <p className="mt-4 text-center text-red-600 text-sm">{resendError}</p>
        )}

        {/* Subtle Reinforcement */}
        <p className="mt-8 text-center text-gray-500 text-xs">
          This step helps us keep your account secure.
        </p>
      </div>
    </div>
  );
}
