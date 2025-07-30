// src/components/ShowCalendarContent.tsx

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO, addWeeks, addDays, isWithinInterval, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { Calendar, Check, CalendarCheck, Edit2, Copy, Loader2, Megaphone, ArrowLeft, X, Sparkles, SquarePen, Send, Clock, PlusCircle, CheckCircle, Heart, Combine, ImagePlus } from 'lucide-react';
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
import { uploadImageGetUrl } from '../utils/UploadImageGetUrl';
import { deletePostImage } from '../utils/DeletePostImage';


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
  photo_url?: string | null; 
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

  // New state for calendar end date and days left
  const [calendarEndDate, setCalendarEndDate] = useState<Date | null>(null);
  const [currentCalendarDaysLeft, setCurrentCalendarDaysLeft] = useState<number | null>(null);

  const [isCopySuccessModalOpen, setIsCopySuccessModalOpen] = useState(false);

  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  // State to track which post is currently uploading an image
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [showCampaignExpiredCard, setShowCampaignExpiredCard] = useState(false);


  const handleCreateNewCampaign = () => {
    setShowCampaignInfo(false);
    onBackToList();
  };

  const handleCreateCampaign = () => {
    navigate('/dashboard/campaign');
    //onClose();
  };

  const handleShowCampaignList = () => {
    navigate('/dashboard/calendars');
    onClose();
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

   // New useEffect to fetch calendar end date and calculate days left
  useEffect(() => {
    const fetchCalendarDetails = async () => {
      if (!calendarName || !userEmail) return;

      try {
        const { data, error } = await supabase
          .from('calendar_questions')
          .select('end_date')
          .eq('calendar_name', calendarName)
          .eq('email', userEmail)
          .single();

        if (error) {
          console.error('Error fetching calendar end date:', error);
          setCalendarEndDate(null);
          setCurrentCalendarDaysLeft(null);
          return;
        }

        if (data?.end_date) {
          const endDate = parseISO(data.end_date);
          setCalendarEndDate(endDate);
          const daysLeft = differenceInDays(endDate, new Date());
          setCurrentCalendarDaysLeft(daysLeft);
        } else {
          setCalendarEndDate(null);
          setCurrentCalendarDaysLeft(null);
        }
      } catch (err) {
        console.error('Unexpected error fetching calendar details:', err);
        setCalendarEndDate(null);
        setCurrentCalendarDaysLeft(null);
      }
    };

    fetchCalendarDetails();
  }, [calendarName, userEmail]);

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
  fetchCalendarList();   
    } else {
      console.error("onBackToList is not defined!");
    }
};

const handleImproveContentAI = async (content: CalendarContent) => {
   // Check if the campaign is expired
    if (currentCalendarDaysLeft === null || currentCalendarDaysLeft < 0) {
    console.log('Campaign expired or days left is null/negative. Showing CampaignInfoCard modal.');
    setShowCampaignInfoModal(true); // Set state to show the CampaignInfoCard modal
    return; // Stop execution, do not proceed with LLM call
  }
  
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

      // Check if the campaign is expired
    if (currentCalendarDaysLeft === null || currentCalendarDaysLeft < 0) {
    console.log('Campaign expired or days left is null/negative. Showing CampaignInfoCard modal.');
    setShowCampaignInfoModal(true); // Set state to show the CampaignInfoCard modal
    return; // Stop execution, do not proceed with LLM call
  }

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

        // Check if the campaign is expired
  if (currentCalendarDaysLeft === null || currentCalendarDaysLeft < 0) {
    console.log('Campaign expired or days left is null/negative. Showing CampaignInfoCard modal.');
    setShowCampaignInfoModal(true); // Set state to show the CampaignInfoCard modal
    return; // Stop execution, do not proceed with LLM call
  }

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

  // Check if the campaign is expired
    if (currentCalendarDaysLeft === null || currentCalendarDaysLeft < 0) {
    console.log('Campaign expired or days left is null/negative. Showing CampaignInfoCard modal.');
    setShowCampaignInfoModal(true); // Set state to show the CampaignInfoCard modal
    return; // Stop execution, do not proceed with LLM call
  }

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

     // Check if the campaign is expired
    if (currentCalendarDaysLeft === null || currentCalendarDaysLeft < 0) {
    console.log('Campaign expired or days left is null/negative. Showing CampaignInfoCard modal.');
    setShowCampaignInfoModal(true); // Set state to show the CampaignInfoCard modal
    return; // Stop execution, do not proceed with LLM call
  }
  
  
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

//------------------------ Start handle upload image to attach to post ------------------ //

// New handleUploadImage function
  {/*const handleUploadImage = async (content: CalendarContent) => {
  // Check for connected social accounts first
  const socials = await checkConnectedSocials();

  if (!socials || (!socials.bluesky && !socials.linkedin && !socials.twitter)) {
    setShowNoSocialModal(true);
    return;
  }

  setUploadingImageId(content.id); // Set loading state for this specific post
  fileInputRef.current?.click(); // Trigger the hidden file input click
};*/}

// New handleUploadImage function
const handleUploadImage = async (content: CalendarContent) => {

   // Check if the campaign is expired
    if (currentCalendarDaysLeft === null || currentCalendarDaysLeft < 0) {
    console.log('Campaign expired or days left is null/negative. Showing CampaignInfoCard modal.');
    setShowCampaignInfoModal(true); // Set state to show the CampaignInfoCard modal
    return; // Stop execution, do not proceed with LLM call
  }
  
  const socials = await checkConnectedSocials();

  if (!socials || (!socials.bluesky && !socials.linkedin && !socials.twitter)) {
    setShowNoSocialModal(true);
    return;
  }

  setUploadingImageId(content.id);

  const fileInput = fileInputRef.current;
  if (!fileInput) {
    setUploadingImageId(null);
    return;
  }

  const currentPostIdForUpload = content.id;

  const handleWindowFocusBack = () => {
    setTimeout(() => {
      if (uploadingImageId === currentPostIdForUpload) {
        setUploadingImageId(null);
        if (fileInput) {
          fileInput.value = '';
        }
      }
      window.removeEventListener('focus', handleWindowFocusBack);
    }, 100);
  };

  window.addEventListener('focus', handleWindowFocusBack);

  fileInput.click();
};

// New handleFileChange function
const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !uploadingImageId) {
    setUploadingImageId(null);
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('User not authenticated.');
    }

    const imageUrl = await uploadImageGetUrl(file, session.user.id);

    const { error: updateError } = await supabase
      .from('content_calendar')
      .update({ photo_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', uploadingImageId);

    if (updateError) {
      throw new Error('Failed to save image URL to database.');
    }

    setCalendarContent(prev =>
      prev.map(item =>
        item.id === uploadingImageId ? { ...item, photo_url: imageUrl } : item
      )
    );

  } catch (err) {
    setUploadingImageId(null);
  } finally {
    setUploadingImageId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
};  


//------------------------ End handle upload image to attach to post --------------------//  

//------------------------ start handle delete photo ----------------------------//

// New handleDeleteImage function
const handleDeleteImage = async (content: CalendarContent) => {
  if (!content.photo_url) {
    console.warn('No image URL found for this post to delete.');
    return;
  }

  setDeletingImageId(content.id); // Set loading state for this specific post

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('User not authenticated.');
    }

    // Extract the file path from the public URL
    // Assuming the public URL format is: https://<supabase_url>/storage/v1/object/public/user-post-images/user_id/filename.jpg
    // And deletePostImage expects: user_id/filename.jpg
    const urlParts = content.photo_url.split('/public/user-post-images/');
    if (urlParts.length < 2) {
      throw new Error('Invalid image URL format for deletion.');
    }
    const filePath = urlParts[1]; // This should be 'user_id/filename.jpg'

    // Delete the image from Supabase storage
    await deletePostImage(filePath);

    // Update the content_calendar table, setting photo_url to null
    const { error: updateError } = await supabase
      .from('content_calendar')
      .update({ photo_url: null, updated_at: new Date().toISOString() })
      .eq('id', content.id);

    if (updateError) {
      console.error('Error updating photo_url to null in Supabase:', updateError);
      throw new Error('Failed to remove image URL from database.');
    }

    // Optimistically update the local state
    setCalendarContent(prev =>
      prev.map(item =>
        item.id === content.id ? { ...item, photo_url: null } : item
      )
    );

    console.log('Image deleted and URL removed from database.');

  } catch (err) {
    console.error('Error during image deletion process:', err);
    // Handle error (e.g., show a toast notification)
  } finally {
    setDeletingImageId(null); // Clear loading state
  }
};
 
//----------------------- end handle delete photo ------------------------------//  

  

  //----------------------- Start Copy Entire Content Campaign -----------------------------//

    const handleDuplicateCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email || !session?.user?.id) {
        throw new Error('No authenticated user found');
      }

      // 1. Fetch Original Calendar Details
      const { data: originalCalendar, error: originalCalendarError } = await supabase
        .from('calendar_questions')
        .select('*')
        .eq('calendar_name', calendarName)
        .eq('email', userEmail)
        .single();

      if (originalCalendarError || !originalCalendar) {
        throw new Error('Original calendar not found or database error.');
      }

      // 2. Generate New Calendar Name
      let newCalendarName = `${calendarName} - copy`;
      let copyIndex = 1;
      let nameExists = true;

      while (nameExists) {
        const { data: existingCopies, error: checkError } = await supabase
          .from('calendar_questions')
          .select('calendar_name')
          .eq('calendar_name', newCalendarName)
          .eq('email', userEmail);

        if (checkError) throw checkError;

        if (existingCopies && existingCopies.length > 0) {
          copyIndex++;
          newCalendarName = `${calendarName} - copy ${copyIndex}`;
        } else {
          nameExists = false;
        }
      }

      // 3. Determine New Dates
      const newStartDate = new Date(); // Today's date
      const originalStartDate = parseISO(originalCalendar.start_date);
      const originalEndDate = parseISO(originalCalendar.end_date);
      const originalDurationDays = differenceInDays(originalEndDate, originalStartDate);
      const newEndDate = addDays(newStartDate, originalDurationDays);

      // 4. Insert New Calendar Record
      const { data: newCalendarRecord, error: newCalendarError } = await supabase
        .from('calendar_questions')
        .insert({
          email: userEmail,
          user_id: session.user.id,
          calendar_name: newCalendarName,
          calendar_description: originalCalendar.calendar_description,
          target_audience: originalCalendar.target_audience,
          social_goals: originalCalendar.social_goals,
          core_services: originalCalendar.core_services,
          start_date: format(newStartDate, 'yyyy-MM-dd'),
          end_date: format(newEndDate, 'yyyy-MM-dd'),
          active: true, // New copy is active by default
          deleted: false, // New copy is not deleted
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (newCalendarError || !newCalendarRecord) {
        throw new Error('Failed to create new calendar record.');
      }

      // 5. Fetch Original Content Records
      const { data: originalContent, error: originalContentError } = await supabase
        .from('content_calendar')
        .select('*')
        .eq('calendar_name', calendarName)
        .eq('email', userEmail);

      if (originalContentError || !originalContent) {
        throw new Error('Failed to fetch original content records.');
      }

      // 6. Prepare New Content Records
      const newContentRecords = originalContent.map(item => {
        const dayOffset = differenceInDays(parseISO(item.content_date), originalStartDate);
        const newContentDate = addDays(newStartDate, dayOffset);
        const newDayOfWeek = format(newContentDate, 'EEEE');

        return {
          email: userEmail,
          user_id: session.user.id,
          calendar_name: newCalendarName, // Assign new calendar name
          description: item.description,
          user_handle: item.user_handle,
          user_display_name: item.user_display_name,
          day: item.day,
          day_of_week: newDayOfWeek, // Recalculate day of week
          theme: item.theme,
          topic: item.topic,
          call_to_action: item.call_to_action,
          notes: item.notes,
          content: item.content,
          content_date: format(newContentDate, 'yyyy-MM-dd'), // Assign new content date
          photo_url: item.photo_url, // Include photo_url in duplicated content
          created_at: new Date().toISOString(), // Set new creation timestamp
          updated_at: new Date().toISOString(),
        };
      });

      // 7. Insert New Content Records (Batch Insert)
      const { error: newContentError } = await supabase
        .from('content_calendar')
        .insert(newContentRecords);

      if (newContentError) {
        throw new Error('Failed to insert new content records.');
      }

      // 8. Success Feedback and UI Refresh
      //alert(`Calendar "${newCalendarName}" and its content duplicated successfully!`);
      // Assuming these functions are available to refresh the UI
      // You might need to pass them as props from the parent (ViewCalendars.tsx)
      // or use a global state management solution.
      if (typeof fetchCalendarList === 'function') fetchCalendarList();
      if (typeof fetchCalendarContent === 'function') fetchCalendarContent();

        // a. Show the notification
      setIsCopySuccessModalOpen(true);

      // b. Set a timeout to hide the notification after 3 seconds
    setTimeout(() => {
      setIsCopySuccessModalOpen(false);
    }, 3000); // Notification will be visible for 3 seconds

    } catch (err: any) {
      console.error('Error duplicating calendar:', err.message);
      setError(`Failed to duplicate calendar: ${err.message}`);
      alert(`Error duplicating calendar: ${err.message}`); // Simple alert for now
    } finally {
      setLoading(false);
    }
  };

// --- Logic to determine the tooltip message ---
  const duplicateTooltipText =
    currentCalendarDaysLeft !== null && currentCalendarDaysLeft > 0
      ? `⚡Duplicate once expired - ${currentCalendarDaysLeft} Day${currentCalendarDaysLeft === 1 ? '' : 's'}`
      : '⚡Copy this Calendar'; // Original message when enabled or no days left

// Function to determine the tooltip message for the "Next" button
const getScheduleButtonTooltip = () => {
  if (currentCalendarDaysLeft !== null && currentCalendarDaysLeft > 0) {
    return "⚡ Bulk Schedule All Posts";
  }
  if (currentCalendarDaysLeft === null || currentCalendarDaysLeft < 0) {
    return "⚡ Disabled on Expired Calendars";
  }
  // If none of the above conditions are met, the button should be enabled, so no tooltip needed for disabled state.
  return "";
};
  

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
                  //onClick={handleBackToCalendarList}
                  onClick={handleShowCampaignList}
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
      <div className="bg-gradient-to-r from-white via-white via-blue-50 to-blue-100 border-1 border-transparent rounded-xl p-6 shadow-sm">

      {/* Add the X button here */}
            <div className="flex justify-start mb-4 mt-[-16px]">
                <button
                    //onClick={handleBackToCalendarList} 
                    onClick={handleShowCampaignList}
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
    This Week's Posts
  </button>
  <button
    onClick={() => setTimeFilter('next-week')}
    className={`px-4 py-1.5 rounded-full text-xs transition-colors ${
      timeFilter === 'next-week'
        ? 'bg-blue-500 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    Next Week's Posts
  </button>
  <button
    onClick={() => setTimeFilter('all')}
    className={`px-4 py-1.5 rounded-full text-xs transition-colors ${
      timeFilter === 'all'
        ? 'bg-blue-500 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    View All Posts
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
<TooltipHelp  text = {getScheduleButtonTooltip()}>
 <button
    onClick={handleOpenBulkAddToCalendarModal}
    disabled = {currentCalendarDaysLeft === null || currentCalendarDaysLeft <= 0}
    className={`flex  items-center px-4 py-2 space-x-2 rounded-md text-sm transition-colors ${
      currentCalendarDaysLeft === null || currentCalendarDaysLeft < 0 ? 'opacity-50 cursor-not-allowed' :
      timeFilter === 'all'
        ? 'bg-blue-50 text-blue-500'
        : 'bg-blue-50 text-blue-500 hover:bg-blue-100'
    }`}
  >
 <PlusCircle className="h-4 w-4 mr-2"/>
    Schedule All
  </button>          
</TooltipHelp>
  
  
{/* New Duplicate Button */}

<TooltipHelp text={duplicateTooltipText}>
            <button
              onClick={handleDuplicateCalendar}
              // Disable if currentCalendarDaysLeft is greater than 0
              disabled={currentCalendarDaysLeft !== null && currentCalendarDaysLeft > 0}
              className={`flex items-center px-4 py-2 space-x-2 rounded-md text-sm transition-colors ml-2
                       bg-gray-100 text-gray-600 hover:bg-gray-200 ${
                         currentCalendarDaysLeft !== null && currentCalendarDaysLeft > 0 ? 'opacity-50 cursor-not-allowed' : ''
                       }`}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate All
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

 {/*---- start added image Hidden file input ------ */}
 <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept="image/*" // Only allow image files
      />        
{/*---- end added image Hidden file input ------*/}

        
 {showCampaignInfo && filteredContent.length === 0 && ( // Only show if showCampaignInfo is true AND there's no actual content yet
        <CampaignInfoCard
          key="campaign-info-card-setup" // It's important to give a unique key
          campaignName={calendarName}
          onCreateNewCampaign={handleCreateNewCampaign}
        />
      )}

{/*       
{showCampaignInfo && filteredContent.length === 0 && (
      <CampaignInfoModal
          isOpen={showCampaignInfoModal}
          onClose={handleCloseCampaignInfoModal}
          campaignName={calendarName}
          //onCreateNewCampaign={handleCreateNewCampaignFromModal}
      />
  )}
  */}
          
        
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

     <TooltipHelp  text = "Add Image">
               <button
                    onClick={() => handleUploadImage(content)} // Call the new handleUploadImage function
                    disabled={uploadingImageId === content.id} // Disable if this post is uploading
              className="inline-flex items-center px-1 py-1 bg-gray-100 text-gray-400 rounded-md hover:bg-gray-100 hover:text-gray-300 transition-colors"
          >
                  {uploadingImageId === content.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ImagePlus className="w-3 h-3" />
                      )}
                 
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

   {/* ----------------- Start Display the image if photo_url exists --------------- */}
        {/*content.photo_url && (
          <div className="mt-4">
            <img src={content.photo_url} alt="Post attachment" className="max-w-full h-auto rounded-md" />
          </div>
        )*/}
  {/* ----------------- Start Display the image if photo_url exists --------------- */}
{content.photo_url && (
  <div className="mb-8 group relative w-full h-auto max-w-sm mx-auto">
    <img
      src={content.photo_url}
      alt="Post attachment"
      className="max-w-full h-auto rounded-md transition-opacity duration-300 group-hover:opacity-50"
    />

    <div
      className="
        absolute inset-0
        flex items-center justify-center
        bg-black bg-opacity-50
        opacity-0
        group-hover:opacity-100
        transition-opacity duration-300
        rounded-md
      "
    >
      <button
        type="button"
        //onClick={handleDeleteImage}
        onClick={() => handleDeleteImage(content)}
        className="
          bg-red-600 text-white px-4 py-2 rounded-lg
          hover:bg-red-700 transition-colors
          text-sm font-semibold
        "
        // disabled={deletingImage}
      >
        Delete Photo
      </button>
    </div>
  </div>
)}
    
{/* ---------------- End Added Display Image if photo_url exists ----------------- */}


  
      </div>
            
    <div className="absolute bottom-2 left-2 flex items-center space-x-2 ml-1">
        
          <div className="space-x-2 flex-wrap">

            {/*<TooltipHelp  text = "⚡LinkedIn Max Limit 600 ">*/}
          <TooltipHelp  text = {`⚡${content.content.length}/600 chars`}>
       <div className={`items-center space-x-1 text-xs text-blue-500 rounded-full p-1.5 inline-flex items-left
              ${content.content.length > 600 ? 'bg-red-50' : 'bg-gray-100'
              }`}>
              
              {/*{content.call_to_action}*/}
              <img src={LinkedInLogo} className="w-3 h-3" />
              <span className={`text-xs ${
              content.content.length > 600 ? 'text-red-300 hover:text-red-400' : 'text-gray-400 hover:text-gray-500'
              }`}>
                {(600 - content.content.length)} chars
                </span>
            </div>
            </TooltipHelp>

            <TooltipHelp  text = {`⚡${content.content.length}/300 chars`}>
             <div className={`items-center space-x-1 text-xs text-blue-500 rounded-full p-1.5 inline-flex items-left
              ${content.content.length > 300 ? 'bg-red-50' : 'bg-gray-100'
              }`}>
              
              {/*{content.call_to_action}*/}
               <img src={BlueskyLogo} className="w-3 h-3" />
              <span className={`text-xs ${
              content.content.length > 300 ? 'text-red-300 hover:text-red-400' : 'text-gray-400 hover:text-gray-500'
              }`}>
              {(300 - content.content.length)} chars
                </span>
            </div>
            </TooltipHelp>

            <TooltipHelp  text = {`⚡${content.content.length}/280 chars`}>
             <div className={`items-center space-x-1 text-xs text-blue-500 rounded-full p-1.5 inline-flex items-left
              ${content.content.length > 280 ? 'bg-red-50' : 'bg-gray-100'
              }`}>
              
              {/*{content.call_to_action}*/}
              <img src={XLogo} className="w-3 h-3" />
              <span className={`text-xs ${
              content.content.length > 280 ? 'text-red-300 hover:text-red-400' : 'text-gray-400 hover:text-gray-500'
              }`}>
                {(280 - content.content.length)} chars
                </span>
            </div>
            </TooltipHelp>


            
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



{isCopySuccessModalOpen ? (
  <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-green-100 p-4 flex items-center space-x-3 animate-fade-in z-[9999]">
    <div className="bg-green-100 rounded-full p-2">
      <Check className="w-5 h-5 text-green-500" />
    </div>
    <div>
      <p className="font-medium text-gray-900">Calendar Created Successfully</p>
      <p className="text-sm text-gray-500">
        Calendar has now been activated and ready to go! 
      </p>
    </div>
  </div>
) : null}     


{showCampaignInfo && filteredContent.length === 0 || (currentCalendarDaysLeft === null || currentCalendarDaysLeft < 0) && (
      <CampaignInfoModal
          isOpen={showCampaignInfoModal}
          onClose={handleCloseCampaignInfoModal}
          campaignName={calendarName}
          //onCreateNewCampaign={handleCreateNewCampaignFromModal}
      />
  )}
      
    </div>


      
  );
}
export default ShowCalendarContent;