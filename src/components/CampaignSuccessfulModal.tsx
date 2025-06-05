import React, { useState, useEffect } from 'react';
import { PartyPopper, X, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ShowCalendarContent } from './ShowCalendarContent';


interface CampaignSuccessfulModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
}

export function CampaignSuccessfulModal({ isOpen, onClose, campaignName }: CampaignSuccessfulModalProps) {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

// Add useEffect to get user email
useEffect(() => {
  const fetchUserEmail = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      setCurrentUserEmail(session.user.email);
    }
  };
  fetchUserEmail();
}, []);


  if (!isOpen) return null;

 return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        {/* Success content */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <PartyPopper className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Campaign Created!
          </h2>
          <p className="text-gray-600 mb-6">
           Your campaign <span className="font-bold">{campaignName}</span> has been created successfully. You can now start managing your content.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
          >
            View Campaign
          </button>
        </div>
      </div>
    </div>
  );
}