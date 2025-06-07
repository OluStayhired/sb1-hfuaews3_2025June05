// src/components/UserDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  FileEdit, 
  CalendarSearch, 
  PlusCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  TrendingUp, 
  BarChart4, 
  CalendarDays,
  Loader2,
  Rocket,
  Sparkles,
  Flame,
  ArrowRight,
  CalendarCheck,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
//import { useNavigate } from 'react-router-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays, parseISO, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ScheduledPostsToday } from './ScheduledPostsToday';
import { DraftPostModal } from './DraftPostModal';
import { DraftPostModalDashboard } from './DraftPostModalDashboard';
import { FirstPostModal } from './FirstPostModal';
import { CalendarListSidePanel } from './CalendarListSidePanel';
import { WelcomeGuide } from './WelcomeGuide';
import { OnboardSuccessPage } from '../components/OnboardSuccessPage'; 
import { SaveAndClosePage } from './SaveAndClosePage';

interface DashboardMetrics {
  todayPosts: {
    total: number;
    disabled: number;
    scheduled: number;
    sent: number;
  };
  drafts: number;
  calendars: {
    total: number;
    active: number;
    inactive: number;
  };
  streak: number;
  nextWeekPosts: number;
}

interface WelcomeGuideCompleteData {
  status: 'success' | 'error' | 'info'; 
  selectedSocialChannel?: 'Bluesky' | 'Twitter' | 'LinkedIn'; 
  contentGenerated?: boolean;
  save_close: boolean; 
  postContent?: string; 
  first_post?: string; 
  postContentId?: string;
}

export function UserDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todayPosts: { total: 0, disabled: 0, scheduled: 0, sent: 0 },
    drafts: 0,
    calendars: { total: 0, active: 0, inactive: 0 },
    streak: 0,
    nextWeekPosts: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScheduledPostsOpen, setIsScheduledPostsOpen] = useState(false);
  const [isDraftPostsOpen, setIsDraftPostsOpen] = useState(false);
  const [isCalendarListOpen, setIsCalendarListOpen] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const navigate = useNavigate();
  const [isWelcomeGuideOpen, setIsWelcomeGuideOpen] = useState(false);
  const [firstPostContent, setFirstPostContent] = useState<string | null>(null);
  const [firstPostId, setFirstPostId] = useState<string | null>(null);

  // States for controlling these self-contained modals
  const [showOnboardSuccess, setShowOnboardSuccess] = useState(false);
  const [showSaveAndCloseSuccess, setShowSaveAndCloseSuccess] = useState(false);
  const [onboardSuccessPostContent, setOnboardSuccessPostContent] = useState<string | null>(null);
  const [saveAndClosePostContent, setSaveAndClosePostContent] = useState<string | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialChannelAccount[]>([]);
  const [selectedContentIdeaId, setSelectedContentIdeaId] = useState<string | null>(null); // To match selectedContentIdea prop
  const [currentPostIdeaRecord, setCurrentPostIdeaRecord] = useState<FirstPostIdeaRecord | null>(null); // To match postToUpdate prop
  const [isFirstPostModalOpen, setIsFirstPostModalOpen] = useState(false);


  // Define a consistent primary color for easy  changes
const PRIMARY_COLOR_CLASSES = {
  bg: 'bg-blue-600',
  text: 'text-blue-600',
  textLight: 'text-blue-500',
  border: 'border-blue-200',
  hoverBg: 'hover:bg-blue-700',
  gradientFrom: 'from-blue-500',
  gradientTo: 'to-blue-700',
};

const ACCENT_COLOR_CLASSES = {
  successBg: 'bg-emerald-500',
  successText: 'text-emerald-600',
  warningBg: 'bg-amber-500',
  warningText: 'text-amber-600',
};


  
useEffect(() => {
  const fetchInitialPost = async () => {
    setIsLoadingPost(true); // Set loading to true when starting the fetch

    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id; // Renamed to `currentUserId` to avoid confusion

    // --- Authentication Check ---
    if (!currentUserId) {
      console.warn('User not logged in or session expired. Cannot fetch initial post.');
      setIsWelcomeGuideOpen(true); // Open WelcomeGuide if no user is logged in
      setIsLoadingPost(false);
      return; // Exit the function early
    }

    // --- Fetch the user's latest 'first_post_idea' ---
    const { data: post, error } = await supabase
      .from('first_post_idea')
      .select('id, first_post, content, target_audience, in_progress, welcome_complete, save_close')
      .eq('user_id', currentUserId) // Use the defined `currentUserId` here
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 indicates no rows found
      console.error('Error fetching initial post:', error);
      setIsWelcomeGuideOpen(true); // Open WelcomeGuide on other errors
    } else if (post) {
      setCurrentPostIdeaRecord(post);
      setSelectedContentIdeaId(post.id);

      // Decide whether to open WelcomeGuide based on post status
      if (post.in_progress === true && post.welcome_complete === false) {

        console.log('UserDashboard: In-progress first post found. Treating as completed, showing success page.');
        setOnboardSuccessPostContent(post.first_post || null); // Pass content
        setShowOnboardSuccess(true);
        setIsWelcomeGuideOpen(false);

        const { error: updateError } = await supabase
          .from('first_post_idea')
          .update({ in_progress: false, welcome_complete: true })
          .eq('id', post.id);

        if (updateError) {
          console.error('UserDashboard: Error resetting in_progress/welcome_complete status after showing success:', updateError);
        } else {
          console.log('UserDashboard: in_progress/welcome_complete status reset for post ID after showing success:', post.id);
        }

      } else if (post.welcome_complete === true || post.save_close === true) {
        console.log('UserDashboard: Welcome flow already completed or saved and closed.');
        setIsWelcomeGuideOpen(false);
      } else {
        
        console.log('UserDashboard: Post found in unexpected state or not yet completed. Opening WelcomeGuide.');
        setIsWelcomeGuideOpen(true);
      }
    } else {
      console.log('UserDashboard: No post history found. Opening WelcomeGuide for a fresh start.');
      setIsWelcomeGuideOpen(true);
    }
    setIsLoadingPost(false); 
  };
  fetchInitialPost();
}, []);

// Initialize the hooks
const location = useLocation();
//const navigate = useNavigate();
const [searchParams] = useSearchParams();  

const twitterConnectedUser = connectedAccounts.find(acc => acc.social_channel === 'Twitter');  
const linkedinConnectedUser = connectedAccounts.find(acc => acc.social_channel === 'LinkedIn');  
const blueskyConnectedUser = connectedAccounts.find(acc => acc.social_channel === 'Bluesky'); 

// --------- Start Helper function to handle connection success flow (for URL params) -------- //
const handleConnectionSuccess = async (connectedChannel: string, contentFromModal?: string | null) => {
    console.log(`UserDashboard: Detected successful ${connectedChannel} connection.`);
    setIsLoadingPost(true); // Set loading state at the beginning

    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    try {
        let postContentToUse: string | null = null;
        let postIdToUpdate: string | null = null;

        if (contentFromModal !== undefined) { // Check if content was passed directly (from  Bluesky modal)
            postContentToUse = contentFromModal;
            console.log(`Using post content from modal for ${connectedChannel} connection.`);

        } else {
            // This path is for LinkedIn and Twitter  (via URL parameters)
            console.log(`Fetching post content for ${connectedChannel} connection from database.`);
            const { data: postToUpdate, error: fetchError } = await supabase
                .from('first_post_idea')
                .select('id, welcome_complete, first_post')
                .eq('user_id', currentUserId)
                .eq('welcome_complete', false) // Look for incomplete welcome flows
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error(`Error fetching post for welcome_complete update after ${connectedChannel} connection:`, fetchError);
            } else if (postToUpdate) {
                postContentToUse = postToUpdate.first_post || null;
                postIdToUpdate = postToUpdate.id; // Store ID for potential update

                const { error: updateError } = await supabase
                    .from('first_post_idea')
                    .update({ welcome_complete: true })
                    .eq('id', postIdToUpdate); // Update using the fetched ID

                if (updateError) {
                    console.error(`Error setting welcome_complete to true after ${connectedChannel} connection:`, updateError);
                } else {
                    console.log(`Successfully updated welcome_complete to true for post ID: ${postIdToUpdate}`);
                }
            } else {
                console.log(`No specific pending post found to mark welcome_complete after ${connectedChannel} connection (via URL param).`);
            }
        }

        // Set the content for the OnboardSuccessPage modal
        setOnboardSuccessPostContent(postContentToUse);

        // Show the success modal and close the WelcomeGuide modal
        setShowOnboardSuccess(true);
        setIsWelcomeGuideOpen(false);

    } catch (dbErr) {
        console.error(`Database error during welcome_complete update after ${connectedChannel} connection:`, dbErr);
    } finally {
        // Clear URL parameters ONLY if the connection came from URL (LinkedIn/Twitter)
        if (connectedChannel === 'LinkedIn' || connectedChannel === 'Twitter') {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('linkedin_connected');
            newSearchParams.delete('twitter_connected');
            newSearchParams.delete('context');
            newSearchParams.delete('oauth_error');
            navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
        }
        setIsLoadingPost(false); // End loading state
    }
};      
      // ---- End Handle Connection Success Function ------//  

// Consolidated function to check and load flow status
    const checkAndLoadFlowStatus = async () => {
        setIsLoadingPost(true);
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            console.warn('UserDashboard: No authenticated user found. Cannot check post status.');
            setIsLoadingPost(false);
            return;
        }

        const linkedInConnected = searchParams.get('linkedin_connected');
        const twitterConnected = searchParams.get('twitter_connected'); // <--- NEW: Get Twitter param
        const context = searchParams.get('context'); // Still retrieve to clear it
        const oauthError = searchParams.get('oauth_error');

        // --- HANDLE LINKEDIN OR TWITTER CONNECTION SUCCESS (from URL params) ---
        if (linkedInConnected === 'true' || twitterConnected === 'true') {
            await handleConnectionSuccess(linkedInConnected === 'true' ? 'LinkedIn' : 'Twitter');
            return; // Exit function after handling connection
        }

        // --- HANDLE OAUTH ERRORS (from URL params) ---
        if (oauthError) {
            console.error('UserDashboard: OAuth error detected:', oauthError);
            // You might want to display a user-friendly error message or toast here

            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('linkedin_connected');
            newSearchParams.delete('twitter_connected');
            newSearchParams.delete('context');
            newSearchParams.delete('oauth_error');
            navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });

            setIsLoadingPost(false);
            // Ensure WelcomeGuide is closed if there was an OAuth error
            setIsWelcomeGuideOpen(false); 
            return; // Exit function after handling error
        }

        // --- THIS BLOCK ONLY RUNS IF NO CONNECTION SUCCESS OR OAUTH ERROR WAS DETECTED IN URL PARAMS ---
        // This is for users returning to the dashboard where:
        // 1. There's an `in_progress` post (meaning they started the guide, generated post, but didn't finish via connection/save&close).
        // 2. Or, they are a genuinely new user with no post history.
        try {
            const { data: post, error } = await supabase
                .from('first_post_idea')
                .select('id, first_post, in_progress, welcome_complete')
                .eq('user_id', userId)
                .order('created_at', { ascending: false }) // Get the latest post
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('UserDashboard: Error fetching user post status:', error);
                setFirstPostContent(null);
                setFirstPostId(null);
                // If error, and no post, open WelcomeGuide for a fresh start
                setIsWelcomeGuideOpen(true); 
            } else if (post) {
                // If a post record exists, check its status
                if (post.in_progress === true && post.welcome_complete === false) {
                    // Scenario: User started guide, generated post, but didn't explicitly finish/connect.
                    // Based on your instruction: Treat this as "completed enough" to show success.
                    console.log('UserDashboard: In-progress first post found. Treating as completed, showing success page.');

                    setFirstPostContent(post.first_post); // Keep content for OnboardSuccessPage
                    setFirstPostId(post.id);

                    setShowOnboardSuccess(true); // <<< CHANGED: Show OnboardSuccessPage here
                    setIsWelcomeGuideOpen(false); // <<< CHANGED: Ensure WelcomeGuide is closed

                    setOnboardSuccessPostContent(post.first_post || null); // Pass content

                    // Update DB to mark as complete now
                    const { error: updateError } = await supabase
                        .from('first_post_idea')
                        .update({ in_progress: false, welcome_complete: true })
                        .eq('id', post.id);

                    if (updateError) {
                        console.error('UserDashboard: Error resetting in_progress/welcome_complete status after showing success:', updateError);
                    } else {
                        console.log('UserDashboard: in_progress/welcome_complete status reset for post ID after showing success:', post.id);
                    }
                } else if (post.welcome_complete === true || post.save_close === true) {
                    // Scenario: User completed the welcome flow (either connected or saved/closed).
                    // Do nothing, keep WelcomeGuide closed.
                    console.log('UserDashboard: Welcome flow already completed or saved and closed.');
                    setIsWelcomeGuideOpen(false);
                } else {
                    // Any other unexpected state of the post
                    console.log('UserDashboard: Post found in unexpected state. Opening WelcomeGuide for re-evaluation.');
                    setFirstPostContent(post.first_post); // Pre-fill if content exists
                    setFirstPostId(post.id);
                    setIsWelcomeGuideOpen(true); // Open guide to let user decide
                }
            } else {
                // Scenario: No post records found at all for this user.
                // This means it's a truly new user, so open the WelcomeGuide.
                console.log('UserDashboard: No post history found. Opening WelcomeGuide for a fresh start.');
                setFirstPostContent(null);
                setFirstPostId(null);
                setIsWelcomeGuideOpen(true); // <<< CHANGED: Ensure it opens for truly new users
            }
        } catch (fetchError) {
            console.error('UserDashboard: Unexpected error in fetching first post:', fetchError);
            setFirstPostContent(null);
            setFirstPostId(null);
            setIsWelcomeGuideOpen(true); // Fallback to opening if an unexpected error occurs
        } finally {
            setIsLoadingPost(false);
        }
    };

    useEffect(() => {
        checkAndLoadFlowStatus();
    }, [searchParams, location.pathname, navigate]);


// This is called when WelcomeGuide's internal actions like 'Save & Close' complete
  {/*
    const handleWelcomeGuideComplete = (dataFromGuide: { action: string; content?: string }) => {
        console.log('Welcome Guide completed with data:', dataFromGuide);
        setIsWelcomeGuideOpen(false); // Close the WelcomeGuide modal

        if (dataFromGuide.save_close === true) {
          
            setSaveAndClosePostContent(dataFromGuide.first_post);
          
            setShowSaveAndCloseSuccess(true); // Trigger the SaveAndClosePage modal
        }
        // If other actions are passed, you can handle them here
        // e.g., if dataFromGuide.action === 'schedule', you might show a "Scheduled!" modal
    };
*/}
  
  const handleWelcomeGuideComplete = (dataFromGuide: WelcomeGuideCompleteData) => {
    console.log('Welcome Guide completed with data:', dataFromGuide);
    setIsWelcomeGuideOpen(false); // Always close the WelcomeGuide modal when it completes

    // Scenario 1: User chose to "Save and Close"
    if (dataFromGuide.save_close === true) {
        if (dataFromGuide.first_post) {
            setSaveAndClosePostContent(dataFromGuide.first_post);
        }
        setShowSaveAndCloseSuccess(true); 
    }
    // Scenario 2: User successfully connected to a social channel (e.g., Bluesky)
    else if (dataFromGuide.status === 'success' && dataFromGuide.selectedSocialChannel) {
        handleConnectionSuccess(dataFromGuide.selectedSocialChannel, dataFromGuide.postContent);
    }
};

  // Handlers to close the new success modals
    const handleCloseOnboardSuccessModal = () => setShowOnboardSuccess(false);
  
    const handleCloseSaveAndCloseSuccessModal = () => setShowSaveAndCloseSuccess(false);

  const openWelcomeGuide = () => {
    setIsWelcomeGuideOpen(true);
  };

  const handleOpenFirstPostModal = () => {
    setIsFirstPostModalOpen(true);
  };

    const handleCloseFirstPostModal = () => {
    setIsFirstPostModalOpen(false);
  };

  const handleEditFirstPost = (content: string) => {
    setIsFirstPostModalOpen(false); // Close the modal
    // Navigate to the ComposePosts page and pass the content via state
    navigate('/dashboard/compose', { state: { draftContent: content } });
  };

   const handleToggleShowPostInModal = (postId: string, showPost: boolean) => {
    // You might want to refresh dashboard metrics here if needed
    // For now, just close the modal as the DB update is handled internally
    setIsFirstPostModalOpen(false);
  };
  
  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        // Get today's date
        const today = new Date();
        const formattedToday = format(today, 'yyyy-MM-dd');

        // Calculate next week's date range
        const nextWeekStart = addDays(today, 1);
        const nextWeekEnd = addDays(today, 7);
        
        // 1. Fetch today's posts
        const { data: todayPosts, error: todayError } = await supabase
          .from('user_post_schedule')
          .select('id, schedule_status, sent_post, draft_status')
          .eq('user_email', session.user.email)
          .eq('content_date', formattedToday);

        if (todayError) throw todayError;

        // 2. Fetch draft posts
        const { data: draftPosts, error: draftError } = await supabase
          .from('user_post_draft')
          .select('id')
          .eq('user_email', session.user.email)
          .eq('draft_status', true);

        if (draftError) throw draftError;

        // 3. Fetch calendars
        const { data: calendars, error: calendarError } = await supabase
          .from('calendar_questions')
          .select('calendar_name, active')
          .eq('email', session.user.email)
          .eq('deleted', false)
          .eq('active', true);

        if (calendarError) throw calendarError;

        // 4. Calculate streak (posts sent on consecutive days)
        // For this example, we'll simulate a streak calculation
        const { data: recentPosts, error: recentError } = await supabase
          .from('user_post_schedule')
          .select('content_date, sent_post')
          .eq('user_email', session.user.email)
          .eq('sent_post', true)
          .order('content_date', { ascending: false })
          .limit(30); // Get last 30 days of posts

        if (recentError) throw recentError;

        // Calculate streak based on consecutive days with posts
        let streak = 0;
        if (recentPosts && recentPosts.length > 0) {
          const sortedDates = [...recentPosts]
            .sort((a, b) => new Date(b.content_date).getTime() - new Date(a.content_date).getTime())
            .map(post => post.content_date);
          
          // Remove duplicates (multiple posts on same day)
          const uniqueDates = [...new Set(sortedDates)];
          
          // Check if there's a post today
          const hasPostToday = uniqueDates.includes(formattedToday);
          
          if (hasPostToday) {
            streak = 1; // Start with today
            let checkDate = addDays(parseISO(formattedToday), -1);
            
            for (let i = 1; i < 30; i++) {
              const checkDateStr = format(checkDate, 'yyyy-MM-dd');
              if (uniqueDates.includes(checkDateStr)) {
                streak++;
                checkDate = addDays(checkDate, -1);
              } else {
                break; // Streak broken
              }
            }
          }
        }

        // 5. Fetch next week's posts
        const { data: nextWeekPosts, error: nextWeekError } = await supabase
          .from('user_post_schedule')
          .select('id')
          .eq('user_email', session.user.email)
          .eq('schedule_status', true)
          .gte('content_date', format(nextWeekStart, 'yyyy-MM-dd'))
          .lte('content_date', format(nextWeekEnd, 'yyyy-MM-dd'));

        if (nextWeekError) throw nextWeekError;

        // Update metrics state
        setMetrics({
          todayPosts: {
            total: todayPosts?.length || 0,
            disabled: todayPosts?.filter(p => p.draft_status).length || 0,
            scheduled: todayPosts?.filter(p => p.schedule_status && !p.sent_post).length || 0,
            sent: todayPosts?.filter(p => p.sent_post).length || 0
          },
          drafts: draftPosts?.length || 0,
          calendars: {
            total: calendars?.length || 0,
            active: calendars?.filter(c => c.active).length || 0,
            inactive: calendars?.filter(c => !c.active).length || 0
          },
          streak,
          nextWeekPosts: nextWeekPosts?.length || 0
        });

      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardMetrics();
  }, []);

  const handleCreatePost = () => {
    navigate('/dashboard/compose');
  };

 const handleSchedulePost = () => {
    navigate('/dashboard/schedule');
  };
  
 const handleCreateCampaign = () => {
    navigate('/dashboard/campaign');
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
  <div className="p-6 md:p-8 lg:p-10 bg-gray-50 min-h-screen"> {/* Subtle background */}
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}

      {/*
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">Hey!👋</h1>
        <p className="text-gray-600 mt-1 text-lg">Welcome back! Here's an overview of your social media activity.</p>
      </div>
      */}

      <div className="mb-8">
        <div className="flex justify-between items-start mb-4"> {/* Added flex container */}
          {/* Left-aligned text */}
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">Hey!👋</h1>
              <p className="text-gray-600 mt-1 text-lg">Welcome back! Here's an overview of your social media activity.</p>
            </div>

          {/* Right-aligned Create New Campaign button */}
          <button
              onClick={handleCreateCampaign}
              className={`inline-flex items-center px-4 py-2 rounded-full text-base font-semibold shadow-md
                  ${PRIMARY_COLOR_CLASSES.bg} text-white ${PRIMARY_COLOR_CLASSES.hoverBg}
                  transform transition-transform duration-200 hover:-translate-y-0.5
                  shadow-blue-500/30
                  `}
            >
               <Sparkles className="w-6 h-6 mr-2 text-yellow-400 fill-yellow-500" /> {/* Reduced icon size */}
                Plan 14 Days of Content
            </button>
        </div>
      </div>

      {/*Start New Main Metrics & Quick Actions */}

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
  {/* Column 1: Main Activity Metrics */}
  <div className="flex flex-col gap-6">
    {/* Card: Today's Activity */}
    <a
      onClick={() => setIsScheduledPostsOpen(true)}
      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
    >
      <div className="flex items-center">
        <div className="rounded-full bg-blue-100 items-center p-1 mr-3">
          {/*<Calendar className={`w-5 h-5 ${PRIMARY_COLOR_CLASSES.text}`} />*/}
          <Calendar className="w-5 h-5 text-blue-500"/>
        </div> 
        <div>
          <div className="font-medium text-gray-900">Today's Activity</div>
          <div className="text-xs text-gray-600">
            View {metrics.todayPosts.total} post{metrics.todayPosts.total !== 1 ? 's' : ''} today
          </div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-500" />
    </a>

    {/* Card: Draft Posts */}
    <a
      onClick={() => setIsDraftPostsOpen(true)}
      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
    >
      <div className="flex items-center">
        <div className="rounded-full bg-yellow-50 items-center p-1 mr-3">
            <FileEdit className="w-5 h-5 text-yellow-500" />
        </div> 
        <div>
          <div className="font-medium text-gray-900">Saved Drafts</div>
          <div className="text-xs text-gray-600">
            {metrics.drafts} post{metrics.drafts !== 1 ? 's' : ''} in progress
          </div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-500" />
    </a>

    {/* Card: Upcoming Campaigns */}
    <a
      onClick={() => setIsCalendarListOpen(true)}
      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
    >
      <div className="flex items-center">
        <div className="rounded-full bg-green-100 items-center p-1 mr-3">
        <CalendarSearch className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <div className="font-medium text-gray-900">Active Campaigns</div>
          <div className="text-xs text-gray-600">
            Manage {metrics.calendars.total} active campaign{metrics.calendars.total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-500" />
    </a>

     {/* Card: First Post Idea */}
    <a
      //onClick={() => setIsCalendarListOpen(true)}
      onClick={handleOpenFirstPostModal}
      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
    >
      <div className="flex items-center">
        <div className="rounded-full bg-gray-100 items-center p-1 mr-3">
        <Send className="w-5 h-5 text-gray-500" />
        </div>
        <div>
          <div className="font-medium text-gray-900">Your First Post</div>
          <div className="text-xs text-gray-600">
            Review the first post you created 
          </div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-500" />
    </a>
  </div>

  {/* Column 2: Posting Streak Card */}
  <div className="flex flex-col gap-6"> {/* Ensure this is still a flex column for consistent spacing */}
    {/* Card: Posting Streak (Motivational) */}
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <div className="rounded-full bg-blue-100 items-center p-1 mr-1">
            <Flame className="w-5 h-5 text-blue-500" />
          </div>
          Posting Streak
        </h3>
      </div>

      {/* Main Metric & Emojis */}
      <div className="flex items-baseline space-x-2 mb-6">
        <p className="text-4xl font-bold text-gray-900">{metrics.streak}</p>
        <span className="text-lg text-gray-600">days</span>
        <span className="ml-2 text-2xl">
          {metrics.streak >= 10 ? '🔥' : (metrics.streak > 0 ? '✨' : '')}
        </span>
      </div>

      {/* Description & Progress Bar */}
      <div className="mt-auto">
        <p className="text-sm text-gray-600 mb-3">
          {metrics.streak > 0
            ? `You've posted ${metrics.streak} day${metrics.streak !== 1 ? 's' : ''} in a row! Keep up the great work.`
            : 'Start posting today to build your streak! 🔥'}
        </p>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${PRIMARY_COLOR_CLASSES.bg}`}
            style={{ width: `${Math.min(100, metrics.streak * 10)}%` }}
          ></div>
        </div>
          
      </div>
      
    </div>
    
  </div>

  {/* Column 3: Upcoming Posts Card */}
  <div className="flex flex-col gap-6"> {/* Ensure this is also a flex column for consistent spacing */}
    {/* Card: Upcoming Posts (Planning) */}
    <div className="card p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 space-x-2">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <div className="rounded-full bg-blue-100 items-center p-1 mr-1">
          <Clock className="w-5 h-5 text-blue-500" />
          </div>  
          Upcoming Posts
        </h3>
      </div>

      {/* Main Metric */}
      <div className="flex items-baseline space-x-2 mb-6">
        <p className="text-4xl font-bold text-gray-900">{metrics.nextWeekPosts}</p>
        <span className="text-lg text-gray-600">scheduled for next 7 days</span>
      </div>

      {/* Description */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          {metrics.nextWeekPosts > 0
            ? `You have ${metrics.nextWeekPosts} post${metrics.nextWeekPosts !== 1 ? 's' : ''} confirmed for the upcoming week.`
            : 'No posts scheduled for next week yet. Create a content campaign in 60 seconds! 🚀'}
        </p>
      </div>

      {/* Call to Action Button */}
      <div className="mt-auto">
        <button
          onClick={handleSchedulePost}
          className="flex items-center justify-center w-full py-2 px-4 rounded-md bg-gray-100 text-gray-700 font-medium
                    transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          <span>Schedule New Post</span>
          <PlusCircle className="ml-2 w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</div>
  {/*End New Main Metrics & Quick Actions*/}

      
      {/* --- Quick Compose Button (Always Available) --- 
      <div className="mt-10 text-center">
        <button
          onClick={openWelcomeGuide}
          className={`inline-flex items-center px-8 py-4 rounded-full text-lg font-semibold shadow-xl
                      ${PRIMARY_COLOR_CLASSES.bg} text-white ${PRIMARY_COLOR_CLASSES.hoverBg}
                      transform transition-transform duration-200 hover:-translate-y-1
                      shadow-xl shadow-blue-500/50
                      `}
        >
          <Sparkles className="w-6 h-6 mr-3" />
          Start Welcome Guide
        </button>
      </div>
      */}

    </div>

    {/* Side Panels - These remain outside the main dashboard content */}
    <ScheduledPostsToday
      isOpen={isScheduledPostsOpen}
      onClose={() => {
        setIsScheduledPostsOpen(false);
        setIsDraftPostsOpen(false);  
        setIsCalendarListOpen(false)
      }}
    />
    <DraftPostModalDashboard
      isOpen={isDraftPostsOpen}
      onClose={() => {
        setIsDraftPostsOpen(false);
        setIsCalendarListOpen(false);
        setIsScheduledPostsOpen(false)
      }}
      onContinueDraft={(content, socialChannel, userHandle) => {
        setIsDraftPostsOpen(false);
        navigate('/dashboard/compose'); // Assuming this takes you to compose page
      }}
    />
    <CalendarListSidePanel
      isOpen={isCalendarListOpen}
      onClose={() => {
        setIsCalendarListOpen(false);
        setIsDraftPostsOpen(false);
        setIsScheduledPostsOpen(false)
      }}
      onSelectCalendar={(calendarName) => {
        navigate(`/dashboard/calendars?calendar=${calendarName}`);
      }}
    />

     {/* Conditionally render the WelcomeGuide component */}
      <WelcomeGuide
        isOpen={isWelcomeGuideOpen}
        onClose={() => setIsWelcomeGuideOpen(false)}
        onComplete={handleWelcomeGuideComplete}
        selectedContentIdea={selectedContentIdeaId} // <-- Pass the ID here
        postToUpdate={currentPostIdeaRecord}   // <-- Pass the full record here
        
      />

    {/* OnboardSuccessPage Modal (self-contained) */}
      <OnboardSuccessPage
        isOpen={showOnboardSuccess}
        onClose={handleCloseOnboardSuccessModal}
        postContent={onboardSuccessPostContent}
      />

      {/* SaveAndClosePage Modal (self-contained) */}
      <SaveAndClosePage
        isOpen={showSaveAndCloseSuccess}
        onClose={handleCloseSaveAndCloseSuccessModal}
        postContent={saveAndClosePostContent}
      />

    {/* Render the FirstPostModal component */}
    <FirstPostModal
        isOpen={isFirstPostModalOpen}
        onClose={handleCloseFirstPostModal}
        onEdit={handleEditFirstPost}
        onToggleShowPost={handleToggleShowPostInModal}
      />
    
  </div>
);
}

export default UserDashboard;
