// src/components/ShowCalendarContent.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { Calendar, CalendarCheck, Edit2, Copy, Loader2, Megaphone, ArrowLeft, X, Sparkles, SquarePen, Send, Clock, PlusCircle, CheckCircle, Heart } from 'lucide-react';
import { generateListPost, generateHookPost, generateHookPostV2 } from '../lib/gemini';
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
  const [hooksData, setHooksData] = useState<string[]>([]);
  const [isHooksLoading, setIsHooksLoading] = useState(false); // New loading state for hooks
  const [hooksError, setHooksError] = useState<string | null>(null); // New error state for hooks

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

 const hardcodedHooksString = `
- Want [Target audience goal/desire] This is how [my service/product/community] can help you: 
- What [beneficial outcome] looks like in [specific situation]. 
- Looking to [benefit] without [hassle]? 
- The [X] worst [topic] mistakes you can make. 
- I can't believe this [tactic/tip/strategy] actually works! 
- How [person/brand] [action] and how we can do the same! 
- I'm tired of hearing about [trend]. 
- What's your biggest challenge with [activity]? 
- How [person/brand] went from [situation] to [results]. 
- What are your thoughts on [topic/trend]? 
- [X] strategies to [goal]. 
- I [feeling] when I saw the results my clients/customers got from [activity]! 
- Wow! I can't believe the impact my [product, service, etc.] has had on [target audience]. 
- [Achievement]. If I could start from scratch, here's what I'd do differently. 
- Don't [take action] until you read this! 
- Don't fall for it - [X] myths about [topic]. 
- The [Number] trends that are shaking up the [topic] industry! 
- Here are [X] mistakes I made when [activity]. 
- Success story from one of my [niche clients] who [specific goal]. 
- [X] reasons why [topic] is [adjective]. 
- Tired of [problem]? Try this. 
- I don't believe in [commonly held belief]. 
- Don't let anyone tell you [X]. 
- Improve your [topic/skill] with one simple tactic 
- Stop [activity]. It doesn't work. 
- I don't think [activity] is worth the effort. 
- If you want to [desired result] try this. (Guaranteed results!) 
- The most underestimated [topic] strategy! 
- [X] things I wish I knew before [activity]: 
- I never expected [result]. Here's the full story. 
- Don't make this [topic] mistake when trying to [outcome]. 
- The [adjective] moment I realized [topic/goal]. 
- What do you think is the biggest misconception about [topic/trend]? 
- [X] signs that it's time to [take action]. 
- The truth behind [topic] - busting the most common myths. 
- The most important skill for [life situation]. 
- Don't get fooled - not everything you hear about [topic] is true. 
- [Failure]. Here's what I learned. 
- How I [achieved goal] In [specific time period]. 
- Trying to [outcome] in [difficulty]? 
- Top [X] reasons why [topic] is not working for you. 
- You won't believe these [number] statistics about [topic]. 
- I guarantee that if you do this, you’ll [desired result]. 
- How to make [topic] work for you. 
- [Achievement], here's what I learned about [segment] 
- Don't take my word for it - [insert social proof]. Here's how they did it: 
- [Activity] is overrated. 
- How [activity] is holding you back in [situation]. 
- [Statistics]. Here's what this means for your business. 
- They said it couldn't be done, but [insert what was accomplished]. 
- What's your best tip for [activity]? I'll start: 
- Special discount offer: Get [name of the product/service] for [discounted price] TODAY! 
- [X] [adjective] Ways To Overcome [issue]. 
- The one lesson I learned when [action]. 
- Do you think [topic] is [X]? Think again! 
- Hurry! [Name of the product/service] sale ends soon! 
- Do you want a [name/topic] template for free? 
- The [X] trends in [topic] that you need to watch out for. 
- Get [name of the product/service] now and be a part of [something special] 
- Make [outcome] happen in [time]. 
- I [action/decision] and it changed everything. 
- Top [number] lessons from [person/brand] to [action]. 
- I use this [name/topic] template to get [results] 
- [Activity] is way better than [activity]. 
- [X] simple ways to [action]. 
- What [target audience] MUST consider before [action]. 
- Here's why every [target audience] should care about [topic]. 
- How to use [resource] for maximum [outcome]. 
- [X] [topic] stats that'll blow your mind! 
- What no one tells you about [topic]. 
- If you are [target audience] looking to [outcome], this post is for you! 
- The most [adjective] thing that happened when I tried [strategy/tactic]. 
- You won't believe what [target audience] are saying about [product, service, etc.]! 
- How to [action] without sacrificing [activity]. 
- [X] [topic] mistakes you MUST avoid at all costs! 
- [Customer Review] 
- Try this next time when you [scenario]: 
- How to [skill] like a [expert]. 
- How to [outcome] with little to no [resource]. 
- Why I stopped [activity]. 
- Here's why [topic] isn't working for you. 
- Crazy results my clients/customers got from [activity]: 
- [X] reasons you're not [actioning]. 
- So many [target audience] get this wrong… Here’s the truth. 
- [X] Hacks To [outcome]. 
- The truth about [trend]. 
- The SECRET to [desired outcome]. 
- The [topic] Bible: The most important things you need to know. 
- Why [topic] is essential for [target audience]. 
- Get [name of the product/service] now and join the thousands of [target audience] who have achieved [result]. 
- If you’re serious about [goal], you must do this! 
- Reminder: [opposite of limiting belief]. 
- The [Number] BIGGEST trends to look out for in the [topic] industry. 
- [X] signs that you need to [action]. 
- Why [topic] is the hottest trend of [year]. 
- The Definitive Guide To [topic]. 
- I tried [strategy/tactic/approach], and here's what happened. 
- [Number] signs that [topic/trend] is changing rapidly. 
- The Ultimate [topic] Cheat Sheet. 
- How to [outcome] the RIGHT way! 
- The [topic or action] guide that'll [outcome]. 
- Did you know that [statistics]? 
- [X] things I wish someone told me about [topic/goal].`

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


    useEffect(() => {
    const fetchHooks = async () => {
      if (!userEmail) return;

      setIsHooksLoading(true);
      setHooksError(null);

      try {
        // --- IMPORTANT NOTE: The 'content_hooks' table is NOT present in the provided database schema. ---
        // --- If you intend to store hooks in the database, you will need to create this table first. ---
        // --- This code assumes a 'content_hooks' table with a 'hooks' column exists. ---

        const { data, error } = await supabase
          .from('content_hooks')
          .select('hooks') // Assuming 'hooks' is a column containing an array of strings or a text field
          //.eq('user_email', userEmail) // Assuming hooks are user-specific
          .single(); // Assuming one row per user for hooks

        if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
          throw error; // Re-throw other errors
        }

        if (data && data.hooks) {
          // If 'hooks' column contains an array of strings (e.g., type text[])
          if (Array.isArray(data.hooks)) {
            setHooksData(data.hooks);
          } else if (typeof data.hooks === 'string') {
            // If hooks are stored as a single string (e.g., each hook on a new line), parse it
            setHooksData(data.hooks.split('\n').map(s => s.trim()).filter(s => s.length > 0));
          } else {
            console.warn('Fetched hooks data is not in expected array or string format:', data.hooks);
            setHooksData([]); // Fallback to empty array if format is unexpected
          }
        } else {
          // Fallback: If no hooks found in DB, or table doesn't exist, use hardcoded hooks
          console.warn('No hooks found in database. Using hardcoded hooks from gemini.ts as fallback.');
          setHooksData(hardcodedHooksString.split('\n').map(s => s.trim()).filter(s => s.length > 0));
        }
      } catch (err: any) {
        console.error('Error fetching hooks:', err);
        setHooksError(`Failed to load hooks: ${err.message}`);
        // Fallback to hardcoded hooks on error as well
        setHooksData(hardcodedHooksString.split('\n').map(s => s.trim()).filter(s => s.length > 0));
      } finally {
        setIsHooksLoading(false);
      }
    };

    fetchHooks();
  }, []); // No dependency on email Re-fetch if userEmail changes


  
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
                onClick={() => handleHookPostV2(content, 700)}
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
                onClick={() => handleHookPostV2(content, 300)}
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
                onClick={() => handleHookPostV2(content, 280)}
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
      {formatContentText(content.content).map((sentence, index) => (
    <p key={index} className="leading-relaxed mb-3">{sentence}</p>
      ))}         
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