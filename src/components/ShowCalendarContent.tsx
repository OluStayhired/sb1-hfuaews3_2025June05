// src/components/ShowCalendarContent.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { Calendar, CalendarCheck, Edit2, Copy, Loader2, Megaphone, ArrowLeft, X, Sparkles, SquarePen, Send, Clock, PlusCircle, CheckCircle, Heart } from 'lucide-react';
import { generateListPost, generateHookPost, generateHookPostV2, generateHookPostV3 } from '../lib/gemini';
import { ContentModal } from './ContentModal';
import { AddToCalendarModal } from './AddToCalendarModal'
import { checkConnectedSocials, checkPlatformConnection } from '../utils/checkConnectedSocial';
import { CreateBlueskyModal } from './CreateBlueskyModal';
import { NoSocialModal } from './NoSocialModal';
import { ScheduleDateWarningModal } from './ScheduleDateWarningModal';
import { isToday } from 'date-fns';
import { CampaignInfoModal } from './CampaignInfoModal';
import { CampaignInfoCard } from  './CampaignInfoCard';
import { TooltipHelp } from '../utils/TooltipHelp';
import { TooltipExtended } from '../utils/TooltipExtended';
import { useNavigate } from 'react-router-dom';
import { BulkAddToCalendarModal } from './BulkAddToCalendarModal'; 
import { TypingEffect } from './TypingEffect'; 
import { useHooks } from '/src/context/HooksContext';


interface ShowCalendarContentProps {
  calendarName: string;
  userEmail: string;
  onBackToList: () => void; 
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
}

interface ContentScore {
  firstLineScore: number;
  lengthScore: number;
  totalScore: number;
  details: {
    firstLineLength: number;
    contentLength: number;
    contentPercentage: number;
  };
}

export function ShowCalendarContent({ calendarName, userEmail, onBackToList}: ShowCalendarContentProps) {
  const { hooksData, isHooksLoading, hooksError } = useHooks();
  const [calendarContent, setCalendarContent] = useState<CalendarContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isImproving, setIsImproving] = useState<string | null>(null); // 
  const [optimisticContent, setOptimisticContent] = useState<CalendarContent[]>([]); 
  const [selectedContent, setSelectedContent] = useState<CalendarContent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddToCalendarModalOpen, setIsAddToCalendarModalOpen] = useState(false);
  const [selectedContentForSchedule, setSelectedContentForSchedule] = useState<CalendarContent | null>(null);
  const [showNoSocialModal, setShowNoSocialModal] = useState(false);
  const [isBlueskyModalOpen, setIsBlueskyModalOpen] = useState(false);
  const [isDateWarningModalOpen, setIsDateWarningModalOpen] = useState(false);
  const [invalidDate, setInvalidDate] = useState<Date | null>(null);
  const [timeFilter, setTimeFilter] = useState<'this-week' | 'next-week' | 'all' | null>('this-week');
  const [showCampaignInfo, setShowCampaignInfo] = useState(true);
  const [showCampaignInfoModal, setShowCampaignInfoModal] = useState(true);
  const [selectedCampaignForModal, setSelectedCampaignForModal] = useState<CalendarContent | null>(null); 
  const navigate = useNavigate();
  const [loadingCharLength, setLoadingCharLength] = useState<number | null>(null);
  const [isBulkAddToCalendarModalOpen, setIsBulkAddToCalendarModalOpen] = useState(false);
// New state for TypingEffect
  const [showTypingEffect, setShowTypingEffect] = useState(false);
  const [typingContentId, setTypingContentId] = useState<string | null>(null); // To track which content item is typing
  const [currentTypingText, setCurrentTypingText] = useState(''); // The text currently being typed


  //const today = new Date();

  const handleCreateNewCampaign = () => {
    setShowCampaignInfo(false);
    onBackToList();
  };

  const handleCreateCampaign = () => {
    navigate('/dashboard/campaign');
    //onClose();
  };

    const handleCloseCampaignInfoModal = () => {
    setShowCampaignInfoModal(false);
    setSelectedCampaignForModal(null); // Clear selected campaign when closing
  };

  const checkSocials = async () => {
  const socials = await checkConnectedSocials();
  if (socials) {
    console.log('Bluesky connected:', socials.bluesky);
    console.log('LinkedIn connected:', socials.linkedin);
    console.log('Twitter connected:', socials.twitter);
  }
};

const checkBluesky = async () => {
  const isConnected = await checkPlatformConnection('Bluesky');
  console.log('Bluesky connected:', isConnected);
};  

const validateAndSetDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    if (date < today) {
      // Date is in the past, show warning
      setInvalidDate(date);
      setIsDateWarningModalOpen(true);
      return false;
    }
    
    // Date is valid, proceed with your logic
    setSelectedDate(date);
    return true;
  };
  
  // 4. Function to handle closing the modal
  const handleCloseWarningModal = () => {
    setIsDateWarningModalOpen(false);
    setInvalidDate(null);
  };  
  
  const handleAddToCalendar = async (content: CalendarContent) => {

    // Check for connected social accounts first
    const socials = await checkConnectedSocials();
  
    if (!socials || (!socials.bluesky && !socials.linkedin && !socials.twitter)) {
    // No social accounts connected, show NoSocialModal
    setShowNoSocialModal(true);
    return;
  }

 

 // Then validate the date
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

  const contentDateObj = parseISO(content.content_date);    

//console.log('current date: ', content.content_date)  
//console.log('today: ', today)    
  
  if (contentDateObj < today) {
    // Date is in the past, show warning modal
    setInvalidDate(contentDateObj);
    setIsDateWarningModalOpen(true);
    return;
  }  
    
  setSelectedContentForSchedule(content);
  setIsAddToCalendarModalOpen(true);
};

const handleConnectBluesky = () => {
  // First close the NoSocialModal
  setShowNoSocialModal(false);
  setIsBlueskyModalOpen(true);
};

const handleCloseBlueskyModal = () => {
  setIsBlueskyModalOpen(false);
};  

const handleConnectLinkedIn = () => {
  // Your LinkedIn connection logic (when available)
  setShowNoSocialModal(false);
};  


  const today = new Date();
  const currentDayOfWeek = format(today, 'EEEE');
  const currentDate = format(today, 'd MMMM');

  const daysOfWeek = [
    'Monday',
    'Tuesday', 
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  const fetchCalendarContent = async () => {
    try {
      setLoading(true);
      
      const { data: contentData, error: contentError } = await supabase
        .from('content_calendar')
        .select('*')
        .match({
          email: userEmail,
          calendar_name: calendarName
        })
        .order('day', { ascending: true });

      if (contentError) throw contentError;

      setCalendarContent(contentData || []);
    } catch (err) {
      console.error('Error fetching calendar content:', err);
      setError('Failed to load calendar content');
    } finally {
      setLoading(false);
    }
  };

    const handleBulkScheduleSuccess = () => {
    fetchCalendarContent(); // Refresh the calendar content
  };

  useEffect(() => {
    if (userEmail && calendarName) {
      fetchCalendarContent();
    }
  }, [userEmail, calendarName]);

  
  const handleBackToCalendarList = () => {
    console.log("handleBackToCalendarList called");
  // Clean up any state if needed
  setSelectedDay(null);
  setCopySuccess(null);
  // Call the parent's callback to switch views
   if (onBackToList) {
      console.log("Calling onBackToList");
  onBackToList();
    } else {
      console.error("onBackToList is not defined!");
    }
};

const handleImproveContentAI = async (content: CalendarContent) => {
  try {
    setIsImproving(content.id);
    
    // Generate improved content
    const improvedContent = await generateListPost(
      content.theme,
      content.topic,
      content.target_audience || '', // Add target_audience to interface if not present
      content.content,
      content.call_to_action
    );

    if (improvedContent.error) throw new Error(improvedContent.error);

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('content_calendar')
      .update({ 
        content: improvedContent.text,
        updated_at: new Date().toISOString()
      })
      .eq('id', content.id);

    if (updateError) throw updateError;

    // Optimistic update
    setCalendarContent(prev => 
      prev.map(item => 
        item.id === content.id 
          ? { ...item, content: improvedContent.text }
          : item
      )
    );

  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here
  } finally {
    setIsImproving(null);
  }
};

const handleHookPost = async (content: CalendarContent, char_length: string) => {

  

  const uniqueKey = `${content.id}_${char_length}`;
  
  try {
    //setIsImproving(content.id);
    setLoadingCharLength(uniqueKey);
    
    // Generate improved content
    const improvedContent = await generateHookPost(
      content.theme,
      content.topic,
      content.target_audience || '', // Add target_audience to interface if not present
      content.content,
      char_length
    );

    //console.log('executing the Hook Posts Here')

    if (improvedContent.error) throw new Error(improvedContent.error);

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('content_calendar')
      .update({ 
        content: improvedContent.text,
        updated_at: new Date().toISOString()
      })
      .eq('id', content.id);

    if (updateError) throw updateError;

    // Optimistic update
    setCalendarContent(prev => 
      prev.map(item => 
        item.id === content.id 
          ? { ...item, content: improvedContent.text }
          : item
      )
    );

  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here
  } finally {
    setLoadingCharLength(null);
  }
};  


const handleHookPostV2 = async (content: CalendarContent, char_length: string) => {

  const uniqueKey = `${content.id}_${char_length}`;
  
  try {
    //setIsImproving(content.id);
    
    //add typing effect state management here
    setTypingContentId(content.id); // Set the ID of the content item that will be typing
    setCurrentTypingText(''); // Clear previous text for typing effect
    setShowTypingEffect(true); // Activate the typing effect

    setLoadingCharLength(uniqueKey);
    
    // Generate improved content
    const improvedContent = await generateHookPostV2(
      hooksData,
      content.theme,
      content.topic,
      content.target_audience || '', // Add target_audience to interface if not present
      content.content,
      char_length
    );

    //console.log('executing the Hook Posts Here')

    if (improvedContent.error) throw new Error(improvedContent.error);

    //Add new state variable sets here
     // 3. API call is complete, hide spinner and prepare for typing effect
    setLoadingCharLength(null); // Hide the spinner
    setCurrentTypingText(improvedContent.text); // Set the text to be typed
    setTypingContentId(content.id);             // Indicate which item is typing
    setShowTypingEffect(true); 

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('content_calendar')
      .update({ 
        content: improvedContent.text,
        updated_at: new Date().toISOString()
      })
      .eq('id', content.id);

    if (updateError) throw updateError;

    // Optimistic update
    setCalendarContent(prev => 
      prev.map(item => 
        item.id === content.id 
          ? { ...item, content: improvedContent.text }
          : item
      )
    );

    // Set the text for the TypingEffect component to start typing
    setCurrentTypingText(improvedContent.text);

  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here

    //moved set charlength here
    setLoadingCharLength(null);
    
    setShowTypingEffect(false); // Hide typing effect on error
    setTypingContentId(null);
    setCurrentTypingText(''); // Clear typing text
  } finally {
    //setLoadingCharLength(null);
  }
};    


const handleHookPostV3 = async (content: CalendarContent, char_length: string) => {

  const uniqueKey = `${content.id}_${char_length}`;
  
  try {
    //setIsImproving(content.id);
    
    //add typing effect state management here
    setTypingContentId(content.id); // Set the ID of the content item that will be typing
    setCurrentTypingText(''); // Clear previous text for typing effect
    setShowTypingEffect(true); // Activate the typing effect

    setLoadingCharLength(uniqueKey);
    
    // Generate improved content
    const improvedContent = await generateHookPostV3(
      //hooksData,
      content.theme,
      content.topic,
      content.target_audience || '', // Add target_audience to interface if not present
      content.content,
      char_length
    );

    //console.log('executing the Hook Posts Here')

    if (improvedContent.error) throw new Error(improvedContent.error);

    //Add new state variable sets here
     // 3. API call is complete, hide spinner and prepare for typing effect
    setLoadingCharLength(null); // Hide the spinner
    setCurrentTypingText(improvedContent.text); // Set the text to be typed
    setTypingContentId(content.id);             // Indicate which item is typing
    setShowTypingEffect(true); 

    // Update in Supabase
    const { error: updateError } = await supabase
      .from('content_calendar')
      .update({ 
        content: improvedContent.text,
        updated_at: new Date().toISOString()
      })
      .eq('id', content.id);

    if (updateError) throw updateError;

    // Optimistic update
    setCalendarContent(prev => 
      prev.map(item => 
        item.id === content.id 
          ? { ...item, content: improvedContent.text }
          : item
      )
    );

    // Set the text for the TypingEffect component to start typing
    setCurrentTypingText(improvedContent.text);

  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here

    //moved set charlength here
    setLoadingCharLength(null);
    
    setShowTypingEffect(false); // Hide typing effect on error
    setTypingContentId(null);
    setCurrentTypingText(''); // Clear typing text
  } finally {
    //setLoadingCharLength(null);
  }
};    


const formatContentText = (text: string): string[] => {
  return text
    .replace(/([A-Za-z])\.([A-Za-z])/g, '$1[dot]$2') // Handle abbreviations
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.replace(/\[dot\]/g, '.').trim())
    .filter(sentence => sentence.length > 0); // Filter out empty sentences
};


const handleSaveContent = async (updatedContent: CalendarContent) => {
  try {
    const { error } = await supabase
      .from('content_calendar')
      .update({
        theme: updatedContent.theme,
        topic: updatedContent.topic,
        content: updatedContent.content,
        call_to_action: updatedContent.call_to_action,
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedContent.id);

    if (error) throw error;

    // Refresh calendar content
    fetchCalendarContent();
  } catch (err) {
    console.error('Error updating content:', err);
  }
};

const calculateContentScore = (content: string): ContentScore => {
  const MAX_FIRST_LINE = 40;
  const MAX_CONTENT = 300;
  const OPTIMAL_MIN_PERCENTAGE = 60;
  const OPTIMAL_MAX_PERCENTAGE = 70;
  
  // Get first line
  const firstLine = content.split('\n')[0];
  const firstLineLength = firstLine.length;
  
  // Calculate first line score (50 points max)
  let firstLineScore = 50;
  if (firstLineLength > MAX_FIRST_LINE) {
    firstLineScore = Math.max(0, 50 - ((firstLineLength - MAX_FIRST_LINE) * 0.5));
  }

  // Calculate content length score (50 points max)
  const contentLength = content.length;
  const contentPercentage = (contentLength / MAX_CONTENT) * 100;
  
  let lengthScore = 50;
  if (contentPercentage < OPTIMAL_MIN_PERCENTAGE) {
    const pointsDeduction = (OPTIMAL_MIN_PERCENTAGE - contentPercentage) * 0.5;
    lengthScore = Math.max(0, 50 - pointsDeduction);
  } else if (contentPercentage > OPTIMAL_MAX_PERCENTAGE) {
    const pointsDeduction = (contentPercentage - OPTIMAL_MAX_PERCENTAGE) * 0.5;
    lengthScore = Math.max(0, 50 - pointsDeduction);
  }

  return {
    firstLineScore,
    lengthScore,
    totalScore: firstLineScore + lengthScore,
    details: {
      firstLineLength,
      contentLength,
      contentPercentage
    }
  };
};  

const getScoreColor = (score: number): string => {
  if (score >= 75) return 'text-green-500 hover:text-green-600';
  if (score >= 55) return 'text-yellow-500 hover:text-yellow-600';
  return 'text-red-500 hover:text-red-600';
};  

const getFilteredContent = () => {
  // First apply the day filter if it exists
  let filtered = selectedDay
    ? calendarContent.filter(content => content.day_of_week === selectedDay)
    : calendarContent;
  
  // Then apply the time period filter
  if (timeFilter === 'this-week') {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Start on Monday
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }); // End on Sunday
    
    filtered = filtered.filter(content => {
      const contentDate = parseISO(content.content_date);
      return isWithinInterval(contentDate, { start: weekStart, end: weekEnd });
    });
  } else if (timeFilter === 'next-week') {
    const nextWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
    const nextWeekEnd = addWeeks(endOfWeek(new Date(), { weekStartsOn: 1 }), 1);
    
    filtered = filtered.filter(content => {
      const contentDate = parseISO(content.content_date);
      return isWithinInterval(contentDate, { start: nextWeekStart, end: nextWeekEnd });
    });
  }
  // 'all' doesn't need additional filtering
  
  return filtered;
};
  

const filteredContent = getFilteredContent();

// Handler to open the BulkAddToCalendarModal
const handleOpenBulkAddToCalendarModal = async (content: CalendarContent) => {

  // Check for connected social accounts first
    const socials = await checkConnectedSocials();
  
    if (!socials || (!socials.bluesky && !socials.linkedin && !socials.twitter)) {
    // No social accounts connected, show NoSocialModal
    setShowNoSocialModal(true);
    return;
    }
  setIsBulkAddToCalendarModalOpen(true);
};

// Handler to close the BulkAddToCalendarModal
const handleCloseBulkAddToCalendarModal = () => {
  setIsBulkAddToCalendarModalOpen(false);
};    

const handleEditCampaignPost = async (content: CalendarContent) => {

  // Check for connected social accounts first
    const socials = await checkConnectedSocials();
  
    if (!socials || (!socials.bluesky && !socials.linkedin && !socials.twitter)) {
    // No social accounts connected, show NoSocialModal
    setShowNoSocialModal(true);
    return;
    }
  else
    {
      setSelectedContent(content);
      setIsModalOpen(true);
    }
                    
}  

const handleCopyCampaignPost = async (content: CalendarContent) => {
 // Check for connected social accounts first
    const socials = await checkConnectedSocials();
  
    if (!socials || (!socials.bluesky && !socials.linkedin && !socials.twitter)) {
    // No social accounts connected, show NoSocialModal
    setShowNoSocialModal(true);
    return;
    }
  
        try {
              const sentences = formatContentText(content.content);
              const formattedContentForClipboard = sentences.join('\n\n');

                await navigator.clipboard.writeText(formattedContentForClipboard);
                   setCopySuccess(content.id);
                   setTimeout(() => setCopySuccess(null), 2000);
                    } catch (err) {
                      console.error('Failed to copy text:', err);
                    }
                  
      }  
  

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        {error}
      </div>
    );
  }

  if (!calendarContent.length) {
    return (
  <div className="flex flex-col items-center justify-center h-full text-gray-500">
     <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
        <Calendar className="w-12 h-12 font-light text-blue-500" />
      </div>
      
        <div className="text-center text-gray-500 py-8">
          {/*No content available for this calendar*/}
            <p className="text-gray-600 mb-3 mt-2">Sorry! No content available for this calendar 😔</p>
            <p className="text-gray-400 mb-4 text-sm">Create a campaign to get started</p>
          
          <button
                  onClick={handleBackToCalendarList}
                  className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  <span>Back to Campaign List</span>
          </button>
          
        </div>
  </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-blue-75 via-blue-50 to-white border-1 border-transparent rounded-xl p-6 shadow-sm">

      {/* Add the X button here */}
            <div className="flex justify-start mb-4 mt-[-16px]">
                <button
                    onClick={handleBackToCalendarList} 
                  // Make sure you have this function or state handler
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    title="Close"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-500"/>
                </button>
            </div>
        
        <div className="flex items-center justify-left mb-4">
          
          <div className="flex items-center space-x-3">
            {/*<Megaphone className="w-6 h-6 text-blue-500" />*/}
            <div>
            
              <h2 className="text-lg text-gray-900 font-semibold">{calendarName}</h2>
              {/*<p className="text-sm text-gray-500">{calendarContent[0]?.description}</p>*/}
            </div>
            
          </div>
       
          
</div>

{/* Today's Date */}   
<div className="flex text-xs p-1.5 justify-lefy inline-block text-gray-500 rounded-full mt-2">
            <span><Calendar className="w-4 h-4 text-blue-500 mr-1"/></span>
            <span className="text-blue-500">{currentDayOfWeek}</span>
            <span className="mx-0.5"></span>
            <span className="text-blue-500">{currentDate}</span>
     </div>
        
            
{/* This Week Next Week Show All - Time Filter Section */}
      
<div className="flex flex-wrap gap-2 mt-4">
  <button
    onClick={() => setTimeFilter('this-week')}
    className={`px-4 py-1.5 rounded-full text-xs transition-colors ${
      timeFilter === 'this-week'
        ? 'bg-blue-500 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    This Week
  </button>
  <button
    onClick={() => setTimeFilter('next-week')}
    className={`px-4 py-1.5 rounded-full text-xs transition-colors ${
      timeFilter === 'next-week'
        ? 'bg-blue-500 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    Next Week
  </button>
  <button
    onClick={() => setTimeFilter('all')}
    className={`px-4 py-1.5 rounded-full text-xs transition-colors ${
      timeFilter === 'all'
        ? 'bg-blue-500 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    Full Calendar
  </button>

</div>

{/* Add this section to show filter information */}
{timeFilter !== 'all' && (
  <div className="mt-6 text-left text-xs text-gray-500">
    Showing {filteredContent.length} posts for {timeFilter === 'this-week' ? 'this week' : 'next week'}
    <button
      onClick={() => setTimeFilter('all')}
      className="ml-2 text-blue-500 hover:text-blue-600"
    >
      Show all
    </button>
  </div>
)}

{/*End This Week Next Week Show All Filter*/}
<div className="flex inline mt-6">
<TooltipHelp  text = "⚡ Bulk Schedule All Posts">
 <button
    onClick={handleOpenBulkAddToCalendarModal}
    className={`flex  items-center px-4 py-2 space-x-2 rounded-md text-sm transition-colors ${
      timeFilter === 'all'
        ? 'bg-blue-50 text-blue-500'
        : 'bg-blue-50 text-blue-500 hover:bg-blue-100'
    }`}
  >
 <PlusCircle className="h-4 w-4 mr-2"/>
    Schedule All
  </button>          
</TooltipHelp>
</div>        
        
</div>

{/*      
 <button
    onClick={handleOpenBulkAddToCalendarModal}
    className={`flex items-center px-4 py-2 space-x-2 rounded-md text-sm transition-colors ${
      timeFilter === 'all'
        ? 'bg-blue-500 text-white'
        : 'bg-gray-900 text-white hover:bg-gray-500'
    }`}
  >
 <PlusCircle className="h-4 w-4 mr-2"/>
    Schedule All
  </button> 
  */}


      
      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

 {showCampaignInfo && filteredContent.length === 0 && ( // Only show if showCampaignInfo is true AND there's no actual content yet
        <CampaignInfoCard
          key="campaign-info-card-setup" // It's important to give a unique key
          campaignName={calendarName}
          onCreateNewCampaign={handleCreateNewCampaign}
        />
      )}

        
{showCampaignInfo && filteredContent.length === 0 && (
      <CampaignInfoModal
          isOpen={showCampaignInfoModal}
          onClose={handleCloseCampaignInfoModal}
          campaignName={calendarName}
          //onCreateNewCampaign={handleCreateNewCampaignFromModal}
      />
  )}
          
        
        {filteredContent.map((content) => (
          <div
                key={content.id}
                className={`bg-white rounded-lg border hover:border hover:border-blue-400 shadow-sm p-4 transition-shadow relative ${
                isToday(parseISO(content.content_date)) ? 'border-blue-400 hover:border-blue-500' : 'border-transparent'
                  }`}
              >

            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-xs font-semibold text-blue-500">
                {new Date(content.content_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} </span>
                
              </div>
              
              </div>

        <div className="flex flex-col items-start mb-4">  {/*start AI Buttons Here */}
              <div className="opacity-70 hover:opacity-100 flex-1 flex justify-end items-center space-x-2">

                <TooltipHelp  text = "⚡Write from the heart">
              <button
                onClick={() => handleImproveContentAI(content)}
                //onClick={() => handleHookPost(content, 700)}
                //disabled={loadingCharLength === `${content.id}_700`}
                disabled={isImproving === content.id}
               

                //className="p-1 bg-gradient-to-br from-indigo-300 via-purple-400 to-blue-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-blue-600 rounded-md shadow-md transition duration-200 flex items-center space-x-1"
                //title="Improve Post"
              //>

                className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md"
              >
                
                
                
                {/*loadingCharLength === `${content.id}_700` ? (*/}
                
                {isImproving === content.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                                
                <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                
                 )}
                <span className="text-xs">Emotional</span>
              
              </button>
             
                </TooltipHelp>

              <TooltipHelp  text = "⚡Adapt for LinkedIn">
              <button
                //onClick={() => handleImproveContentAI(content)}
                onClick={() => handleHookPostV3(content, 700)}
                disabled={loadingCharLength === `${content.id}_700`}
                //disabled={isImproving === content.id}
               

                //className="p-1 bg-gradient-to-br from-indigo-300 via-purple-400 to-blue-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-blue-600 rounded-md shadow-md transition duration-200 flex items-center space-x-1"
                //title="Improve Post"
              //>

                className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md"
              >
                
                {/*isImproving === content.id ? (*/}
                
                {loadingCharLength === `${content.id}_700` ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                
                
                //<Sparkles className="w-3 h-3 text-white" />

                <img src={LinkedInLogo} className="w-3 h-3" />
                
                 )}
                <span className="text-xs">LinkedIn</span>
              </button>
             </TooltipHelp>


                <TooltipHelp  text = "⚡Adapt for Bluesky">
              <button
                //onClick={() => handleImproveContentAI(content)}
                onClick={() => handleHookPostV3(content, 300)}
                disabled={loadingCharLength === `${content.id}_300`}
                //disabled={isImproving === content.id}
               

                //className="p-1 bg-gradient-to-br from-indigo-300 via-purple-400 to-blue-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-blue-600 rounded-md shadow-md transition duration-200 flex items-center space-x-1"
                //title="Improve Post"
              //>

                className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md"
                //title="Improve Post"
              >
                
                {/*isImproving === content.id ? (*/}
                
                {loadingCharLength === `${content.id}_300` ? (
                
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                //<Sparkles className="w-3 h-3 text-white" />

                <img src={BlueskyLogo} className="w-3 h-3" />
                
                 )}
                <span className="text-xs">Bluesky</span>
              </button>
             </TooltipHelp>

            <TooltipHelp  text = "⚡Adapt for Twitter">
              <button
                onClick={() => handleHookPostV3(content, 280)}
                disabled={loadingCharLength === `${content.id}_280`}
                className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md"
              >
                
                {loadingCharLength === `${content.id}_280` ? (
                
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                <img src={XLogo} className="w-3 h-3" />
                
                 )}
                <span className="text-xs">Twitter</span>
              </button>
             </TooltipHelp> 

              </div> {/*End AI buttons here*/}
                
          {/*removed date close DIV*/}
              
            </div>
<div className="flex flex-col items-start">
            <h3 className="font-medium text-left text-sm text-gray-900 mb-1">{content.theme}</h3>
            <p className="text-xs text-left items-left text-gray-900 mb-2 inline-block">
              {content.topic}
            </p>
  
            <p className={`pt-12 p-1 bg-gray-50 hover:bg-gray-100 rounded-md text-xs text-left text-gray-500 mb-8 whitespace-pre-wrap break-words leading-relaxed relative self-stretch ${
  isImproving === content.id ? 'opacity-50' : ''
}`} >
     {/* Conditional rendering for TypingEffect */}
      {showTypingEffect && typingContentId === content.id ? (
        <TypingEffect
          text={currentTypingText}
          speed={10} // Adjust typing speed as needed
          onComplete={() => {
            setShowTypingEffect(false);
            setTypingContentId(null);
            setCurrentTypingText(''); // Clear typing text after completion
          }}
        />
      ) : (  
        
  // Display the full content directly if not currently typing for this item   
  formatContentText(content.content).map((sentence, index) => (
    <p key={index} className="leading-relaxed mb-3">{sentence}</p>
      )))}         
    {isImproving === content.id && (
  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    </div>
            )}

              {/*<div className="absolute top-2 right-2 flex space-x-2">*/}

  <div className="absolute top-1 left-1 flex space-x-1 z-10">

    <TooltipHelp  text = "⚡ Send to Calendar">
      <button
              onClick={() => handleAddToCalendar(content)}
              className="inline-flex items-center border border-gray-300 items-left px-1 py-1 bg-gray-100 text-gray-500 rounded-md hover:bg-blue-500 hover:text-white hover:border hover:border-blue-500 transition-colors"
          >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                       <span className="text-xs">Schedule Post</span>
              </button>  
    </TooltipHelp>


    <TooltipHelp  text = "Copy Post">
              <button
                  onClick={() => handleCopyCampaignPost(content)}
              className="inline-flex items-center px-1 py-1 bg-gray-100 text-gray-400 rounded-md hover:bg-gray-100 hover:text-gray-300 transition-colors">
                <Copy className="w-3 h-3" />
                       {copySuccess === content.id && (
                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs bg-green-100 text-green-500 px-2 py-1 rounded">
                      Copied!
                    </span>
                  )}
              </button>
    </TooltipHelp>

    <TooltipHelp  text = "Edit Post">
               <button
                    onClick={() => handleEditCampaignPost(content)}
              className="inline-flex items-center px-1 py-1 bg-gray-100 text-gray-400 rounded-md hover:bg-gray-100 hover:text-gray-300 transition-colors"
          >
                      <SquarePen className="w-3 h-3" />
                 
              </button>
    </TooltipHelp>

    <TooltipHelp  text = {`Content Score ${Math.round(calculateContentScore(content.content).totalScore)}%`} >
              <button
                  className={`inline-flex items-center px-1 py-1 bg-gray-100 ${getScoreColor(calculateContentScore(content.content).totalScore)} rounded-md hover:bg-gray-100 transition-colors group relative`}
                  //title="Post Readability"
              >
                <CheckCircle className="w-3 h-3" />
              </button>  
      </TooltipHelp>
            </div>  
        </p>
      </div>
            
    <div className="absolute bottom-2 left-2 flex items-center space-x-2 ml-1">
        
          <div className="space-x-2 flex-wrap">

             <div className={`text-xs text-blue-500 rounded-full p-1.5 inline-flex items-left
              ${content.content.length > 300 ? 'bg-red-50' : 'bg-gray-100'
              }`}>
              
              {/*{content.call_to_action}*/}
              <span className={`text-xs ${
              content.content.length > 300 ? 'text-red-300 hover:text-red-400' : 'text-gray-400 hover:text-gray-500'
              }`}>
              {content.content.length}/300 chars
                </span>
            </div>
              
          </div>           
        </div>
      </div>

        
        ))}
      </div>

      {selectedContent && (
        <ContentModal
        content={selectedContent}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContent(null);
          }}
        onSave={handleSaveContent}
        setOptimisticContent={setCalendarContent}
          />
        )}

      {selectedContentForSchedule && (
        <AddToCalendarModal
            isOpen={isAddToCalendarModalOpen}
            onClose={() => {
            setIsAddToCalendarModalOpen(false);
            setSelectedContentForSchedule(null);
            }}
            content={selectedContentForSchedule}
          />
      )}

          <NoSocialModal
                isOpen={showNoSocialModal}
                onClose={() => setShowNoSocialModal(false)}
                onConnectBluesky={handleConnectBluesky}
                onConnectLinkedIn={handleConnectLinkedIn}
              />

          <CreateBlueskyModal 
              isOpen={isBlueskyModalOpen}
              onClose={handleCloseBlueskyModal}
             />

          {invalidDate && (
              <ScheduleDateWarningModal
                 isOpen={isDateWarningModalOpen}
                 onClose={handleCloseWarningModal}
                 selectedDate={invalidDate}
             />
           )}

           {/* BulkAddToCalendarModal Component Call */}
              <BulkAddToCalendarModal
                  isOpen={isBulkAddToCalendarModalOpen}
                  onClose={handleCloseBulkAddToCalendarModal}
                  calendarName={calendarName}
                  //onScheduleSuccess={handleBulkScheduleSuccess} 
            />
    </div>
      
  );
}
export default ShowCalendarContent;