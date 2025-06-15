//import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { PlusCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateCalendar, generateListPost } from '../lib/gemini';
import { useAuthStore } from '../auth';
import { 
  Calendar, Edit2, Sparkles, X, ArrowLeft, CalendarPlus,
  ChevronLeft, ChevronRight, 
  Loader2, Save, RefreshCw, CalendarCheck, Copy, ListOrdered, List, PartyPopper, Megaphone, ListChecks, LineChart, CalendarSearch, Search
} from 'lucide-react';
import { CreateCalendarForm } from '/src/components/CreateCalendarForm';
import { format } from 'date-fns';
import { ShowCalendarContent } from './ShowCalendarContent';
import { CalendarList } from './CalendarList';
import { CampaignSuccessfulModal } from './CampaignSuccessfulModal'
import { useSearchParams } from 'react-router-dom';


interface ViewCalendarProps {
  //onCreateCalendarClick: () => void;
}

interface CalendarContent {
  id: string;
  theme: string;
  topic: string;
  content: string;
  call_to_action: string;
  day_of_week: string;
  day: number;
  user_handle: string;
  user_display_name: string;
  calendar_name: string;
  description: string;
  created_at: string;
  target_audience: string;
  updated_at: string;
  content_date: string
}

interface ContentModalProps {
  content: CalendarContent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedContent: CalendarContent) => Promise<void>;
  setOptimisticContent: React.Dispatch<React.SetStateAction<CalendarContent[]>>;
}

interface CalendarListProps {
    calendars: {
        calendar_name: string;
        description: string;
        active: boolean;
        social_goals: string[];
        target_audience: string;
    }[];
    onToggleActive: (calendarName: string, active: boolean, userHandle: string | undefined, refreshLists: () => Promise<void>) => Promise<void>;
    user: { handle: string } | null | undefined;
    fetchCalendarList: () => Promise<void>;
    fetchCalendarContent: () => Promise<void>;
    showOnlyActive?: boolean;
}

interface CalendarListData {
  calendar_name: string;
  description: string;
  active: boolean;
  social_goals: string[];
  target_audience: string;
}

interface LineProgressProps {
  currentLength: number;
  maxLength: number;
}

//function ViewCalendars() {
// Main Calendar Component

export function ViewCalendars({ onCreateCalendarClick }: ViewCalendarProps) {
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [calendarContent, setCalendarContent] = useState<CalendarContent[]>([]);
  const [calendarCompleteList, setCalendarCompleteList] = useState<CalendarContent[]>([]);
  const [calendarList, setCalendarList] = useState<CalendarListData[]>([]);
  const [calendarListLoading, setCalendarListLoading] = useState(true);
  const [calendarListError, setCalendarListError] = useState<string | null>(null);
  const [showCalendars, setShowCalendars] = useState(false);  
  const [updatingContent, setUpdatingContent] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [optimisticContent, setOptimisticContent] = useState<CalendarContent[]>([]);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<CalendarContent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  //const { user } = useAuthStore();
  const [isCreateCalendarFormOpen, setIsCreateCalendarFormOpen] = useState(false);
  const [isCampaignSuccessModalOpen, setIsCampaignSuccessModalOpen] = useState(false);
  const [createdCampaignName, setCreatedCampaignName] = useState('');
  const [searchParams] = useSearchParams();
  const selectedCalendarFromUrl = searchParams.get('calendar');
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(selectedCalendarFromUrl);
  const [showCampaignList, setShowCampaignList] = useState(false);


// function to determine email for use in the component
  const fetchUserIdAndEmail = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userEmail = session.user.email;
      const userId = session.user.id;
      setCurrentUserEmail(userEmail);
      setCurrentUserId(userId);
    } else {
      console.warn('No user found in session.');
      setCurrentUserEmail(null);
      setCurrentUserId(null);
    }
  } catch (error) {
    console.error('Error fetching user session:', error);
    setCurrentUserEmail(null);
    setCurrentUserId(null);
  }
};

  useEffect(() => {
    setSelectedCalendar(searchParams.get('calendar'));
  }, [searchParams]);  

useEffect(() => {
  fetchUserIdAndEmail();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    fetchUserIdAndEmail();
  });

  return () => {
    subscription?.unsubscribe();
  };
}, []);

  // Add UseEffect to call fetchCalendarList and fetchCalendarContent with currentUserEmail
  useEffect(() => {
  if (currentUserEmail) {
    fetchCalendarList();
    fetchCalendarContent(); 
  }
}, [currentUserEmail]);


// Add this useEffect within your ViewCalendars component, after your state declarations
useEffect(() => {
    if (!calendarListLoading && currentUserEmail && !isCreateCalendarFormOpen && !selectedCalendar && !isCampaignSuccessModalOpen) {
        if (calendarList.length > 0) {
            setShowCampaignList(true); // Automatically show the list if calendars exist
        } else {
            setShowCampaignList(false);
        }
    }
}, [calendarListLoading, calendarList.length, currentUserEmail, isCreateCalendarFormOpen, selectedCalendar, isCampaignSuccessModalOpen]);  
  
  
  const handleCreateCalendarClick = () => {
    console.log('Create Campaign button clicked in ViewCalendars!');
    setIsCreateCalendarFormOpen(true);
  };

  const handleCloseCreateCalendarForm = () => {
    setIsCreateCalendarFormOpen(false);
  };

const handleShowCalendars = () => {
  setShowCalendars(prev => !prev); // Toggle the state
};


  
const fetchCalendarList = async () => {
  try {
    setCalendarListLoading(true);
    setCalendarListError(null);

    const { data: calendarData, error: calendarError } = await supabase
      .from('calendar_questions')
      .select(`
        calendar_name,
        calendar_description,
        active,
        social_goals,
        target_audience,
        end_date
      `)
      .eq('email', currentUserEmail)
      .eq('deleted', false)
      .order('active', { ascending: false });

        //console.log("calendarData:", calendarData);
        //console.log("user?.handle:", user?.handle);
    
        if (calendarError) {
            console.error("calendarError:", calendarError);
            throw calendarError;
        }

    setCalendarList(calendarData.map(calendar => ({
      calendar_name: calendar.calendar_name,
      description: calendar.calendar_description,
      end_date: calendar.end_date,
      active: calendar.active || false,
      social_goals: Array.isArray(calendar.social_goals) ? calendar.social_goals : [],
      target_audience: calendar.target_audience || ''
    })));
     console.log('how many calendars: ', calendarList.length );

  } catch (err) {
    console.error('Error fetching calendar list:', err);
    setCalendarListError('Failed to load calendar list');
  } finally {
    setCalendarListLoading(false);
  }
};  
  
const fetchCalendarContent = async () => {
  try {
    setLoading(true);

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user found');
      }


    // Fetch calendar content from content_calendar
    const { data: contentData, error: contentError } = await supabase
      .from('content_calendar')
      .select('*')
      .eq('email', session.user.email)
      .order('day', { ascending: true });

    if (contentError) throw contentError;

    // Fetch active status and target_audience from calendar_questions
    const calendarDataPromises = contentData.map(async (content) => {
      const { data: questionData, error: questionError } = await supabase
        .from('calendar_questions')
        .select('target_audience, active')
        .eq('calendar_name', content.calendar_name)
        .eq('email', currentUserEmail)
        .maybeSingle()
        //.single();

      if (questionError) {
        console.error('Error fetching calendar data:', questionError);
        return { ...content, target_audience: '', active: false }; // Default to inactive on error
      }

      return {
        ...content,
        target_audience: questionData?.target_audience || '',
        active: questionData?.active || false, // Default to inactive if null
      };
    });

    const calendarDataWithInfo = await Promise.all(calendarDataPromises);
    setCalendarCompleteList(calendarDataWithInfo);
    console.log('how many days of content: ', calendarCompleteList.length )
    // Filter out inactive calendars
    const activeCalendarContent = calendarDataWithInfo.filter((calendar) => calendar.active);

    setCalendarContent(activeCalendarContent);
  } catch (err) {
    console.error('Error fetching calendar content:', err);
    setError('Failed to load calendar content');
  } finally {
    setLoading(false);
  }
};

const handleToggleActive = async (
    calendarName: string,
    active: boolean,
    email: string | null,  // Change from userHandle to email
    refreshLists: () => Promise<void>
) => {
    try {
        // Update the active status in calendar_questions table
        const { error } = await supabase
            .from('calendar_questions')
            .update({ active })
            .eq('calendar_name', calendarName)
            .eq('email', email); 

        if (error) throw error;

        await refreshLists();

    } catch (err) {
        console.error('Error toggling calendar active status :', err);
        // Optionally show error notification
    }
};

const handleBackToList = () => {
  // Reset selected calendar
  setSelectedCalendar(null);
  
  // Show the campaign list view
  setShowCampaignList(true);
  
  // Reset any other relevant states
  setIsCreateCalendarFormOpen(false);
  
  // Optionally refresh the calendar list
  if (currentUserEmail) {
    fetchCalendarList();
    fetchCalendarContent();
  }
};  
  
const handleCloseCampaignList = () => {
  setShowCampaignList(false);
};  

const handleCampaignSuccess = (campaignName: string) => {
  setCreatedCampaignName(campaignName);
  setIsCampaignSuccessModalOpen(true);
  setIsCreateCalendarFormOpen(false);
  setSelectedCalendar(campaignName);
  setShowCampaignList(false);
  fetchCalendarList();
};  
  
const handleViewCalendarList = () => {
  // Reset states
  setIsCreateCalendarFormOpen(false);
  setShowCampaignList(true); // Show the campaign list
  
  // Optionally refresh data
  if (currentUserEmail) {
    fetchCalendarList();
    fetchCalendarContent();
  }
};
  
 return (
    <div className="p-4">
      <div className="max-w-8xl mx-auto">

        {/* ------------------------------------------------------------- */}
        {/* MODIFIED HEADER SECTION - Ensure it hides when other views are active */}
        {/* ------------------------------------------------------------- */}
        {!(isCreateCalendarFormOpen || showCampaignList || selectedCalendar || isCampaignSuccessModalOpen) && (
          <div className="flex items-center space-x-2 mb-8">
            <div className="p-2 bg-blue-100 rounded-md">
              <Megaphone className="w-5 h-5 text-blue-500"/>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">View Campaigns</h2>
          </div>
        )}

        {/* Start inside the white border p-12 is height */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className={`flex items-center justify-center border-1 border border-white rounded-lg ${
            isCreateCalendarFormOpen || showCampaignList || selectedCalendar || isCampaignSuccessModalOpen || calendarListLoading ? 'min-h-[300px]' : 'h-80'
          }`}>
            <div className="text-center w-full">

              {/* Conditional rendering for content */}
              {calendarListLoading ? (
                // 1. Show loader while fetching calendar list
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : calendarListError ? (
                // 2. Show error if fetching failed
                <div className="text-red-500 text-center py-4">{calendarListError}</div>
              ) : isCreateCalendarFormOpen ? (
                // 3. Render CreateCalendarForm if active
                <div className="mt-6 w-full h-full flex flex-col">
                  <div className="flex-grow">
                    <CreateCalendarForm
                      onSuccess={handleCampaignSuccess} // Use the new handler
                      onClose={handleCloseCreateCalendarForm}
                    />
                  </div>
                </div>
              ) : selectedCalendar && currentUserEmail ? (
                // 4. Render ShowCalendarContent if a specific calendar is selected
                <div className="mt-8 w-full">
                  <ShowCalendarContent
                    calendarName={selectedCalendar}
                    userEmail={currentUserEmail}
                    onBackToList={handleBackToList}
                  />
                </div>
              ) : showCampaignList ? (
                // 5. Render CalendarList if showCampaignList is true (automatically set by useEffect)
                <div className="mt-6 w-full h-full flex flex-col">
                  <div className="flex-grow">
                    {/*
                    <div className="flex items-center mt-4 mb-6 ml-6">
                      
                      <button
                        onClick={() => setShowCampaignList(false)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        title="Hide Campaigns List"
                      >
                        <ArrowLeft className="w-5 h-5 text-gray-500"/>
                      </button>
                    </div>
                    */}
                    <div className="flex-grow overflow-y-auto">
                      <CalendarList
                        calendars={calendarList}
                        onToggleActive={handleToggleActive}
                        currentUserEmail={currentUserEmail}
                        fetchCalendarList={fetchCalendarList}
                        fetchCalendarContent={fetchCalendarContent}
                        onSelectCalendar={(calendarName) => {
                          setSelectedCalendar(calendarName);
                          setShowCampaignList(false); // Hide the list when a calendar is selected
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // 6. Default: No calendars found, no other views active, show "Create Campaign" prompt
                <>
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
                      <CalendarPlus className="w-12 h-12 font-light text-blue-500" />
                    </div>
                    <p className="text-gray-600 mb-3 mt-4">Get 2 Weeks of Content in minutes 🥳</p>
                    <p className="text-gray-400 mb-4 text-sm">Create your First content Campaign</p>
                    <button
                      onClick={handleCreateCalendarClick}
                      className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <PlusCircle className="w-5 h-5 mr-2" />
                      <span>Create Campaign</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {/* CampaignSuccessfulModal is typically rendered outside the main content box as it's a modal overlay */}
        {isCampaignSuccessModalOpen && (
          <div className="mt-8 w-full">
            <CampaignSuccessfulModal
              isOpen={isCampaignSuccessModalOpen}
              onClose={() => setIsCampaignSuccessModalOpen(false)}
              campaignName={createdCampaignName}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewCalendars;