import React, { useState } from 'react';
import { X, Loader2, Users, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
//import XLogo from '../images/x-logo.svg';

interface MoreBlueskyAccountsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoreBlueskyAccounts({ isOpen, onClose }: MoreBlueskyAccountsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

const handleRequestFeature = async () => {
  setIsSubmitting(true);
  setError(null);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('No authenticated user found');
    }

    const featureToRequest = 'Connect More Bluesky Accounts';
    const featureType = 'Upgrade';
    const socialChannel = 'Bluesky';
    const userEmail = session.user.email;
    const userId = session.user.id;

    // --- Start of UX-focused change for duplicate requests ---

    // 1. First, try to find an existing request for this user and feature
    const { data: existingRequest, error: fetchError } = await supabase
      .from('product_request')
      .select('id, requested') 
      .eq('feature', featureToRequest)
      .eq('email', userEmail) 
      .single(); 

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means "No rows found"
        // This is a real error during fetch, not just no record found
        console.error('Error checking for existing feature request:', fetchError);
        throw fetchError;
    }

    if (existingRequest) {
      // 2. If an existing request is found, increment its 'requests' count
      const { error: updateError } = await supabase
        .from('product_request')
        .update({ requested: existingRequest.requested + 1, updated_at: new Date().toISOString() }) // Assuming 'updated_at' column
        .eq('id', existingRequest.id); // Update by ID

      if (updateError) {
        console.error('Error incrementing feature request count:', updateError);
        throw updateError;
      }
      //console.log('Incremented existing feature request for:', featureToRequest);

    } else {
      // 3. If no existing request, insert a new one (with requests = 1)
      const { error: insertError } = await supabase
        .from('product_request')
        .insert({
          feature: featureToRequest,
          feature_type: featureType,
          email: userEmail,
          social_channel: socialChannel,
          user_id: userId,
          //requested: 1, // Initialize with 1 request
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting new feature request:', insertError);
        throw insertError;
      }
      //console.log('New feature request submitted for:', featureToRequest);
    }

    // --- End of UX-focused change ---

    setSubmitted(true); // Indicate success (either new request or incremented)
    // Close modal after 3 seconds
    setTimeout(() => {
      onClose();
      setSubmitted(false);
    }, 3000);

  } catch (err) {
    console.error('Error handling feature request:', err); // Catching both fetch and update/insert errors
    setError('Could not process your request. Please try again.'); // Generic user-friendly error
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
     <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
       {/*<div className="bg-white rounded-lg p-6 w-full max-w-md relative">*/}
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          {/* Logo Section */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-gray-50 rounded-full p-1 shadow-sm">
                <img
                  src={BlueskyLogo}
                  alt="Bluesky"
                  className="w-3 h-3"
                />
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            More Bluesky Accounts 
          </h2>
          
          <p className="text-gray-600 text-sm mb-6">
            Want to manage multiple Bluesky accounts? Let us know you're interested in this feature!
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {submitted ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-lg">
              <p className="font-medium">Thank you for your interest!</p>
              <p className="text-sm">We'll notify you when this feature becomes available.</p>
            </div>
          ) : (
            <button
              onClick={handleRequestFeature}
              disabled={isSubmitting}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Request This Feature</span>
                </>
              )}
            </button>
          )}

          <p className="mt-4 text-sm text-gray-500">
            We're always improving to better serve your needs.
          </p>
        </div>
      </div>
    </div>
  );
}