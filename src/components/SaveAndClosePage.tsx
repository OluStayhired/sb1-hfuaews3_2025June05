
// src/components/SaveAndClosePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Edit, Home, ArrowRight, X, UserPlus, LayoutGrid } from 'lucide-react'; // Import X icon
import { checkConnectedSocials } from '../utils/checkConnectedSocial'; // Import the utility
import { NoSocialModal } from './NoSocialModal'; // Assuming NoSocialModal is available

interface SaveAndClosePageProps {
  isOpen: boolean; // Added isOpen prop
  onClose: () => void; // Added onClose prop
  postContent: string | null; 
}

export function SaveAndClosePage({ isOpen, onClose, postContent }: SaveAndClosePageProps) {
  const navigate = useNavigate();

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

        {/* Success Header for Save & Close */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
            <FileText className="h-10 w-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold">Post Saved!</h1>
          <p className="mt-2 text-blue-100">
            Your first post is saved as a draft.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-8">
            <p className="text-gray-600 text-center">
              Start on your content creation journey! Connect your social accounts to create a content calendar and leave the rest to us! 
            </p>
          </div>

          <div className="space-y-4">
            {/* Primary Button - Go to Compose */}
            <button
              onClick={() => {
                onClose(); // Close the modal
                navigate('/dashboard/compose');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center group"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              <span className="font-medium">Connect Accounts</span>
              <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Secondary Button - Go to Dashboard */}
            <button
              onClick={() => {
                onClose(); // Close the modal
                navigate('/dashboard/userdashboard');
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <LayoutGrid className="mr-2 h-5 w-5" />
              <span className="font-medium">Go to Dashboard</span>
            </button>
          </div>

          {/*
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Ready to connect? Find social channels in your <a href="#" className="text-purple-500 hover:underline">Account Settings</a>.
            </p>
          </div>
          */}
          
        </div>
      </div>
    </div>
  );
}