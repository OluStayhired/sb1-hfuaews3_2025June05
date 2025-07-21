import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Calendar, CalendarPlus, Check, Loader2, ChevronRight, ChevronLeft, Megaphone, AlertCircle, Sparkles, Info, ArrowRight, UserPlus, Edit2, ImagePlus, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { generateListPost } from '../lib/gemini';
import { format, parse } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { useNavigate } from 'react-router-dom';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';
import { uploadImageGetUrl } from '../utils/UploadImageGetUrl';
import { deletePostImage } from '../utils/DeletePostImage';

interface SchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  onSchedule: (newPost: PostData) => void;
  onScheduleError: (failedPost: PostData) => void;
}

interface SocialChannel {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  social_channel: string;
  timezone: string;
}

interface CalendarOption {
  calendar_name: string;
  description: string;
  start_date?: string;
}

interface ContentData {
  content: string;
  theme: string;
  topic: string;
}

export function SchedulePostModal({ isOpen, onClose, selectedDate, selectedTime, onSchedule, onScheduleError }: SchedulePostModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [socialChannels, setSocialChannels] = useState<SocialChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [postContent, setPostContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState(selectedTime);
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'content' | 'schedule'>('content');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null); 
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaignDateMismatch, setCampaignDateMismatch] = useState(false);
  const [campaignStartDate, setCampaignStartDate] = useState<Date | null>(null);
  const [max_length, setMaxLength] = useState(300);
   const navigate = useNavigate();
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
   // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  // State to track which post is currently uploading an image
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);


  const [selectedCalendarObject, setSelectedCalendarObject] = useState<{
  calendar_name: string;
  description: string;
  target_audience?: string;
  core_services?: string;
  social_goals?: string[];
  start_date?: string;
} | null>(null);

const getSelectedChannelTimezone = () => {
    const activeChannel = socialChannels.find(channel => channel.id === selectedChannel);
    // Fallback to local browser timezone if no channel selected or timezone not found
    return activeChannel?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  };
  
   const handleCreateCampaign = () => {
    navigate('/dashboard/campaign');
    onClose();
  };
  
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

// --- UPDATED validateAndSetTime FUNCTION ---
const validateAndSetTime = (
  date: Date, // This is the date from the calendar (likely local date, e.g., May 24th, 2025 midnight)
  timeString: string, // e.g., "16:30"
  setTimeError: React.Dispatch<React.SetStateAction<string | null>>,
  setScheduledTime: React.Dispatch<React.SetStateAction<string>>,
  targetTimezone: string // The timezone of the selected social channel
) => {
  setTimeError(null);

  // 1. Get the current UTC moment (global, absolute time)
  const nowUtc = new Date();

  // 2. Construct the scheduled date-time string in the YYYY-MM-DDTHH:mm:ss format
  const datePart = format(date, 'yyyy-MM-dd'); 
  const combinedDateTimeString = `${datePart}T${timeString}:00`; 

  let scheduledUtc: Date;
  try {
    // 3. Interpret the combined string *as if it were in the targetTimezone*
    scheduledUtc = zonedTimeToUtc(combinedDateTimeString, targetTimezone);
  } catch (e) {
    console.error("Failed to parse or convert scheduled time to UTC with timezone:", e);
    setTimeError("An error occurred with time parsing. Please try again.");
    return false;
  }

  // 4. Perform the comparison using the UTC Date objects.
  if (scheduledUtc < nowUtc) {
    // 5. If time has passed, formulate an error message.
    const scheduledTimeInTarget = utcToZonedTime(scheduledUtc, targetTimezone);
    const formattedTimeInTarget = format(scheduledTimeInTarget, 'HH:mm');
    const formattedDateInTarget = format(scheduledTimeInTarget, 'MMM d, yyyy'); 

    // Extracting a user-friendly part of the timezone name (e.g., 'New York', 'London')
    const timezoneDisplayName = targetTimezone.split('/').pop()?.replace(/_/g, ' ') || targetTimezone;

    setTimeError(
      `Cannot schedule for ${formattedTimeInTarget} on ${formattedDateInTarget} ` +
      `(in ${timezoneDisplayName}) as this time has already passed.`
    );
    return false;
  }

  // Time is valid, update the state
  setScheduledTime(timeString);
  return true;
};  
  
//const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//  const newTime = e.target.value;
//  validateAndSetTime(selectedDate, newTime, setTimeError, setScheduledTime);
//};

// --- UPDATED handleTimeChange CALL ---
const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newTime = e.target.value;
  const targetTimezone = getSelectedChannelTimezone(); // Get the timezone dynamically
  validateAndSetTime(selectedDate, newTime, setTimeError, setScheduledTime, targetTimezone);
};  

// Add this useEffect to validate the initial time when the modal opens


useEffect(() => {
  if (isOpen && selectedDate && selectedTime) {
    if (selectedChannel) {
      const targetTimezone = getSelectedChannelTimezone();
      validateAndSetTime(selectedDate, selectedTime, setTimeError, setScheduledTime, targetTimezone);
    } else {
      setTimeError(null);
    }
  }  
}, [isOpen, selectedDate, selectedTime, selectedChannel, socialChannels]);

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

        // Fetch active calendars
        const { data: calendarData, error: calendarError } = await supabase
          .from('calendar_questions')
          .select('calendar_name, calendar_description, core_services, target_audience, social_goals, start_date, end_date')
          .eq('email', session.user.email)
          .eq('active', true)
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
      setSelectedTopic(null); // Reset topic
      setSelectedTheme(null); // Reset theme
      setSelectedCalendarObject(null);
      setCampaignDateMismatch(false);
      setCampaignStartDate(null);
      return;
    }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

         // First, get the calendar metadata (including target_audience)
      const { data: calendarMetadata, error: metadataError } = await supabase
        .from('calendar_questions')
        .select('calendar_name, calendar_description, target_audience, core_services, social_goals, start_date')
        .eq('calendar_name', selectedCalendar)
        .eq('email', session.user.email)
        .gte('end_date', format(new Date(), 'yyyy-MM-dd'))
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

        const { data, error } = await supabase
          .from('content_calendar')
          .select('content, theme, topic')
          .eq('calendar_name', selectedCalendar)
          .eq('email', session.user.email)
          .eq('content_date', format(selectedDate, 'yyyy-MM-dd'))
          .single();

        if (error) {
          console.error('Error fetching content:', error);
          return;
        }

       if (data) {
        setContentData(data);
        setPostContent(data.content);
        setSelectedTopic(data.topic); // Set topic state
        setSelectedTheme(data.theme); // Set theme state
      } else {
        setContentData(null);
        setPostContent('');
        setSelectedTopic(null);
        setSelectedTheme(null);
      }
      } catch (err) {
        console.error('Error fetching calendar content:', err);
      }
    };

    fetchCalendarContent();
  }, [selectedCalendar, selectedDate]);

const canProceedToSchedule = () => {
  return selectedChannel && postContent.trim().length > 0;
  //return selectedChannel && postContent.trim().length > 0 && !timeError;
};

const SuccessNotification = () => (
  <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-green-100 p-4 flex items-center space-x-3 animate-fade-in z-[9999]">
    <div className="bg-green-100 rounded-full p-2">
      <Check className="w-5 h-5 text-green-500" />
    </div>
    <div>
      <p className="font-medium text-gray-900">Post Scheduled Successfully</p>
      <p className="text-sm text-gray-500">
        Your post will be published on {format(selectedDate, 'MMM d')} at {scheduledTime}
      </p>
    </div>
  </div>
);

// Add this function to handle content generation
const handleGenerateContent = async () => {
  if (!selectedCalendar) return;
  
  try {
    setIsGenerating(true);
    
    // Get the theme and topic from the selected calendar content
    const improvedContent = await generateListPost(
      selectedTheme || '',
      selectedTopic || '',
      selectedCalendarObject?.target_audience || '',
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
  

const handleUpdateToStartDate = () => {
  if (campaignStartDate) {
    setSelectedDate(campaignStartDate);
    setCampaignDateMismatch(false);
  }
};

//----------------- Start Image Functions ----------------------------//


// Function to trigger the hidden file input
const handleAddImage = () => {
   console.log('handleAddImage called. fileInputRef.current:', fileInputRef.current);
  if (fileInputRef.current) {
    fileInputRef.current.click();
  }
};

// Function to handle file selection and upload
const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Assuming you have a way to get the current user's ID
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    console.error('User not authenticated. Cannot upload image.');
    // Optionally show an error message to the user
    return;
  }

  setUploadingImageId('uploading'); // Set a generic ID for loading state
  try {
    const imageUrl = await uploadImageGetUrl(file, userId);
    setUploadedPhotoUrl(imageUrl);
    console.log('Image uploaded successfully:', imageUrl);
  } catch (error) {
    console.error('Error uploading image:', error);
    // Optionally show an error message to the user
    setUploadedPhotoUrl(null);
  } finally {
    setUploadingImageId(null);
    // Clear the file input value to allow re-uploading the same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};

// Function to remove the uploaded image
const handleRemoveImage = async () => {
  if (!uploadedPhotoUrl) return;

  setDeletingImageId('deleting'); // Set a generic ID for loading state
  try {
    // Extract the file path from the URL
    // Assuming URL format: https://<project_id>.supabase.co/storage/v1/object/public/user-post-images/<user_id>/<file_name>
    const urlParts = uploadedPhotoUrl.split('user-post-images/');
    const filePath = urlParts.length > 1 ? urlParts[1] : '';

    if (filePath) {
      await deletePostImage(filePath);
      setUploadedPhotoUrl(null);
      console.log('Image removed successfully.');
    } else {
      console.error('Could not determine file path from URL:', uploadedPhotoUrl);
    }
  } catch (error) {
    console.error('Error removing image:', error);
    // Optionally show an error message to the user
  } finally {
    setDeletingImageId(null);
  }
};  

//------------------ End Image Functions ----------------------------//  
  
  const handleSave = async () => {
    // Don't proceed if there's a time error
  if (timeError) {
    return;
  }
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error('No authenticated user');


    const timeStringWithoutSeconds = scheduledTime.substring(0, 5);
      
    // Parse the scheduledTime string into a Date object
    const parsedTime = parse(timeStringWithoutSeconds, 'HH:mm', new Date());
    
          // Crucially, check if parsing was successful.
      if (isNaN(parsedTime.getTime())) {
        console.error("Invalid time entered by user:", timeStringWithoutSeconds);
        
        // *** TODO: Show a user-friendly error message in the UI ***
        setIsSaving(false); // Stop saving process
        return; // Exit the function
      }  


      const targetTimezone = getSelectedChannelTimezone(); 
      
      const formattedTimeForDatabase = format(parsedTime, 'HH:mm:ss'); 
      // <-- Format to 'HH:mm:ss' for the database

      console.log('Scheduled Time State:', scheduledTime);
      console.log('Parsed Time (Date object):', parsedTime);
      console.log('Formatted Time for Database (HH:mm:ss):', formattedTimeForDatabase);



    // Format the Date object to 'HH:mm'
    console.log('ParsedTime', parsedTime);
    const formattedTime = format(parsedTime, 'HH:mm');
    console.log('formattedTime', formattedTime);

    
    

    const selectedChannelObject = socialChannels.find(
      (channel) => channel.id === selectedChannel
    );  

    const selectedCalendarObject = calendars.find(
      (calendar) => calendar.calendar_name === selectedCalendar
    );    

     //const selectedSocialObject = socialChannels.find(
      //(social) => social.social_channel === selectedSocial
    //);    

   //const activeSocialChannel = selectedSocialObject?.social_channel
      
  //console.log('activeSocialCHannel', activeSocialChannel)


      

    // Create the new post object
    const newPost = {
      user_email: session.user.email,
      user_id: session.user.id,
      social_channel: selectedChannelObject?.social_channel,
      user_handle: selectedChannelObject?.handle,
      user_display_name: selectedChannelObject?.display_name,
      calendar_name: selectedCalendar  || "User Generated",
      full_content: postContent,
      services: selectedCalendarObject?.core_services  || null,
      target_audience: selectedCalendarObject?.target_audience  || null,
      goals: selectedCalendarObject?.social_goals  || null,
      topic: selectedTopic  || null,
      theme: selectedTheme  || null,
      content_date: format(selectedDate, 'yyyy-MM-dd'),
      sent_post: false,
      content_time: formattedTimeForDatabase,
      target_timezone: targetTimezone,
      photo_url: uploadedPhotoUrl,
      created_at: new Date().toISOString()
    };

    // Call the optimistic update callback immediately
    onSchedule(newPost);

// Then make the actual API call
    const { error } = await supabase
      .from('user_post_schedule')
      .insert(newPost);      

      if (error) {
      console.error('Supabase Insert Error:');
      console.log('Error Details:', error); // Log the entire error object
      // Optionally, you can log specific properties for easier readability:
      // console.log('Error Message:', error.message);
      // console.log('Error Details:', error.details);
      // console.log('Error Hint:', error.hint);
      throw error; // Still throw the error to be caught by the catch block
    }
      setIsSaving(false);
      setIsSuccess(true);
      setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 3000);
      
    } catch (err) {
      console.error('Error saving scheduled post:', err);
      // Revert optimistic update on error
      onScheduleError(newPost);
    } finally {
      setIsSaving(false);
    }
  };

const hasActiveCalendars = calendars.length > 0;  

  {/*
const tooltipMessage = activeAccount // First, check if activeAccount exists
  ? (channel.social_channel === 'Bluesky'
    ? "⚡ 300 Chars for Bluesky"
    : channel.social_channel === 'Twitter' || channel.social_channel === 'X' // Handle both 'Twitter' and 'X'
      ? "⚡ 280 Chars for Free Twitter (X)"
      : channel.social_channel === 'LinkedIn'
        ? "⚡ Up to 3000 Chars for LinkedIn"
        : "⚡ Character limit varies by platform (Unknown Channel)" // Default for known activeAccount but unrecognized channel
    )
  : "Select a social account to see details.";  
*/}
  
const tooltipMessage =
  socialChannels.social_channel === 'Bluesky'
    ? "⚡ 300 Chars for Bluesky"
    : socialChannels.social_channel === 'Twitter' || socialChannels.social_channel === 'X'
      ? "⚡ 280 Chars for Free Twitter (X)"
      : socialChannels.social_channel === 'LinkedIn'
        ? "⚡ Up to 3000 Chars for LinkedIn"
        : "⚡ Character limit varies by platform"; 
  // This becomes the fallback for undefined activeAccount  
  
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
              <div className="flex space-x-2 items-center">
                    <span className="bg-blue-50 rounded-full p-1 mb-2">
                      <UserPlus className="w-4 h-4 text-blue-500"/>
                    </span>  
                <label className="block text-sm font-medium text-gray-700 mb-2">               
                Choose Account
              </label>
                </div>
              <div className="flex flex-wrap gap-3">
                {socialChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg border transition-colors ${
                      selectedChannel === channel.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
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
              </div>
            </div>

            {selectedChannel && (
              <>
                {/* Calendar Selection */}
                <div>
                  <div className="flex space-x-2 items-center">
                    <span className="bg-blue-50 rounded-full p-1 mb-2">
                      <Megaphone className="w-4 h-4 text-blue-500"/>
                    </span>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                          Select Campaign (Optional)
                      </label>
                  </div>   
              {hasActiveCalendars ? ( 
                   <div className="grid grid-cols-2 gap-3 text-sm">
      {calendars.map((calendar) => (
        <button
            key={calendar.calendar_name}
                  onClick={() => {
                  const newSelectedCalendar = selectedCalendar === calendar.calendar_name ? null : calendar.calendar_name;
                setSelectedCalendar(newSelectedCalendar);
    
                // If a calendar is selected, set the calendar object
                if (newSelectedCalendar) {
                setSelectedCalendarObject(calendar);
                  } else {
                setSelectedCalendarObject(null);
                }
                }}
                className={`flex space-x-2 items-center p-2 rounded-lg border transition-colors ${
                selectedCalendar === calendar.calendar_name
                    ? 'border-blue-500 bg-blue-50'
                     : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
          <span className="p-1 bg-gray-100 rounded-full">
              <Calendar className="w-2.5 h-2.5 text-gray-300" />
          </span> 
          <span>
              <h3 className="font-medium text-gray-900 hover:text-blue-500">{calendar.calendar_name}</h3>
              <p className="text-sm text-gray-500 mt-1">{calendar.description}</p>
            </span>
        </button>
      ))}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center p-1 border border-dashed border-gray-300 rounded-lg bg-gray-50">
      <Megaphone className="w-6 h-6 text-blue-500 mb-3" />
      <p className="text-gray-700 text-sm font-normal">No Active Campaigns</p>
      {/*
      <p className="text-gray-400 text-xs mt-1">
        Activate a campaign for content ideas & AI assistance 💡
      </p>
      */}

    <p className="mt-4">
  <button
    onClick={handleCreateCampaign}
    className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
  >
    Create 2 Weeks of Content in minutes 🚀
    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
  </button>
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
                  <div className="flex space-x-2 items-center">
                    <span className="bg-blue-50 rounded-full p-1 mb-2"> <Edit2 className="w-4 h-4 text-blue-500"/></span>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Write Post
                  </label>
                  </div>
                
                  <div className="relative">
                    
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full px-4 py-3 text-xs border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[120px]"
                    placeholder="Write your own post ..."
                  />


{/* Generate Post Button - Only shown when a calendar is selected */}
    {selectedCalendar && (
      <button
        onClick={handleGenerateContent}
        disabled={isGenerating}
        className="absolute right-2 top-2 p-1 bg-gradient-to-br from-indigo-300 via-purple-400 to-blue-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-blue-600 rounded-md shadow-md transition duration-200 flex items-center space-x-1"
        title="Generate post with AI"
      >
        {isGenerating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3 text-white" />
        )}
        {/*<span className="text-xs">Generate Post</span>*/}
      </button>
    )}
  </div>

                    
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
                </>              
                )}             
            </div> 
        );


    const renderScheduleStep = () => (
        <div className="space-y-6">
            {/* Schedule Time */}
            <div>
                <div className="flex space-x-2 items-center">
                    <span className="bg-blue-50 rounded-full p-1 mb-2">
                        <CalendarPlus className="w-4 h-4 text-blue-500"/>
                    </span>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                        Schedule Time
                    </label>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-700">
                            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </span>
                    </div>
                    <input
                        type="time"
                        value={scheduledTime}
                        onChange={handleTimeChange}
                        className={`px-4 py-2 border ${timeError ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    />
                </div>
            </div>

            {/* Error message */}
            <div className={`flex items-center space-x-2 ${
                timeError ? 'bg-red-50 border border-red-200' : 'hidden'} rounded-md p-2`}>
                {timeError && <AlertCircle className="text-red-300 w-5 h-5"/>}
                {timeError && (
                    <div className="mt-1 text-sm text-red-500">
                        {timeError}
                    </div>
                )}
            </div>
   
            {/* NEW: Add Image Button */}
          <div className="flex space-x-2 items-center">
                    <span className="bg-blue-50 rounded-full p-1">
                        <ImagePlus className="w-4 h-4 text-blue-500"/>
                    </span>
                    <label className="block text-xs font-medium text-gray-700">
                        Add Photo 
                    </label>
                </div>
          
          <div className="items-center flex space-x-2">
             {uploadedPhotoUrl ? (
                // State 1: Image is uploaded
                <div className="relative w-24 h-24 group">
                    <img
                        src={uploadedPhotoUrl}
                        alt="Uploaded post image"
                        className="w-full h-full object-cover rounded-md shadow-sm cursor-pointer border border-gray-200"
                        title="Click to view image"
                    />
                    <button
                        onClick={handleRemoveImage}
                        disabled={deletingImageId === 'deleting'}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Remove image"
                    >
                        {deletingImageId === 'deleting' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <X className="w-4 h-4" />
                        )}
                    </button>


                  
                </div>
            ) : (
                // State 2: No image, show "Add Image" button
                <button 
                  onClick={handleAddImage}
                  disabled={uploadingImageId === 'uploading'}
                  className="flex p-2 space-x-2 justify-center bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300"
                >
                    <span className="space-x-2 justify-center flex">
                        {uploadingImageId === 'uploading' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500"/>
                        ) : (
                            <PlusCircle className="w-4 h-4 text-blue-500"/>
                        )}
                        <span className="block items-center text-xs font-normal text-blue-500">
                            {uploadingImageId === 'uploading' ? 'Uploading...' : 'Click to Add Image'}
                        </span>
                    </span>    
                </button>
            )}

          {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*" // Accept only image files
            />
            
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
    <TooltipExtended text="Please select a campaign or draft a post to continue" show={!canProceedToSchedule()}>
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

    <TooltipExtended text="Please select a campaign or draft a post to continue" show={!postContent.trim()}>
        <button
          onClick={handleSave}
          disabled={!postContent.trim() || isSaving || timeError !== null}
          className={`px-6 py-2 ${
      timeError !== null 
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
        : 'bg-blue-500 text-white hover:bg-blue-600'
    } rounded-lg disabled:bg-gray-300 text-gray-50 flex items-center space-x-2`}
          //className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center space-x-2"
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
    <>
      
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-5 z-50">
     {/* Modal content - add max-height and overflow handling */}
      <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '75vh' }}> 
      <div className="bg-white rounded-xl w-full max-w-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Create Scheduled Post</h2>
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

        {/*New Section Starts*/}

  {/* **Conditional Rendering Based on isSuccess** */}
            {isSuccess ? (
              // **Render ONLY the success message content when isSuccess is true**
              // We'll use the styling you defined in SuccessNotification but render it inline here
              <div className="flex items-center space-x-3 p-4 z-[1000000]"> {/* Adjust padding as needed */}
                <div className="bg-green-100 rounded-full p-2">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Post Scheduled Successfully</p>
                  <p className="text-sm text-gray-500">
                    Your post will be published on {format(selectedDate, 'MMM d')} at {scheduledTime}
                  </p>
                </div>
              </div>
            ) : (
        
        isLoading ? (
          <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
          ) : (
          <>
          {currentStep === 'content' ? renderContentStep() : renderScheduleStep()}
          {renderActionButtons()}
        </>
        )
        )}
        
      {/* **End of Conditional Rendering** */}
      {/*End of isLoading Section */}  
        
      </div>
     </div>
    </div>
    </>
  );
}