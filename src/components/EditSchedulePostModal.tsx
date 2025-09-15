import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Calendar, Check, Loader2, ChevronRight, ChevronLeft, Megaphone, AlertCircle, ChevronDown, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { format, parse } from 'date-fns';
import { generateListPost, generateHookPostV3, generateLinkedInHookPostV3} from '../lib/gemini';
import { rewritePostForLinkedIn } from '../lib/geminiLinkedIn'
import { Sparkles } from 'lucide-react';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';



interface PostData {
  id: string;
  content: string;
  full_content?: string;
  social_channel: string;
  user_handle: string;
  user_display_name?: string | null;
  avatar_url?: string | null;
  content_date: string;
  content_time: string;
  calendar_name?: string;
  //schedule_status?: string;
  schedule_status?: boolean;
  theme?: string;
  topic?: string;
  target_audience?: string;
}

interface EditSchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostData;
  onUpdate: (updatedPost: PostData) => void;
  onError: (error: any) => void;
}

interface SocialChannel {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  social_channel: string;
  twitter_verified: boolean;
}

interface CalendarOption {
  calendar_name: string;
  description: string;
}

interface ContentData {
  content: string;
  theme: string;
  topic: string;
}

interface CalendarContent {
  id: string;
  theme: string;
  topic: string;
  content: string;
  call_to_action: string;
  day_of_week: string;
  day: number;
  calendar_name: string;
  description: string;
  created_at: string;
  updated_at: string;
  content_date: Date;
  target_audience?: string;
  photo_url?: string | null; 
}

export function EditSchedulePostModal({ 
  isOpen, 
  onClose, 
  post, // Add this
  onUpdate,
  onError
}: EditSchedulePostModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingCharLength, setLoadingCharLength] = useState<number | null>(null);
  const [socialChannels, setSocialChannels] = useState<SocialChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState(post.calendar_name || 'User Generated');
  const [postContent, setPostContent] = useState(post.full_content || post.content);
  const [scheduledTime, setScheduledTime] = useState(post.content_time.substring(0, 5));
  const [selectedDate, setSelectedDate] = useState(new Date(post.content_date));
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'content' | 'schedule'>('content');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null); 
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  //const [selectedScheduleStatus, setSelectedScheduleStatus] = useState<string | null>(null);
  const [selectedScheduleStatus, setSelectedScheduleStatus] = useState<boolean | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCalendarObject, setSelectedCalendarObject] = useState<{
    calendar_name: string;
    description: string;
    target_audience?: string;
    core_services?: string;
    social_goals?: string[];
    start_date?: string;
    } | null>(null);

  const [showTypingEffect, setShowTypingEffect] = useState(false);
  const [typingContentId, setTypingContentId] = useState<string | null>(null); // To track which content item is typing
  const [currentTypingText, setCurrentTypingText] = useState(''); // The text currently being typed
  
  const [campaignDateMismatch, setCampaignDateMismatch] = useState(false);
  const [campaignStartDate, setCampaignStartDate] = useState<Date | null>(null);

    const getSelectedChannelTimezone = () => {
    const activeChannel = socialChannels.find(channel => channel.id === selectedChannel);
    // Fallback to local browser timezone if no channel selected or timezone not found
    return activeChannel?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  };
  
  const [targetTimezone, setTargetTimezone] = useState(post.target_timezone || getSelectedChannelTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [max_length, setMaxLength] = useState(300);

//New UseEffect to include Premium Twitter
   useEffect(() => {
    if (selectedChannel) {
      const activeAccount = socialChannels.find(channel => channel.id === selectedChannel);
      if (activeAccount) {
        console.log('Selected Social Channel:', activeAccount.social_channel); 
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
  // This effect runs when the modal opens or when date/time values change
  if (isOpen && selectedDate) {

     const timezone = post.target_timezone || getSelectedChannelTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Validate the date first
    validateAndSetDate(selectedDate, setDateError);
    
    if (scheduledTime) {
      validateAndSetTime(selectedDate, scheduledTime, setTimeError, timezone);
    }
  }
  
  // Reset errors when modal closes
  if (!isOpen) {
    setDateError(null);
    setTimeError(null);
  }
}, [isOpen, selectedDate, scheduledTime]);

useEffect(() => {
  // Only add the listener when the date picker is open
  if (!isDatePickerOpen) return;
  
  const handleClickOutside = (event: MouseEvent) => {
    // Check if the click was outside the date picker
    if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
      setIsDatePickerOpen(false);
    }
  };
  
  // Add the event listener
  document.addEventListener('mousedown', handleClickOutside);
  
  // Clean up the event listener when component unmounts or date picker closes
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isDatePickerOpen]);  

  const validateAndSetDate = (date: Date, setDateError: React.Dispatch<React.SetStateAction<string | null>>) => {
  // Clear any previous errors
  setDateError(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if date is in the past
  if (date < today) {
    setDateError('Cannot schedule posts for dates in the past. Please select a current or future date.');
    return false;
  }
  
  // Date is valid, update state
  setSelectedDate(date);
  return true;
};

const validateAndSetTime = (
  date: Date, 
  timeString: string, 
  setTimeError: React.Dispatch<React.SetStateAction<string | null>>,
   targetTimezoneForValidation: string
) => {
  // Clear any previous errors
  setTimeError(null);
  
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
  
  // Time is valid, update state
  setScheduledTime(timeString);
  return true;
};
  
const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newDate = new Date(e.target.value);
  validateAndSetDate(newDate, setDateError);
};

const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newTime = e.target.value;
  const timezone = post.target_timezone || getSelectedChannelTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;
  validateAndSetTime(selectedDate, newTime, setTimeError, timezone);
};


  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        // Fetch connected social channels
        // Start the base query
            let query = supabase
              .from('social_channels')
              .select('*')
              .eq('email', session.user.email)
              .eq('activated', true);

            // Conditionally add the 'handle' filter
            if (post.user_handle) {
            query = query.eq('handle', post.user_handle);
          }

          // Execute the final, constructed query
          const { data: channels, error: channelsError } = await query;
        
        {/*
        const { data: channels, error: channelsError } = await supabase
          .from('social_channels')
          .select('*')
          .eq('email', session.user.email)
          .eq('activated', true)
          .eq('handle', post.user_handle);
        */}
        if (channelsError) throw channelsError;
        setSocialChannels(channels || []);

        // Fetch active calendars
        const { data: calendarData, error: calendarError } = await supabase
          .from('calendar_questions')
          .select('calendar_name, calendar_description, core_services, target_audience, social_goals, start_date, end_date')
          .eq('email', session.user.email)
          .eq('active', true)
          .eq('calendar_name', selectedCalendar)
          .gte('end_date', format(new Date(), 'yyyy-MM-dd'));
                

        if (calendarError) throw calendarError;
        setCalendars(calendarData || []);

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

  useEffect(() => {
  const fetchCalendarContent = async () => {
    if (!selectedCalendar) {
      setContentData(null);
      setPostContent('');
      setSelectedTopic(null);
      setSelectedTheme(null);
      setSelectedCalendarObject(null); // Reset the selected calendar object
      setCampaignDateMismatch(false);
      setCampaignStartDate(null);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      // First, get the calendar metadata (including target_audience)
  if (selectedCalendar !== "User Generated") {
      const { data: calendarMetadata, error: metadataError } = await supabase
        .from('calendar_questions')
        .select('calendar_name, calendar_description, target_audience, core_services, social_goals, start_date')
        .eq('calendar_name', selectedCalendar)
        .eq('email', session.user.email)
        .single();

      if (metadataError) {
        console.error('Error fetching calendar metadata:', metadataError);
      } else {
        // Store the calendar object with target_audience
        setSelectedCalendarObject(calendarMetadata);
        
        // Check if the selected date is before the campaign start date
        if (calendarMetadata.start_date) {
          const campaignStart = new Date(calendarMetadata.start_date);
          campaignStart.setHours(0, 0, 0, 0);
          
          const selectedDateCopy = new Date(selectedDate);
          selectedDateCopy.setHours(0, 0, 0, 0);
          
          if (selectedDateCopy < campaignStart) {
            setCampaignDateMismatch(true);
            setCampaignStartDate(campaignStart);
          } else {
            setCampaignDateMismatch(false);
            setCampaignStartDate(null);
          }
        }
      }
  } // end when it's not User Generated

      // Handle "User Generated" content specially
      if (selectedCalendar === "User Generated") {
        setContentData({ 
          content: 'User generated content', 
          topic: 'User generated topic', 
          theme: 'no theme specified' 
        });
        setPostContent(post.full_content || post.content);
        setSelectedTopic('User generated topic');
        setSelectedTheme('no theme specified');
        return;
      }

      // Get the data from user_post_schedule
       const { data, error } = await supabase
        .from('user_post_schedule')
        .select('id, full_content, theme, topic, schedule_status, draft_status')
        .eq('calendar_name', selectedCalendar)
        .eq('user_email', session.user.email)
        .eq('content_date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('content_time', scheduledTime)
        .eq('id',post.id)
        .single();

      if (error) {
        console.error('Error fetching content:', error);
        return;
      }

      if (data) {
        setContentData(data);
        setPostContent(data.full_content);
        setSelectedTopic(data.topic);
        setSelectedTheme(data.theme);
        setSelectedScheduleStatus(data.schedule_status);
      } else {
        setContentData(null);
        setPostContent('');
        setSelectedTopic(null);
        setSelectedTheme(null);
        setSelectedScheduleStatus(true);
      }
    } catch (err) {
      console.error('Error fetching calendar content:', err);
    }
  };

  fetchCalendarContent();
}, [selectedCalendar, selectedDate, post.content, post.full_content]);

useEffect(() => {
  if (isOpen && post.social_channel) {
    // Find the matching channel based on social_channel and handle
    const matchingChannel = socialChannels.find(
      channel => channel.social_channel === post.social_channel && 
                 channel.handle === post.user_handle
    );
    
    if (matchingChannel) {
      setSelectedChannel(matchingChannel.id);
    }
  }
}, [isOpen, post.social_channel, post.user_handle, socialChannels]);

  {/*
const canProceedToSchedule = () => {
  return selectedChannel && postContent.trim().length > 0;
};
*/}

const handleGenerateContent = async () => {
  if (!selectedCalendar) return;
  
  try {
    setIsGenerating(true);
    
    // Get the theme, topic, and target_audience from the selected calendar
    const improvedContent = await generateListPost(
      selectedTheme || '',
      selectedTopic || '',
      selectedCalendarObject?.target_audience || '', // Use target_audience from the calendar object
      postContent || '',
      'Engage with audience'
    );

    if (!improvedContent.error) {
      setPostContent(improvedContent.text);
    }
  } catch (err) {
    console.error('Error generating content:', err);
  } finally {
    setIsGenerating(false);
  }
};  


const handleHookPostV3 = async (postContent: contentData, char_length: string) => {

 
  if (!selectedCalendar) return;
  
  const uniqueKey = `${selectedCalendarObject?.id}_${char_length}`;
  
  try {
    
    //add typing effect state management here
    setTypingContentId(selectedCalendarObject?.id); // Set the ID of the content item that will be typing
    setCurrentTypingText(''); // Clear previous text for typing effect
    setShowTypingEffect(true); // Activate the typing effect
    setLoadingCharLength(uniqueKey);
    
    // Generate improved content
    const improvedContent = await generateHookPostV3(
      selectedTheme || '',
      selectedTopic || '',
      selectedCalendarObject?.target_audience || '', 
      postContent || '',
      char_length
    );

    //console.log('executing the Hook Posts Here')

    //if (improvedContent.error) throw new Error(improvedContent.error);

     if (!improvedContent.error) {
      setPostContent(improvedContent.text);
    }

    //Add new state variable sets here
     // 3. API call is complete, hide spinner and prepare for typing effect
    setLoadingCharLength(null); // Hide the spinner
    setCurrentTypingText(improvedContent.text); // Set the text to be typed
    setTypingContentId(selectedCalendarObject?.id);             // Indicate which item is typing
    setShowTypingEffect(true); 


  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here

    //moved set charlength here
    setLoadingCharLength(null); 
    setShowTypingEffect(false); // Hide typing effect on error
    setTypingContentId(null);
    setCurrentTypingText(''); // Clear typing text
  } finally {
    
  }
};  
// ------------- End Standard HooksV3Post -----------------//

const handleLinkedInHookPostV3 = async (postContent: contentData, char_length: string) => {

 
  if (!selectedCalendar) return;
  
  const uniqueKey = `${selectedCalendarObject?.id}_${char_length}`;
  
  try {
    
    //add typing effect state management here
    setTypingContentId(selectedCalendarObject?.id); // Set the ID of the content item that will be typing
    setCurrentTypingText(''); // Clear previous text for typing effect
    setShowTypingEffect(true); // Activate the typing effect
    setLoadingCharLength(uniqueKey);
    
     // Generate improved content
    {/*const improvedContent = await generateHookPostV3(
      selectedTheme || '',
      selectedTopic || '',
      selectedCalendarObject?.target_audience || '', 
      postContent || '',
      char_length
    );*/}

    // Get the theme and topic from the selected calendar content
    const improvedContent = await rewritePostForLinkedIn(postContent, char_length);

    //console.log('executing the Hook Posts Here')

    //if (improvedContent.error) throw new Error(improvedContent.error);

     if (!improvedContent.error) {
      setPostContent(improvedContent.text);
    }

    //Add new state variable sets here
     // 3. API call is complete, hide spinner and prepare for typing effect
    setLoadingCharLength(null); // Hide the spinner
    setCurrentTypingText(improvedContent.text); // Set the text to be typed
    setTypingContentId(selectedCalendarObject?.id);             // Indicate which item is typing
    setShowTypingEffect(true); 


  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here

    //moved set charlength here
    setLoadingCharLength(null); 
    setShowTypingEffect(false); // Hide typing effect on error
    setTypingContentId(null);
    setCurrentTypingText(''); // Clear typing text
  } finally {
    
  }
};      

  const handleUpdateToStartDate = () => {
  if (campaignStartDate) {
    setSelectedDate(campaignStartDate);
    setCampaignDateMismatch(false);
  }
};
  
  const handleSave = async () => {
    if (dateError || timeError) {
      return;
    }
    
    try {
      // First set loading state
      setIsSaving(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error('No authenticated user');

      if (!post.id) {
        throw new Error('Post ID is required for update');
      }

      const timeStringWithoutSeconds = scheduledTime.substring(0, 5);
      const parsedTime = parse(timeStringWithoutSeconds, 'HH:mm', new Date());
      
      if (isNaN(parsedTime.getTime())) {
        throw new Error("Invalid time format");
      }

      const formattedTimeForDatabase = format(parsedTime, 'HH:mm:ss');

      const selectedChannelObject = socialChannels.find(
        (channel) => channel.id === selectedChannel
      );

      const updatedPost = {
        id: post.id,
        full_content: postContent,
        calendar_name: selectedCalendar || "User Generated",
        content_date: format(selectedDate, 'yyyy-MM-dd'),
        content_time: formattedTimeForDatabase,
        schedule_status: true,
        schedule_status: selectedScheduleStatus ?? true,
        target_timezone: post.target_timezone || getSelectedChannelTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone,
        updated_at: new Date().toISOString(),
        
        // new updates based on information for copy Post
        social_channel: selectedChannelObject?.social_channel,
        user_display_name: selectedChannelObject?.user_display_name,
        user_handle: selectedChannelObject?.handle
      };
    
      // Update the post in Supabase
      const { error } = await supabase
        .from('user_post_schedule')
        .update(updatedPost)
        .match({ 
          id: post.id,
          user_email: session.user.email 
        });

      if (error) throw error;

      // Call success callback with updated data
      onUpdate({
        ...post,
        ...updatedPost,
        social_channel: selectedChannelObject?.social_channel || post.social_channel,
        user_handle: selectedChannelObject?.handle || post.user_handle
      });

      // Important: First set loading to false
      setIsSaving(false);
      
      // Then set success state
      setIsSuccess(true);
      
      // Set timeout to close modal
      //setTimeout(() => {
        setIsSuccess(false);
        onClose();
      //}, 3000);

    } catch (err) {
      console.error('Error updating post:', err);
      onError(err);
      setIsSaving(false);
    }
  };


const hasActiveCalendars = calendars.length > 0;  

const canProceedToSchedule = () => {
  return selectedChannel && postContent.trim().length > 0 && postContent.trim().length < max_length ;
  //return selectedChannel && postContent.trim().length > 0 && !timeError;
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
<div className="space-y-6" style={{
              scrollbarGutter: 'stable',
              scrollbarWidth: 'thin',
              scrollbarColor: '#E5E7EB transparent'
            }}
        > 
        {/* Add webkit scrollbar styles inline */}
          <style jsx>{`
    div::-webkit-scrollbar {
      width: 6px;
    }
    div::-webkit-scrollbar-track {
      background: transparent;
    }
    div::-webkit-scrollbar-thumb {
      background-color: #E5E7EB;
      border-radius: 3px;
    }
    div::-webkit-scrollbar-thumb:hover {
      background-color: #D1D5DB;
    }
  `}</style>

            {/* Social Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account
              </label>
              <div className="flex flex-wrap gap-3">
                {/* Start Old Social Channels Map
                {socialChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`flex items-center space-x-3 px-4 py-1 rounded-lg border transition-colors  ${
                      selectedChannel === channel.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                    disabled={isLoading}
                  >
                    <div className="relative">
                      <img
                        src={channel.avatar_url || `https://ui-avatars.com/api/?name=${channel.handle}`}
                        alt={channel.handle}
                        className="w-8 h-8 rounded-full"
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
                    <div className="text-left">
                      <p className="font-medium">{channel.display_name || channel.handle}</p>
                      <p className="text-xs text-gray-500">@{channel.handle}</p>
                    </div>
                  </button>
                ))}
                End Old Social Channels Map*/}

                {/*----------------------------Start New Social Channels Map-------------------------------*/}

              {socialChannels.map((channel) => (
              <TooltipHelp text={channel.display_name}> 
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`flex items-center space-x-3 p-1 rounded-full border transition-colors ${
                      selectedChannel === channel.id
                        ? 'border-blue-200 bg-blue-100 text-blue-700'
                        : 'border-gray-100 hover:border-blue-300'
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
                    {/*
                    <div className="text-left">
                      <p className="font-medium">{channel.display_name || channel.handle}</p>
                      <p className="text-xs text-gray-500">@{channel.handle}</p>
                    </div>
                    */}
                  </button>
                </TooltipHelp>
                ))}
                
                {/* ------------------------------ End New Social Channels Map ----------------------------*/}
              </div>
            </div>

            {selectedChannel && (
              <>
                {/* Calendar Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Campaign
                  </label>
              {hasActiveCalendars ? ( 
                   <div className="grid grid-cols-2 gap-3 text-sm">
      {calendars.map((calendar) => (

  
        <button
            key={calendar.calendar_name}
          
            className={`flex space-x-2 font-normal items-center p-2 rounded-lg  ${
                selectedCalendar === calendar.calendar_name
                    ? 'bg-gray-50 text-gray-500 font-normal hover:bg-gray-100'
                    : 'border-gray-200 hover:border-blue-300'
            }`}
          >
          <span className="p-1 bg-gray-100 rounded-full">
          <Megaphone className="w-4 h-4 text-gray-400" />
          </span> 
          <span>
              <h3 className="font-normal text-left text-gray-500 hover:text-gray-700">{calendar.calendar_name}</h3>
              <p className="text-sm text-gray-500 mt-1">{calendar.description}</p>
            </span>
        </button>
       
      ))}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center p-1 border border-dashed border-gray-300 rounded-lg bg-gray-50">
      <Megaphone className="w-6 h-6 text-gray-400 mb-3" />
      <p className="text-gray-900 text-sm font-normal">No Active Campaigns</p>
      <p className="text-gray-400 text-xs mt-1">
        Activate a campaign to use pre-written content
      </p>
    </div>
  )}
</div>

                {/* Campaign Date Mismatch Warning */}
                {campaignDateMismatch && campaignStartDate && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <div className="flex items-start space-x-2">
                      <Info className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Campaign Date Mismatch</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Your selected date ({format(selectedDate, 'MMM d, yyyy')}) is before the campaign start date ({format(campaignStartDate, 'MMM d, yyyy')}).
                        </p>
                        <button 
                          onClick={handleUpdateToStartDate}
                          className="mt-2 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded transition-colors"
                        >
                          Update to campaign start date
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Post Content */}
                <div>
                  <span className="space-x-2">
                    {/* Use a flex container to align the label and button horizontally */}
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="text-xs font-medium text-gray-700"> {/* Removed 'block' and 'mb-2' */}
                          Edit Post
                      </label>

                       {/*Added the button here for AI ReWrite*/}
                        {selectedCalendar && (
                          <TooltipHelp text="⚡ Rewrite with AI">
                            <button
                              onClick={handleGenerateContent}
                              disabled={isGenerating}
                    
                              className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md mb-2">  
                                {isGenerating ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                    <Sparkles className="w-3 h-3" />
                                  )}
                                <span className="text-xs">AI Rewrite</span>
                              </button>
                          </TooltipHelp>
                          )}

                   {/*Started adding more buttons for LinkedIn, Twitter and Bluesky*/}
            
                        {selectedCalendar && (
                          
                          <TooltipHelp  text="⚡Adapt for LinkedIn">
                            <button
                
                              onClick={() => handleLinkedInHookPostV3(selectedCalendarObject?.content, 1000)}
                              disabled={loadingCharLength === `${selectedCalendarObject?.id}_1000`}
             
                              className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md mb-2"
                                >    
                
                              {loadingCharLength === `${selectedCalendarObject?.id}_1000` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
              
                                    <img src={LinkedInLogo} className="w-3 h-3" />
                
                                   )}
                                    <span className="text-xs">LinkedIn</span>
                                </button>
                             </TooltipHelp>    
                            )}   

                        {selectedCalendar && (
                          
                            <TooltipHelp  text="⚡Adapt for Bluesky">
                              <button
                                  onClick={() => handleHookPostV3(selectedCalendarObject?.content, 300)}
                                  disabled={loadingCharLength === `${selectedCalendarObject?.id}_300`}
             
                                  className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md mb-2"
              >    
                
                                  {loadingCharLength === `${selectedCalendarObject?.id}_300` ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
              
                                    <img src={BlueskyLogo} className="w-3 h-3" />
                
                                     )}
                                      <span className="text-xs">Bluesky</span>
                                  </button>
                                 </TooltipHelp>    
                                )}   

                              {selectedCalendar && (
                          
                                <TooltipHelp  text="⚡Adapt for Twitter">
                                  <button
                
                                    onClick={() => handleHookPostV3(selectedCalendarObject?.content, 280)}
                                    disabled={loadingCharLength === `${selectedCalendarObject?.id}_280`}
             
                                    className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md mb-2"
              >    
                
                                    {loadingCharLength === `${selectedCalendarObject?.id}_280` ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
              
                                      <img src={XLogo} className="w-3 h-3" />
                
                                       )}
                                      <span className="text-xs">Twitter</span>
                                    </button>
                                   </TooltipHelp>    
                                  )}    
                    </div>
                </span>

                  {/* This is the end of the DIV */}
                  
              <div className="relative">
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full px-4 py-3 text-xs border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md min-h-[120px]"
                    placeholder="Write your post content..."
                  />

                {/*
                {selectedCalendar && (
                  <button
                      onClick={handleGenerateContent}
                      disabled={isGenerating}
                      //className="absolute right-2 top-2 p-1 bg-gradient-to-br from-indigo-300 via-purple-400 to-blue-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-blue-600 rounded-md shadow-md transition duration-200 flex items-center space-x-1"
                      className="absolute right-2 top-2 p-1 bg-blue-100 rounded-md items-center text-blue-500 hover:text-white hover:bg-blue-500 transition-colors rounded-md shadow-md transition duration-200 flex items-center space-x-1"
                      title="Generate post with AI"
                    >
                      {isGenerating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                    //<span className="text-xs">Generate Post</span>
                      </button>
                    )}
                  */}
                </div>

                
                  <div className="flex justify-end mt-1">

                <TooltipHelp text={tooltipMessage}>     
                    <span className={`text-xs ${
                      postContent.length > max_length  ? 'text-red-500 bg-red-50 rounded-full p-2' : 'text-green-500 bg-green-50 rounded-full p-2'
                    }`}>
                      {postContent.length}/{max_length} Characters
                    </span>      
               </TooltipHelp>

                    {/*
                    <span className={`text-xs ${
                      postContent.length > max_length ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {postContent.length}/{max_length}
                    </span>
                    */}
                  </div>
                </div>
                </>              
                )}             
            </div> 
        );

 const renderScheduleStep = () => (
<div className="space-y-6">
    {/* Schedule Time */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        Schedule Time
      </label>
        <div className="flex items-center space-x-4">
            <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-500 transition-colors" 
                type="button"
              >
              
               <Calendar className="w-4 h-4 text-gray-500" />
                 <span className="text-xs text-gray-700">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                 </span>
                 <ChevronDown className="w-3 h-3"/>
              </button>
              <input
                type="time"
                value={scheduledTime}
                onChange={handleTimeChange}
                className={`px-4 py-2 text-sm cursor-pointer hover:border-blue-500 hover:bg-blue-100 hover:font-semibold border ${
                timeError ? 'border-red-300' : 'border-blue-300'
                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
            </div>

      {/*Start Date Picker Open*/}

{isDatePickerOpen && (
  <div 
    ref={datePickerRef} 
    className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
    
    <div className="flex space-x-2 mb-3">
      <button
        onClick={() => {
          const today = new Date();
          validateAndSetDate(today, setDateError);
        }}
        className="px-3 py-1 text-xs bg-blue-50 text-blue-500 rounded hover:bg-blue-100"
      >
        Today
      </button>
      <button
        onClick={() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          validateAndSetDate(tomorrow, setDateError);
        }}
        className="px-3 py-1 text-xs bg-blue-50 text-blue-500 rounded hover:bg-blue-100"
      >
        Tomorrow
      </button>
    </div>
    
    {/* Calendar component would go here */}
    
    <input
      type="date"
      value={format(selectedDate, 'yyyy-MM-dd')}
      onChange={handleDateChange}
      className="w-full text-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    />
  </div>
)}


  {/*End Date Picker Open*/}
    
      </div>
  

          <div className={`flex items-center space-x-2 ${ 
              dateError || timeError ? 'bg-red-50 border border-red-200' : 'hidden'
              } rounded-md p-2`}>
                {(dateError || timeError) && <AlertCircle className="text-red-300 w-5 h-5"/>}
              {dateError && (
                <div className="mt-1 text-sm text-red-500">
                  {dateError}
                </div>
              )}
                {timeError && (
                  <div className="mt-1 text-sm text-red-500">
                    {timeError}
                  </div>
              )}
            </div>
  

             {/* Preview section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Post Preview</h3>
             <p className="text-sm text-gray-600">{postContent}</p>
          </div>
        </div>
       ); 

// Replace existing action buttons with:
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
          <button
              onClick={handleSave}
              disabled={!postContent.trim() || isSaving || dateError !== null || timeError !== null}
              className={`px-6 py-2 ${
              dateError !== null || timeError !== null
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
              } rounded-lg disabled:bg-gray-300 text-gray-50 flex items-center space-x-2`}
            >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Update Post</span>
            </>
          )}
        </button>
      )}
    </div>
  </div>
);

  

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-5 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '75vh' }}> 
        <div className="bg-white rounded-xl w-full max-w-2xl p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Edit Scheduled Post</h2>
            <span className="items-start text-sm text-gray-400 rounded-md">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Conditional Rendering Based on isSuccess */}
          {isSuccess ? (
            <div className="flex items-center space-x-3 p-4">
              <div className="bg-green-100 rounded-full p-2">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Post Updated Successfully</p>
                <p className="text-sm text-gray-500">
                  Your post will be published on {format(selectedDate, 'MMM d')} at {scheduledTime}
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
    </div>
  );
}