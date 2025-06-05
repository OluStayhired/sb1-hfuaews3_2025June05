import React from 'react';
import { X, AlertTriangle, Calendar, ArrowRight, Megaphone } from 'lucide-react';
import { format } from 'date-fns';

interface CampaignStartDateWarningProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  campaignStartDate: Date;
  selectedDate: Date;
  onUpdateDate: () => void;
  onViewCampaigns: () => void;
}

export function CampaignStartDateWarning({ 
  isOpen, 
  onClose,
  campaignName,
  campaignStartDate,
  selectedDate,
  onUpdateDate,
  onViewCampaigns
}: CampaignStartDateWarningProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Warning Icon */}
          <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Campaign Date Mismatch
          </h2>

          <div className="bg-amber-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center mb-3">
              <Megaphone className="w-5 h-5 text-amber-700 mr-2" />
              <p className="text-sm font-medium text-amber-700">
                {campaignName}
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-3 text-gray-600">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Selected Date</span>
                <span className="text-sm font-medium text-red-500">
                  {format(selectedDate, 'MMM d, yyyy')}
                </span>
              </div>
              
              <ArrowRight className="w-4 h-4 text-gray-400" />
              
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Campaign Start</span>
                <span className="text-sm font-medium text-green-500">
                  {format(campaignStartDate, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            Your selected date is before the start date of the active campaign. You can either:
          </p>

          <div className="space-y-3">
            <button
              onClick={onUpdateDate}
              className="w-full bg-amber-500 text-white py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Calendar className="w-5 h-5" />
              <span>Update Post to Campaign Start Date</span>
            </button>
            
            <button
              onClick={onViewCampaigns}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
            >
              <Megaphone className="w-5 h-5" />
              <span>Activate an Older Campaign</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}