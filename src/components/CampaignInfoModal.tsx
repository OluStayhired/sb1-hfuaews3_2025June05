import React, { useState, useEffect } from 'react';
import { AlertCircle, X, CalendarCheck, CalendarDays, CalendarClock, Megaphone, PlusCircle, ArrowRight, Info } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';

interface CampaignInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  onCreateNewCampaign?: () => void;
}

export function CampaignInfoModal({
  isOpen,
  onClose,
  campaignName,
  onCreateNewCampaign
}: CampaignInfoModalProps) {
  const [campaignDescription, setCampaignDescription] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchCampaignDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('calendar_questions')
          .select('calendar_description, start_date, end_date')
          .eq('calendar_name', campaignName)
          .single();

        if (error) throw error;

        setCampaignDescription(data.calendar_description);
        setStartDate(parseISO(data.start_date));
        setEndDate(parseISO(data.end_date));
      } catch (err) {
        console.error('Error fetching campaign details:', err);
        // Handle error appropriately (e.g., set an error state)
      }
    };

    if (isOpen && campaignName) {
      fetchCampaignDetails();
    }
  }, [isOpen, campaignName]);

  if (!isOpen || !startDate || !endDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, differenceInDays(endDate, today));
  
  const totalDuration = differenceInDays(endDate, startDate);
  const daysElapsed = Math.min(totalDuration, Math.max(0, differenceInDays(today, startDate)));
  const progressPercentage = Math.min(100, Math.round((daysElapsed / totalDuration) * 100));

  const isCampaignEnded = daysLeft <= 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl relative"> {/* Added relative for X button */}
        
        {/* NEW: Close button at top-right of the entire modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors"
          aria-label="Close modal" // Good accessibility practice
        >
          <X className="w-6 h-6" />
        </button>

        {/* Top-centered AlertCircle for immediate alert */}
        <div className="pt-6 pb-4 flex justify-center">
          <div className="bg-red-50 p-3 rounded-full">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Main Message - Prominent and Central */}
        <div className="text-center px-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Campaign Ended</h2> {/* Largest, boldest text for primary message */}
            <div className="flex items-center justify-center mb-4">
                  <p className="text-gray-500 text-sm mr-2">{campaignName}</p>
              <TooltipExtended text={campaignDescription}>
                  <Info className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" /> {/* Larger icon, more distinct color */}
              </TooltipExtended>
              </div>
          {/*
          {campaignDescription && (
            <p className="text-gray-300 text-sm mb-6">{campaignDescription}</p> 
          )}
          */}
        </div>

        {/* Campaign Status Block - Clear and concise messaging */}
        <div className="px-6 py-4 bg-red-50 rounded-lg mx-6 mb-6 flex items-start space-x-3"> {/* Added mx-6 for side padding */}
          <div className="flex-shrink-0 bg-red-100 p-2 rounded-full flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-red-700">This campaign has concluded.</h3>
            <p className="text-sm text-gray-700 mt-1">
              {isCampaignEnded
                ? "Create a new campaign to continue engaging your audience."
                : "This message should only appear for ended campaigns." // Ensure logic is correct for only ended campaigns
              }
            </p>
          </div>
        </div>
        
        {/* Campaign Details - Progress and Stats */}
        <div className="px-6 pb-6"> {/* Consistent padding */}
          {/* Campaign Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Campaign Progress</span>
              <span>{progressPercentage}% Complete</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" // Red gradient for progress
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Campaign Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 p-4 rounded-lg"> {/* Subtle red background */}
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full mb-2 mx-auto">
                <CalendarClock className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-center text-xs text-gray-500">Days Left</p>
              <p className="text-center text-xl font-bold text-red-700">{daysLeft}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full mb-2 mx-auto">
                <CalendarDays className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-center text-xs text-gray-500">Start Date</p>
              <p className="text-center text-sm font-semibold text-gray-700">{format(startDate, 'MMM d')}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full mb-2 mx-auto">
                <CalendarCheck className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-center text-xs text-gray-500">End Date</p>
              <p className="text-center text-sm font-semibold text-gray-700">{format(endDate, 'MMM d')}</p>
            </div>
          </div>
          
          {/* Primary Action Button (using blue/indigo for forward action) */}
          {onCreateNewCampaign && (
            <button
              onClick={onCreateNewCampaign}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg shadow-md transition-all flex items-center justify-center space-x-2 group"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create New Campaign</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}