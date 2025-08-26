import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Calendar, Check, Loader2, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { format, parse, parseISO } from 'date-fns';
import { generateListPost } from '../lib/gemini';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';

interface AddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    id: string;
    theme: string;
    topic: string;
    content: string;
    calendar_name: string;
    target_audience?: string;
    content_date: Date;
  };
}

interface SocialChannel {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  social_channel: string;
  twitter_verified: boolean;
}

interface ScheduleSlot {
  day_of_week: string;
  schedule_time: string;
  active_time: boolean;
}

export function AddToCalendarModal({ isOpen, onClose, content }: AddToCalendarModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [socialChannels, setSocialChannels] = useState<SocialChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<ScheduleSlot[]>([]);
  //const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(parseISO(content.content_date as string));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [postContent, setPostContent] = useState(content.content);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'content' | 'schedule'>('content');
  const [isSuccess, setIsSuccess] = useState(false);
  const [timeSelectionMode, setTimeSelectionMode] = useState<'slots' | 'custom'>('slots');
  const [customTime, setCustomTime] = useState<string>('09:00'); // Default to 9:00 AM
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [max_length, setMaxLength] = useState(300);
  const [isImproving, setIsImproving] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const targetTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;


const validateAndSetDate = (selectedDate: Date, setDateError: 
  React.Dispatch<React.SetStateAction<string | null>>) => {
  // Clear any previous errors
  setDateError(null);

  //Always update the date state regardless of the validation error for UX purposes
  setSelectedDate(selectedDate);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if date is in the past
  if (selectedDate < today) {
    setDateError('Cannot schedule posts for dates in the past. Please select a current or future date.');
    return false;
  }
  
  // Date is valid, update state
  setSelectedDate(selectedDate);
  return true;
};  

 //New UseEffect to include Premium Twitter
   useEffect(() => {
    if (selectedChannel) {
      const activeAccount = socialChannels.find(channel => channel.id === selectedChannel);
      if (activeAccount) {
        //console.log('Selected Social Channel:', activeAccount.social_channel); 
        switch (activeAccount.social_channel) {
          case 'Bluesky':
            setMaxLength(300);
            break;
          case 'Twitter':
                // Use activeAccount.twitter_verified directly here
                if (activeAccount.twitter_verified) {
                    setMaxLength(25000); // Premium Twitter limit
                } else {
                    setMaxLength(280); // Free Twitter limit
                }
            break;
          case 'LinkedIn':
            setMaxLength(3000);
            break;
          default:
            setMaxLength(300); // Default
        }
      }
    }
  }, [selectedChannel, socialChannels]);    

useEffect(() => {
    setPostContent(editedContent.content);
}, [editedContent.content]);

useEffect(() => {
    if (selectedChannel) {
      const activeAccount = socialChannels.find(channel => channel.id === selectedChannel);
      if (activeAccount) {
        //console.log('Selected Social Channel:', activeAccount.social_channel); 
        switch (activeAccount.social_channel) {
          case 'Bluesky':
            setMaxLength(300);
            break;
          case 'Twitter':
            setMaxLength(280);
            break;
          case 'LinkedIn':
            setMaxLength(3000);
            break;
          default:
            setMaxLength(300); // Default
        }
      }
    }
  }, [selectedChannel, socialChannels]);    
  
const validateAndSetTime = (selectedDate: Date, timeString: string, setTimeError: React.Dispatch<React.SetStateAction<string | null>>) => {
  // Clear any previous errors
  setTimeError(null);
  
  // Parse the time string (format: HH:mm)
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create a new date object with the selected date and time
  const scheduledDateTime = new Date(selectedDate);
  scheduledDateTime.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  
  // Check if the date is today and the time has already passed
  if (
    selectedDate.getDate() === now.getDate() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear() &&
    scheduledDateTime < now
  ) {
    // Time has passed for today, set error message
    setTimeError(`Cannot schedule for ${timeString} as this time has already passed today.`);
    return false;
  }
  
   // Time is valid, update state
  if (timeSelectionMode === 'slots') {
    setSelectedTime(timeString);
  } else {
    setCustomTime(timeString);
  }
  return true;
};  

// Validate and set Custom time
const validateCustomTime = (date: Date, timeString: string): boolean => {
  // Clear any previous errors
  setTimeError(null);
  
  if (!timeString) {
    setTimeError("Please select a time");
    return false;
  }
  
  // Parse the time string (format: HH:mm)
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create a new date object with the selected date and time
  const scheduledDateTime = new Date(date);
  scheduledDateTime.setHours(hours, minutes, 0, 0);
  
  const now = new Date();
  
  // Check if the date is today and the time has already passed
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear() &&
    scheduledDateTime < now
  ) {
    // Time has passed for today, set error message
    setTimeError(`Cannot schedule for ${timeString} as this time has already passed today.`);
    return false;
  }
  
  return true;
};  



useEffect(() => {
  if (selectedDate) {
    if (timeSelectionMode === 'custom' && customTime) {
      validateCustomTime(selectedDate, customTime);
    } else if (timeSelectionMode === 'slots' && selectedTime) {
      validateAndSetTime(selectedDate, selectedTime, setTimeError);
    }
  }
}, [timeSelectionMode, selectedDate]);  
  
const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newDate = new Date(e.target.value);
  
  // First validate the date itself
  const isDateValid = validateAndSetDate(newDate, setDateError);
  
  if (isDateValid) {
    // Then validate the appropriate time input based on the current mode
    if (timeSelectionMode === 'custom' && customTime) {
      validateCustomTime(newDate, customTime);
    } else if (timeSelectionMode === 'slots' && selectedTime) {
      validateAndSetTime(newDate, selectedTime, setTimeError);
    }
  }
};  


const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newTime = e.target.value;
  validateAndSetTime(selectedDate, newTime, setTimeError);
};  

const handleTimeSelectionModeChange = (mode: 'slots' | 'custom') => {
  // Reset the selected time when changing modes
  //setSelectedTime('');
  setTimeError(null);
  setTimeSelectionMode(mode);

// Validate the appropriate time input based on the new mode
  if (selectedDate) {
    if (mode === 'custom' && customTime) {
      validateCustomTime(selectedDate, customTime);
    } else if (mode === 'slots' && selectedTime) {
      validateAndSetTime(selectedDate, selectedTime, setTimeError);
    }
  } 
  
};  

// Update the handleCustomTimeChange function
const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newTime = e.target.value;
  setCustomTime(newTime);
  
  if (selectedDate) {
    validateCustomTime(selectedDate, newTime);
  }
};  
  
useEffect(() => {
  if (!isDatePickerOpen) return;
  
  const handleClickOutside = (event: MouseEvent) => {
    if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
      setIsDatePickerOpen(false);
    }
  };
  
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isDatePickerOpen]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        // Fetch connected social channels
        const { data: channels, error: channelsError } = await supabase
          .from('social_channels')
          .select('*')
          .eq('email', session.user.email)
          .eq('activated', true);

        if (channelsError) throw channelsError;
        setSocialChannels(channels || []);

        // Fetch available schedule slots
        const { data: slots, error: slotsError } = await supabase
          .from('user_schedule')
          .select('*')
          .eq('email', session.user.email)
          .eq('active_time', true);

        if (slotsError) throw slotsError;
        setAvailableSlots(slots || []);

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  // CORRECT: Get the new content directly from the textarea's event object
  const newContent = e.target.value;

  // Update the editedContent state
  setEditedContent(prevEditedContent => ({
    ...prevEditedContent, 
    content: newContent 
  }));
};

  const handleImproveAIContent = async () => {
    setIsImproving(true);
    try {
      const improvedContent = await generateListPost(
        editedContent.theme,
        editedContent.topic,
        editedContent.target_audience || '',
        editedContent.content,
        editedContent.call_to_action
      );

      if (!improvedContent.error) {
        setEditedContent({
          ...editedContent,
          content: improvedContent.text,
        });
      }
    } catch (err) {
      console.error('Error improving content:', err);
    } finally {
      setIsImproving(false);
    }
  };

 const canProceedToSchedule = () => {
  return selectedChannel && postContent.trim().length > 0 && postContent.trim().length < max_length ;
  //return selectedChannel && postContent.trim().length > 0 && !timeError;
}; 

  const handleSave = async () => {
      // Don't proceed if there are validation errors
  if (dateError || timeError) {
    return;
  }
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error('No authenticated user');

      const selectedChannelObject = socialChannels.find(
        (channel) => channel.id === selectedChannel
      );

      // Use either the selected slot time or custom time based on mode
      const timeToUse = timeSelectionMode === 'slots' ? selectedTime : customTime;
      
      //const timeStringWithoutSeconds = selectedTime.substring(0, 5);
      const timeStringWithoutSeconds = timeToUse.substring(0, 5);
      const parsedTime = parse(timeStringWithoutSeconds, 'HH:mm', new Date());
      const formattedTimeForDatabase = format(parsedTime, 'HH:mm:ss');

      const newPost = {
        user_email: session.user.email,
        user_id: session.user.id,
        social_channel: selectedChannelObject?.social_channel,
        user_handle: selectedChannelObject?.handle,
        user_display_name: selectedChannelObject?.display_name,
        calendar_name: content.calendar_name,
        full_content: postContent,
        theme: content.theme,
        topic: content.topic,
        target_audience: content.target_audience,
        photo_url: content.photo_url,
        content_date: format(selectedDate, 'yyyy-MM-dd'),
        content_time: formattedTimeForDatabase,
        target_timezone: targetTimezone,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_post_schedule')
        .insert(newPost);

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 3000);

    } catch (err) {
      console.error('Error scheduling post:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeChannel = socialChannels.find(channel => channel.id === selectedChannel);  

  const tooltipMessage =
  activeChannel?.social_channel === 'Bluesky'
    ? "⚡ 300 Chars for Bluesky"
    : (activeChannel?.social_channel === 'Twitter' || activeChannel?.social_channel === 'X')
      ? activeChannel?.twitter_verified === true  // Check the 'twitter_verified' attribute
        ? "⚡ 25,000 Chars for Premium Twitter (X)" // For verified/premium accounts
        : "⚡ 280 Chars for Free Twitter (X)" // For non-verified/free accounts
      : activeChannel?.social_channel === 'LinkedIn'
        ? "⚡ Up to 3000 Chars for LinkedIn"
        : "⚡ Character limit varies by platform";


// Function to determine the tooltip message for the "Next" button
const getNextButtonTooltip = () => {
  if (!selectedChannel) {
    return "Please choose a social channel to continue.";
  }
  if (postContent.trim().length === 0) {
    return "Select a campaign to generate a Post, Or Write a post to continue.";
  }
  // Check if content length is greater than or equal to max_length, which disables the button
  if (postContent.trim().length >= max_length) {
    return "You've exceeded the maximum character limit for this social account.";
  }
  // If none of the above conditions are met, the button should be enabled, so no tooltip needed for disabled state.
  return "";
};  

  const renderContentStep = () => (
    <div className="space-y-6">
      <div>
        <label className="text-left block text-sm font-medium text-gray-700 mb-2">
          Choose Account
        </label>
  {/*---------------- Start Displaying Avatar and Handle ----------------------------*/}              
              <div className="flex flex-wrap gap-3">
                {socialChannels.map((channel) => (

            <TooltipHelp text={channel.display_name}>
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`flex items-center space-x-3 p-1 rounded-full border transition-colors ${
                      selectedChannel === channel.id
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-100 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    
                    <div className="relative">
                      <img
                        src={channel.avatar_url || `https://ui-avatars.com/api/?name=${channel.handle}`}
                        alt={channel.handle}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                        <img
                          src={channel.social_channel === 'Bluesky' 
                                ? BlueskyLogo  
                                : channel.social_channel === 'LinkedIn'
                                ? LinkedInLogo
                                : XLogo  
                              }
                          alt={channel.social_channel}
                          className="w-3 h-3"
                        />
                      </div>
                    </div>
                  </button>
              </TooltipHelp>
                ))}
              </div>
            </div>

          {/*---------------- End Displaying Avatar and Handle ----------------------------*/}

      <div>

    
        <div className="flex items-center justify-between mb-2">
              <label className="text-left text-sm font-medium text-gray-700">
                Post Content
              </label>

            <TooltipHelp text="⚡ Rewrite with AI">
            <button
                onClick={handleImproveAIContent}
                disabled={isImproving}
               className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md"
              >
                             
              
                <span className="flex items-center space-x-1">
                  
                  <span>
                    {isImproving ? (
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-blue-500"/>
                    )}
                  </span>
                  
                  <span className="text-xs text-blue-500">make it better</span>
                </span>
              </button>
          </TooltipHelp>
        </div>
        
        <textarea
          value={postContent}
          //onChange={(e) => setPostContent(e.target.value)}
          //value={handleContentChange}
          value={editedContent.content}
          onChange={handleContentChange}
          rows={13}
          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px]"
        />
   
        <div className="flex justify-end mt-1">
          <TooltipHelp text={tooltipMessage}>     
                    <span className={`text-xs ${
                      postContent.length > max_length  ? 'text-red-500 bg-red-50 rounded-full p-2' : 'text-green-500 bg-green-50 rounded-full p-2'
                    }`}>
                      {postContent.length}/{max_length} Characters
                    </span>      
          </TooltipHelp>
        </div>
      </div>      
    </div>
  );

const renderScheduleStep = () => (
  <div className="space-y-6">
    {/* Date Selection */}
    <div className="mb-4">
      <label className="block text-left text-sm font-medium text-gray-700 mb-2">
        Select Date
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
          //className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg"
          className={`flex w-full items-center justify-between px-2 text-left py-2 text-sm cursor-pointer hover:border-blue-500 hover:bg-blue-50 
          hover:font-semibold border ${ dateError ? 'border-red-300' : 'border-blue-300'} 
          rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
        >
          <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
          {/*<span>{format(scheduledDateTime, 'EEEE, MMMM d, yyyy')}</span>*/}
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
        
        {isDatePickerOpen && (
          <div 
            ref={datePickerRef}
            className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
          >
            <div className="flex space-x-2 mb-3">
              <button
                onClick={() => {
                  //const today = setSelectedDate(new Date());
                  const today = new Date();
                  validateAndSetDate(today, setDateError);
                  setSelectedTime('');
                  setTimeError(null);
                  setIsDatePickerOpen(false);
                }}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-500 rounded hover:bg-blue-100"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow);
                  validateAndSetDate(tomorrow, setDateError);
                  setSelectedTime('');
                  setTimeError(null);
                  setIsDatePickerOpen(false);
                }}
                className="px-3 py-1 text-xs bg-blue-50 text-blue-500 rounded hover:bg-blue-100"
              >
                Tomorrow
              </button>
            </div>
            
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
    
    {/* Time Selection */}
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">Schedule Time</label>
        <div className="flex space-x-2">
          <button 
            //onClick={() => setTimeSelectionMode('slots')}
            onClick={() => handleTimeSelectionModeChange('slots')}
            className={`px-2 py-1 text-xs rounded ${timeSelectionMode === 'slots' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            Available Slots
          </button>
          <button 
            //onClick={() => setTimeSelectionMode('custom')}
            onClick={() => handleTimeSelectionModeChange('custom')}
            className={`px-2 py-1 text-xs rounded ${timeSelectionMode === 'custom' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
          >
            Custom Time
          </button>
        </div>
      </div>
      
      {timeSelectionMode === 'slots' ? (
        // Slot selection UI
        <select
          value={selectedTime}
          onChange={handleTimeChange}
          
          className={`px-2 items-center justify-between w-full py-2 text-sm cursor-pointer hover:border-blue-500 hover:bg-blue-50 
          hover:font-semibold border ${ timeError ? 'border-red-300' : 'border-blue-300'} 
          rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
        >
          <option value="">Select a time slot</option>
          {availableSlots
            .filter(slot => slot.day_of_week.toLowerCase() === format(selectedDate, 'EEEE').toLowerCase())
            .map(slot => (
              <option key={slot.schedule_time} value={slot.schedule_time}>
                {format(parse(slot.schedule_time, 'HH:mm:ss', new Date()), 'h:mm a')}
              </option>
            ))}
        </select>
      ) : (
        // Custom time input
        <input
          type="time"
          value={customTime}
          //onChange={(e) => setCustomTime(e.target.value)}
          onChange={handleTimeChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
      )}
    </div>

    {/* End Date Picker Section */}

    <div className={`flex items-center space-x-2 ${
          dateError || timeError ? 'bg-red-50 border border-red-200 p-3 rounded-md mt-2' : 'hidden'
          }`}>
            {(dateError || timeError) && (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
          <div>
              {dateError && (
                  <p className="text-sm text-red-500">{dateError}</p>
              )}
              {timeError && (
                  <p className="text-sm text-red-500">{timeError}</p>
              )}
          </div>
      </div>

    {/* Preview section */}
    <div className="bg-gray-50 p-4 text-left rounded-lg">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Post Preview</h3>
      <p className="text-sm text-gray-600">{postContent}</p>
    </div>
  </div>
);


  const renderActionButtons = () => (
    <div className="flex justify-between space-x-3 pt-4">
      <div>
        {currentStep === 'schedule' && (
          <button
            onClick={() => setCurrentStep('content')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        
        {currentStep === 'content' ? (
        <TooltipExtended text={getNextButtonTooltip()} show={!canProceedToSchedule()}>
          <button
            onClick={() => setCurrentStep('schedule')}
            disabled={!canProceedToSchedule()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center space-x-2"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
      </TooltipExtended>
        ) : (

      <TooltipExtended 
        
        text="Please select a time slot to schedule your post"
        show= {
                      (timeSelectionMode === 'slots' ? !selectedTime : !customTime) || 
                        isSaving || 
                        dateError !== null || 
                        timeError !== null
                      }
        >
          <button
            onClick={handleSave}
            disabled={
                      (timeSelectionMode === 'slots' ? !selectedTime : !customTime) || 
                        isSaving || 
                        dateError !== null || 
                        timeError !== null
                      }
            className={`px-6 py-2 ${
                        dateError !== null || timeError !== null
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                        } rounded-lg disabled:bg-gray-300 flex items-center space-x-2`}
                      >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Schedule Post</span>
              </>
            )}
          </button>
      </TooltipExtended>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-5 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Schedule Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isSuccess ? (
          <div className="flex items-center space-x-3 p-4">
            <div className="bg-green-100 rounded-full p-2">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-left font-medium text-gray-900">Post Scheduled Successfully</p>
              <p className="text-sm text-gray-500">
                Your post will be published on {format(selectedDate, 'MMM d')} at {selectedTime || customTime}
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {currentStep === 'content' ? renderContentStep() : renderScheduleStep()}
            {renderActionButtons()}
          </>
        )}
      </div>
    </div>
  );
}
