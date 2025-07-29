// src/pages/NewPasswordPage.tsx
import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Assuming supabase client is available
import { z } from 'zod'; // For input validation

// Define a schema for password validation
const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'], // Path of the error
});

export function NewPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // This useEffect ensures the user is authenticated before allowing password change
  // Supabase's onAuthStateChange in AuthContext should handle setting the session from URL hash
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // If no user is in session, it means the token from the email link is invalid or expired
        setError('Invalid or expired password reset link. Please try again.');
        // Optionally, redirect to reset password request page
        // navigate('/reset-password', { replace: true });
      }
    };
    checkUserSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setError(null);

    try {
      // Validate inputs using Zod
      passwordSchema.parse({ password, confirmPassword });

      // Call Supabase to update the user's password
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setMessage('Your password has been updated successfully!');
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

    } catch (err: any) {
      if (err instanceof z.ZodError) {
        // Zod errors can have multiple issues, display the first one
        setError(err.errors[0].message);
      } else {
        console.error('Error updating password:', err);
        setError(err.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden p-8">
        {/* Icon and Main Heading */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Your New Password</h1>
        </div>

        {/* Core Message and Instructions */}
        <div className="text-center mb-8">
          <p className="text-gray-600 text-lg mb-4">
            Enter and confirm your new password below. Make it strong and memorable!
          </p>
        </div>

        {/* Password Input Form */}
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">New Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="New Password"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="sr-only">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Confirm New Password"
              required
            />
          </div>

          {/* Error/Message Display */}
          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
          {message && (
            <p className="text-green-600 text-sm text-center flex items-center justify-center">
              <CheckCircle className="w-5 h-5 mr-2" /> {message}
            </p>
          )}

          {/* Update Password Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center group shadow-md hover:shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </>
            )}
          </button>
        </form>

        {/* Subtle Reinforcement */}
        <p className="mt-8 text-center text-gray-500 text-xs">
          Your security is our priority.
        </p>
      </div>
    </div>
  );
}
