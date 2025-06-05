// src/components/ScheduleDateWarningModal.tsx
import React from 'react';
import { X, AlertTriangle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduleDateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
}

export function ScheduleDateWarningModal({ 
  isOpen, 
  onClose,
  selectedDate 
}: ScheduleDateWarningModalProps) {
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
            Invalid Schedule Date
          </h2>

          <div className="bg-amber-50 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-center space-x-3 text-amber-700">
              <Calendar className="w-5 h-5" />
              <p className="text-sm font-medium">
                {format(selectedDate, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            You cannot schedule posts for dates in the past. Please select a future date to schedule your post.
          </p>

          <button
            onClick={onClose}
            className="w-full bg-amber-500 text-white py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center space-x-2"
          >
            <span>Choose Another Date</span>
          </button>
        </div>
      </div>
    </div>
  );
}
