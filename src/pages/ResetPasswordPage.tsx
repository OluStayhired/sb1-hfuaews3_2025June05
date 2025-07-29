// src/pages/ResetPasswordPage.tsx
import React, { useState } from 'react';
import { Lock, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Assuming supabase client is available
import { z } from 'zod'; // For input validation

// Define a schema for email validation
const emailSchema = z.string().email('Invalid email address');

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      // Validate email input
      emailSchema.parse(email);

      // Call Supabase to send the password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // URL for the password update page
      });

      if (resetError) {
        throw resetError;
      }

      // On success, redirect to a confirmation page
      navigate('/check-email-for-reset', { replace: true });

    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        console.error('Error sending password reset email:', err);
        setError(err.message || 'Failed to send password reset link. Please try again.');
      }
    } finally {
      setIsLoading(false);
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
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Your Password?</h1>
        </div>

        {/* Core Message and Instructions */}
        <div className="text-center mb-8">
          <p className="text-gray-600 text-lg mb-4">
            No worries. Enter your email below and we'll send you a secure link to reset it.
          </p>
        </div>

        {/* Email Input Form */}
        <form onSubmit={handleSendResetLink} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Error/Message Display */}
          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
          {message && (
            <p className="text-green-600 text-sm text-center">{message}</p>
          )}

          {/* Send Reset Link Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center group shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </>
            )}
          </button>
        </form>

        {/* Return to Login Link */}
        <div className="mt-6 text-center">
          <button
            onClick={handleReturnToLogin}
            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none flex items-center justify-center mx-auto"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Return to Login
          </button>
        </div>

        {/* Subtle Reinforcement */}
        <p className="mt-8 text-center text-gray-500 text-xs">
          We'll help you get back into your account securely.
        </p>
      </div>
    </div>
  );
}
