// src/components/OnboardSuccessPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, ArrowRight, Home, X, LayoutGrid, PlusCircle } from 'lucide-react'; // Import X icon
import { checkConnectedSocials } from '../utils/checkConnectedSocial'; // Import the utility
import { NoSocialModal } from './NoSocialModal'; // Assuming NoSocialModal is available
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';



interface OnboardSuccessPageProps {
  isOpen: boolean; 
  onClose: () => void; 
  postContent: string | null; 
}

export function OnboardSuccessPage({ isOpen, onClose, postContent }: OnboardSuccessPageProps) {
  const navigate = useNavigate();
   const [showNoSocialModal, setShowNoSocialModal] = useState(false); // State for NoSocialModal

  const handleComposeDraft = async () => {
    if (!postContent) {
      console.warn('No post content available to compose.');
      // Optionally, show a user-friendly message here
      return;
    }

    const socials = await checkConnectedSocials();

    if (!socials || (!socials.bluesky && !socials.linkedin && !socials.twitter)) {
      // No social accounts connected, show NoSocialModal
      setShowNoSocialModal(true);
      return;
    }

    // If postContent exists and there's at least one active social connection
    onClose(); // Close the OnboardSuccessPage modal
    navigate('/dashboard/compose', { state: { draftContent: postContent } }); // Pass content via state
  };

  // Handlers for NoSocialModal (if you decide to use it here)
  const handleCloseNoSocialModal = () => {
    setShowNoSocialModal(false);
  };

  const handleConnectBluesky = () => {
    // This would typically open your Bluesky connection modal
    // For now, just log and close NoSocialModal
    console.log('Connecting Bluesky from OnboardSuccessPage');
    setShowNoSocialModal(false);
    // You might need to trigger a modal or redirect here
  };

  const handleConnectLinkedIn = () => {
    // This would typically open your LinkedIn connection flow
    // For now, just log and close NoSocialModal
    console.log('Connecting LinkedIn from OnboardSuccessPage');
    setShowNoSocialModal(false);
    // You might need to trigger a modal or redirect here
  };

  if (!isOpen) return null; // Don't render if not open

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden relative"> {/* Added relative for close button */}
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        {/* Success Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white items-center text-center">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold">Account Connected!</h1>
          <p className="mt-2 text-blue-100">
            You're all set to start generating content ideas 🚀
          </p>
        </div>

        {/* Content */}
        <div className="p-6 items-center">
          <div className="mb-8">
            <p className="text-gray-600 text-center">
              {/*Your social media account has been successfully connected. You can now start on your content creation journey!*/}
              Launch your 2 week Content Campaign in 30 seconds! 
            </p>
          </div>

          <div className="flex space-x-2 items-center justify-center"> {/* Added 'flex' and kept 'space-x-2' for horizontal spacing */}
  
            <TooltipExtended text="⚡Schedule your first post on LinkedIn, Twitter & Bluesky">
              <button
                onClick={handleComposeDraft}
                // Removed w-full
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center group"
              >
              <Calendar className="mr-2 h-4 w-4" />
              <span className="font-normal text-sm">View First Post</span>
            </button>
              </TooltipExtended>

            {/* Secondary Button - Go to Dashboard */}
              <TooltipExtended text="⚡Get instant content for 2 weeks on LinkedIn, Twitter & Bluesky">
            <button
              onClick={() => {
                onClose(); // Close the modal
                navigate('/dashboard/campaign');
              }}
              // Removed w-full
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
              <PlusCircle className="mr-2 h-4 w-4" />
                <span className="font-normal text-sm">Launch Content Campaign</span>
                  </button>
                    </TooltipExtended>
                </div>
          {/*
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Need help getting started? Check out our <a href="#" className="text-blue-500 hover:underline">quick start guide</a>.
            </p>
          </div>
        */}
          
        </div>
      </div>

     {/* NoSocialModal (conditionally rendered) */}
      <NoSocialModal
        isOpen={showNoSocialModal}
        onClose={handleCloseNoSocialModal}
        onConnectBluesky={handleConnectBluesky} // Pass appropriate handlers
        onConnectLinkedIn={handleConnectLinkedIn} // Pass appropriate handlers
      />      
      
    </div>
  );
}