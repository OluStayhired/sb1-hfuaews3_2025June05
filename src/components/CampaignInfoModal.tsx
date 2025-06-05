import React, { useState, useEffect } from 'react';
import { AlertTriangle,CalendarCheck, X, Calendar, CalendarDays, CalendarClock, Megaphone, PlusCircle, ArrowRight } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';

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

  // Calculate days left
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, differenceInDays(endDate, today));
  
  // Calculate campaign duration
  const totalDuration = differenceInDays(endDate, startDate);
  const daysElapsed = Math.min(totalDuration, Math.max(0, differenceInDays(today, startDate)));
  const progressPercentage = Math.min(100, Math.round((daysElapsed / totalDuration) * 100));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white rounded-full p-1 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{campaignName}</h2>
              {campaignDescription && (
                <p className="text-white/80 text-sm mt-1">{campaignDescription}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Campaign Progress */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Campaign Progress</span>
              <span>{progressPercentage}% Complete</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
          
          {/* Campaign Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2 mx-auto">
                <CalendarClock className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-center text-xs text-gray-500">Days Left</p>
              <p className="text-center text-xl font-bold text-blue-700">{daysLeft}</p>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-full mb-2 mx-auto">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-center text-xs text-gray-500">Start Date</p>
              <p className="text-center text-sm font-semibold text-indigo-700">{format(startDate, 'MMM d')}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2 mx-auto">
                <CalendarCheck className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-center text-xs text-gray-500">End Date</p>
              <p className="text-center text-sm font-semibold text-purple-700">{format(endDate, 'MMM d')}</p>
            </div>
          </div>
          
          {/* Campaign Status */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg mb-6">
            <div className="flex items-start space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <Calendar className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-medium text-red-500">Campaign Ended</h3>
                <p className="text-sm text-gray-700 mt-1">
                  {daysLeft === 0 
                    ? "This campaign has ended. Create a new campaign to continue posting content."
                    : daysLeft < 7
                    ? `This campaign is ending soon with only ${daysLeft} days left.`
                    : `This campaign is active with ${daysLeft} days remaining.`
                  }
                </p>
              </div>
            </div>
          </div>
          
          {/* Action Button 
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
          */}
        </div>
      </div>
    </div>
  );
}

