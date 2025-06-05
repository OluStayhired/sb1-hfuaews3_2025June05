// src/components/DeleteCampaignWarning.tsx

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteCampaignWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  campaignName: string;
}

export function DeleteCampaignWarning({ 
  isOpen, 
  onClose, 
  onConfirm,
  campaignName
}: DeleteCampaignWarningProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start mb-6">
          <div className="flex-shrink-0 bg-red-50 rounded-full p-2 mr-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Campaign Deletion
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This action cannot be undone.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-gray-600">
            Are you sure you want to delete the following campaign?
          </p>
          <p className="mt-2 text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-md">
            "{campaignName}"
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition-colors flex items-center space-x-2"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
