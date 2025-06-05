// src/components/CampaignInfoCard.tsx
import React from 'react';
import { PlusCircle, AlertCircle } from 'lucide-react'; // Assuming you use lucide-react for icons
import { useNavigate } from 'react-router-dom';

// Define the props for your new card component
interface CampaignInfoCardProps {
  campaignName: string;
  onCreateNewCampaign: () => void;
  // No 'isOpen' or 'onClose' props, as it's no longer a modal
}

/**
 * A card component displayed inline within the content grid
 * to prompt the user to set up campaign details.
 */
export function CampaignInfoCard({ campaignName, onCreateNewCampaign }: CampaignInfoCardProps) {
   const navigate = useNavigate();

    const handleNewCampaignClick = () => {
    navigate('/dashboard/campaign');
    onCreateNewCampaign(); // Call the function to update the state in the parent component
  };
  
  return (
    <div className="bg-white rounded-lg border border-dashed border-gray-300 shadow-sm p-6 text-center h-full flex flex-col items-center justify-center">
      <div className="bg-blue-50 p-2 rounded-full">
      <AlertCircle className="text-blue-500 h-8 w-8"/>
        </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Campaign Completed!</h3>
      <p className="text-sm text-gray-500 mb-4">
        {/*Looks like you haven't set up the details for "{campaignName}" yet.
        Define your social goals, target audience, and end date to get started!*/}
        This campaign has ended. Create a new campaign to continue posting content.
      </p>
      <button
        onClick={handleNewCampaignClick}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        New Campaign
      </button>
    </div>
  );
}