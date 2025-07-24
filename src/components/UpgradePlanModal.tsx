import React from 'react';
import { X, Rocket, CheckCircle, CheckCircle2, Users, CalendarDays, Sparkles, DollarSign } from 'lucide-react';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  // --- ADDED THIS LINE ---
  message: string; // The dynamic message from checkLimits
}

export function UpgradePlanModal({ isOpen, onClose, message }: UpgradePlanModalProps) { // --- ADDED 'message' HERE ---
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close upgrade modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Rocket className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Unlock Your Full Potential!
          </h2>
          {/* --- REPLACED STATIC MESSAGE WITH DYNAMIC 'message' PROP --- */}
          <p className="text-gray-600 text-sm">
            {message} {/* This will display the specific limit message */}
          </p>
        </div>

        {/* Benefits Section - (Keep these static as they describe overall upgrade value) */}
        <div className=" bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-lg hover:border-blue-300 transition-all group p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-blue-500 mb-3 text-center">
            What You'll Get 👇
          </h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-gray-900">Manage upto 20 Content Campaigns</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-gray-900">Connect 8 Social Media Accounts</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-gray-900">Build 30-Day Content Calendars</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="text-gray-900">Enjoy Unlimited AI Rewrites</span>
            </li>
          </ul>
        </div>

        {/* Pricing Callout */}
        <div className="text-center mb-6">
          <p className="text-gray-700 text-lg font-medium">
            All this for just
          </p>
          <p className="text-blue-600 text-5xl font-extrabold my-2 flex items-center justify-center">
            <DollarSign className="w-8 h-8 mr-1" />25<span className="text-xl font-semibold">/mo</span>
          </p>
        </div>

        {/* Upgrade Button */}
        <button
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/50"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold text-lg">Upgrade Now</span>
        </button>
      </div>
    </div>
  );
}