import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Send, Copy, Calendar, CalendarPlus, SquarePen, Loader2, X, Plus, PlusCircle, MailCheck, Lightbulb, Save, List, FileEdit, Sparkles, Check, Recycle, BookText,BookOpenText, Trash2 } from 'lucide-react';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { checkConnectedSocials, checkPlatformConnection } from '../utils/checkConnectedSocial';
import { CreateBlueskyModal } from './CreateBlueskyModal';
import { NoSocialModal } from './NoSocialModal';
import { ConnectSocialModal } from './ConnectSocialModal';
import { AddSocialTabModal } from './AddSocialTabModal';
import { supabase } from '../lib/supabase';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';
import { MoreBlueskyAccounts } from './MoreBlueskyAccounts'; 
import { MoreTwitterAccounts } from './MoreTwitterAccounts';
import { MoreLinkedInAccounts } from './MoreLinkedInAccounts'; 
import { useBlueskyStore } from '/src/store/blueskyStore';
import { format, parse } from 'date-fns';
import { ScheduleDraftPost } from '/src/components/ScheduleDraftPost';
import { ContentCalendarModal } from './ContentCalendarModal';
import { DraftPostModal } from './DraftPostModal';
import { SentPostModal } from './SentPostModal';
import { improveComment, generateHookPostV3 } from '../lib/gemini';
import { rewritePostForBluesky } from '../lib/geminiBluesky'
import { rewritePostForLinkedIn } from '../lib/geminiLinkedIn'
import { rewritePostForTwitter} from '../lib/geminiTwitter'
import { useLocation } from 'react-router-dom';
import { generateBlueskyFacetsForLinks } from '../utils/generateBlueskyFacetsForLinks';
import { useProductTier } from '../hooks/useProductTierHook'
import { ProPlanLimitModal } from './ProPlanLimitModal';
import { HookListModal } from './HookListModal';



interface SocialAccount {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  social_channel: string;
  twitter_verified: boolean;
}


interface ScheduledPostData {
  content_date: string; // ISO date string from database
  content_time: string; // HH:mm:ss string from database
  // Add other properties you might want to display
}

// Helper function to calculate first line length
const calculateFirstLineLength = (text: string): number => {
  const firstLine = text.split('\n')[0];
  return firstLine.length;
};

function ComposePosts() {
  const [content, setContent] = useState('');
  const [showNoSocialModal, setShowNoSocialModal] = useState(false);
  const { user: blueskyUser, agent } = useBlueskyStore();
  const [showAddSocialTabModal, setShowAddSocialTabModal] = useState(false);
  const [isBlueskyModalOpen, setIsBlueskyModalOpen] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTwitterModalOpen, setIsTwitterModalOpen] = useState(false);
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);
  const [isConnectSocialModalOpen, setIsConnectSocialModalOpen] = useState(false);
  const [isContentCalendarModalOpen, setIsContentCalendarModalOpen] = useState(false);
  const [modalContentDate, setModalContentDate] = useState<string>('');
  const [isDraftPostModalOpen, setIsDraftPostModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLinkedIn, setIsGeneratingLinkedIn] = useState(false);
  const [isGeneratingTwitter, setIsGeneratingTwitter] = useState(false);
  const [campaignContent, setCampaignContent] = useState<Array<{ theme: string; topic: string; content: string }> | null>(null);
  const { processedContent, facets } = generateBlueskyFacetsForLinks(content);
  const [isSchedulingPost, setIsSchedulingPost] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState(new Date()); // New state for modal date
  const [selectedTimeForModal, setSelectedTimeForModal] = useState(format(new Date(), 'HH:mm')); // New state for modal time
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationDetails, setNotificationDetails] = useState<{ date: Date; time: string } | null>(null);
  const [isDraftSuccessModalOpen, setIsDraftSuccessModalOpen] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  //const [copySuccessMap, setCopySuccessMap] = useState<{ [key: string]: boolean }>({});
  const [copySuccessMap, setCopySuccessMap] = useState(false);

  const [max_length, setMaxLength] = useState(300);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const handleRewriteContent = (rewrittenContent: string) => {
    setContent('');
    setContent(rewrittenContent);
    //setIsContentCalendarModalOpen(false);
  };

  const [draftPosts, setDraftPosts] = useState<{[key: string]: DraftPost[]}>({});
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalDraftCount, setTotalDraftCount] = useState(0); // New state variable

  //Sent Post State Management
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false); // Existing state for Drafts Modal
  const [isSentPostModalOpen, setIsSentPostModalOpen] = useState(false); // NEW: State for Sent Posts Modal
  const [isHookListModalOpen, setIsHookListModalOpen] = useState(false); // NEW: State for HookListModal



    // Check Limits Based on Product Tier
  const [isProPlanLimitModalOpen, setIsProPlanLimitModalOpen] = useState(false);
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // --- NEW: Use useLocation hook to access navigation state ---
  const location = useLocation();
  const [firstLineLength, setFirstLineLength] = useState(() => calculateFirstLineLength(content));

  //First Line Implementation
   const MAX_FIRST_LINE = 40;

  // Reset form when modal closes
  useEffect(() => {
    //if (!isOpen) {
      setEditedContent(content);
      setFirstLineLength(calculateFirstLineLength(content));
    //}
  }, [content]);


  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    setEditedContent({
      ...editedContent,
      content: newContent
    });

    setFirstLineLength(calculateFirstLineLength(newContent));

    setOptimisticContent(prev => 
      prev.map(content => 
        content.id === editedContent.id 
          ? {...content, content: newContent}
          : content
      )
    );
  };

  const getFirstLineColor = (length: number) => {
    if (length <= 35) return 'bg-green-300';
    if (length > 35 && length <= MAX_FIRST_LINE) return 'bg-yellow-300';
    return 'bg-red-300';
  };

  const FirstLineProgress = () => {
    const percentage = Math.min((firstLineLength / MAX_FIRST_LINE) * 100, 100);
    const color = getFirstLineColor(firstLineLength);

    return (
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
        <div 
          className={`absolute left-0 top-0 h-full transition-all duration-200 ${color}`}
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute right-0 -top-4 text-xs text-gray-500">
          {firstLineLength}/{MAX_FIRST_LINE} first line
        </div>
      </div>
    );
  };

  // --- NEW: useEffect to check for draftContent in location.state ---
  useEffect(() => {
    if (location.state && (location.state as any).draftContent) {
      const draftContentFromState = (location.state as any).draftContent;
      setContent(draftContentFromState);
      // Optionally, clear the state so it doesn't persist on refresh
      // navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);
  
  //LinkedIn VITE
  const VITE_LINKEDIN_POSTER_URL = import.meta.env.VITE_LINKEDIN_POSTER_URL;

  //Twitter VITE
  const VITE_TWITTER_POSTER_URL = import.meta.env.VITE_TWITTER_POSTER_URL;

  

const activeAccount = connectedAccounts.find(account => account.id === activeAccountId);

//New UseEffect to include Premium Twitter . . 
   useEffect(() => {
    if (activeAccountId) {
      //const activeAccount = socialChannels.find(channel => channel.id === selectedChannel);
      const activeSocialAccount = connectedAccounts.find(account => account.id === activeAccountId);
      if (activeSocialAccount) {
        //console.log('Selected Social Channel:', activeSocialAccount.social_channel); 
        switch (activeSocialAccount.social_channel) {
          case 'Bluesky':
            setMaxLength(300);
            break;
          case 'Twitter':
                // Use activeAccount.twitter_verified directly here
                if (activeSocialAccount.twitter_verified) {
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
  }, [activeAccountId, connectedAccounts]);    

  // Use this to determine whether to try to post or not
  const canProceedToPost = () => {
  return activeAccountId && content.trim().length > 0 && content.trim().length < max_length ;
};

// Function to determine the tooltip message for the "Next" button
const getNextButtonTooltip = () => {
  if (!activeAccountId) {
    return "Please choose a social channel to continue.";
  }
  if (content.trim().length === 0) {
    return "Write a post to enable the post button";
  }
  // Check if content length is greater than or equal to max_length, which disables the button
  if (content.trim().length >= max_length) {
    return "You've exceeded the maximum character limit for this social account.";
  }
  // If none of the above conditions are met, the button should be enabled, so no tooltip needed for disabled state.
  return "";
};  

// Add this useEffect to fetch the user ID when the component mounts
useEffect(() => {
  const fetchUserId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
        setCurrentUserEmail(session.user.email);
      }
    } catch (err) {
      console.error('Error fetching user ID:', err);
    }
  };
  
  fetchUserId();
}, []);

// use the productTier Hook here 
 
//------------------ Start Upgrade Modal and Limits Checks Here --------------------------//
//========================================================================================//  
  
//---- NEW Hook to Capture all Account Type Paramenters -----//
    const {
    isLoading: isProductLoading, //changed from isLoading
    error: errorProduct, //changed from error
    userPreferences,
    productTierDetails,
    isFreePlan,
    isEarlyAdopter, // New variable
    isTrialUser,
    isPaidPlan,
    canCreateMoreCampaigns,
    canAddMoreSocialAccounts,
    isTrialExpiringSoon,
    daysUntilTrialExpires,
    showFirstTrialWarning,
    showSecondTrialWarning,
    showFinalTrialWarning,
    max_calendar,
    max_social_accounts,
    remainingCampaigns,
    remainingSocialAccounts,
  } = useProductTier(supabase, currentUserEmail);  
  

// Define specific limits
const MAX_FREE_CAMPAIGNS = max_calendar;
const MAX_FREE_ACCOUNTS = max_social_accounts;
const FREE_TRIAL_DAYS =   daysUntilTrialExpires
type ActionType = 'createCampaign' | 'addAccount' | 'freeTrialEnded';


//----------- Start Check Limits Function -------------------- //
// This refined function checks limits specific to the requested action

  const checkActionLimits = async (action: ActionType): Promise<boolean> => {
    setIsCheckingLimits(true);
    setUserMessage('');
    setModalMessage(''); // Clear previous modal message
    setIsProPlanLimitModalOpen(false);

    //console.log(`[checkActionLimits] Action requested: ${action}`);

    try {
        const { data: userPreferences, error: supabaseError } = await supabase
            .from('user_preferences')
            .select('account_type, total_campaign, social_accounts, user_tenure') // <-- SELECTING 'total_campaign' and 'social_accounts'
            .eq('user_id', currentUserId)
            .single();

        if (supabaseError || !userPreferences) {
            console.error("[checkActionLimits] Error fetching user preferences:", supabaseError?.message || "No data returned.");
            setUserMessage('Could not retrieve account details. Please try again.');
            return false;
        }
   
      const limitedAccountTypes = ['Pro Plan']; // Define the types that have this limit
         switch (action) {
            case 'createCampaign':
            // Correct variable name for campaign-related checks
              const isLimitedCampaignAccountType = limitedAccountTypes.includes(userPreferences.account_type);
              const hasExceededCampaigns = remainingCampaigns <= 0 ;       
              if (isLimitedCampaignAccountType && hasExceededCampaigns) {
        setModalMessage(`You have reached your limit of ${MAX_FREE_CAMPAIGNS} campaigns for your ${userPreferences.account_type} plan. Upgrade to create more!`);
        setIsProPlanLimitModalOpen(true);
        //console.log("[checkActionLimits] Limit exceeded for createCampaign. Returning false.");
        return false;
      }
      break;
          case 'addAccount':
            // Correct variable name for addAccount-related checks
            const isLimitedAccountAccountType = limitedAccountTypes.includes(userPreferences.account_type);
            const hasExceededAccounts = (userPreferences.social_accounts || 0) >= MAX_FREE_ACCOUNTS;
              if (isLimitedAccountAccountType && hasExceededAccounts) {
                setModalMessage(`You have reached your limit of ${MAX_FREE_ACCOUNTS} connected accounts for your ${userPreferences.account_type}. Upgrade to connect more!`);
                setIsProPlanLimitModalOpen(true);

                //console.log("[checkActionLimits] Limit exceeded for addAccount. Returning false.");

              return false;

            }
      break;
            case 'freeTrialEnded':
              // Correct variable name for addAccount-related checks
              const isLimitedFreeTrialAccountType = limitedAccountTypes.includes(userPreferences.account_type);
              if (isLimitedFreeTrialAccountType && (daysUntilTrialExpires <= 0)) {
                  
                setModalMessage(`Your Free Trial on SoSavvy has ended for your ${userPreferences.account_type}. Upgrade your account to Pro Plan to continue creating posts!`);
                setIsProPlanLimitModalOpen(true);
                //console.log("[checkActionLimits] Limit exceeded for freeTrials. Returning false.");
          
                return false;
              }
        break;             
        
        default:
                console.warn(`[checkActionLimits] Unknown action type for limit check: ${action}`);
                return false; // Or throw error
        }

        return true;

    } catch (e: any) {
        console.error("[checkActionLimits] Unhandled error during limit check:", e.message);
        setUserMessage('An unexpected error occurred during limit check. Please try again.');
        return false;
    } finally {
        setIsCheckingLimits(false);
    }
};

//------------- End Check Limits Function -------------------- //  
  
 // handle UpgradeModal Open
  const handleOpenProPlanLimitModal = () => {
    setIsProPlanLimitModalOpen(true);
  };

  // Function to close the modal
  const handleCloseProPlanLimitModal = () => {
    setIsProPlanLimitModalOpen(false);
  };

//------------------ End Upgrade Modal and Limits Checks Here --------------------------//
//========================================================================================//
  
const fetchDraftPosts = useCallback(async () => {
        try {
            setIsDraftLoading(true); // Set loading state when fetching
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) {
                console.warn('No user session found to fetch drafts.');
                setDraftPosts({}); // Clear drafts if no session
                setTotalDraftCount(0);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('user_post_draft')
                .select('*')
                .eq('user_email', session.user.email)
                .eq('draft_status', true)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const groupedDrafts: {[key: string]: DraftPost[]} = data.reduce((acc, post) => {
                const channel = post.social_channel;
                if (!acc[channel]) {
                    acc[channel] = [];
                }
                acc[channel].push(post);
                return acc;
            }, {});

            setDraftPosts(groupedDrafts);

            let count = 0;
            for (const channel in groupedDrafts) {
                count += groupedDrafts[channel].length;
            }
            setTotalDraftCount(count);
            setError(null); // Clear any previous errors on successful fetch
        } catch (err) {
            console.error('Error fetching draft posts:', err);
            setError('Failed to load draft posts');
            setDraftPosts({}); // Clear drafts on error
            setTotalDraftCount(0);
        } finally {
            setIsDraftLoading(false); // Reset loading state regardless of  success or failure
        }
    }, []);  

  useEffect(() => {
    fetchDraftPosts();
  }, [fetchDraftPosts]);

useEffect(() => {
    if (activeAccountId) {
      const activeAccount = connectedAccounts.find(account => account.id === activeAccountId);
      if (activeAccount) {
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
  }, [activeAccountId, connectedAccounts]);  

  // NEW: Functions to manage the Sent Posts Modal
  const handleOpenSentPostModal = () => {
    setIsSentPostModalOpen(true);
  };

  const handleCloseSentPostModal = () => {
    setIsSentPostModalOpen(false);
    setIsHookListModalOpen(false);
    setIsDraftPostModalOpen(false);
    setIsContentCalendarModalOpen(false);
    setIsContentCalendarModalOpen(false);
  };

   // NEW: Functions to manage the Hook List Modal
  const handleOpenHookListModal = () => {
    setIsHookListModalOpen(true);
  };

  const handleCloseHookListModal = () => {
    setIsHookListModalOpen(false);
    setIsDraftPostModalOpen(false);
    setIsContentCalendarModalOpen(false);
    setIsSentPostModalOpen(false);
    setIsContentCalendarModalOpen(false);
  };

  // NEW: Function to handle using a hook from HookListModal
  const handleUseHook = (hookContent: string) => {
    // Prepend the hook content to the existing post content
    setContent(hookContent + '\n\n' + content);
    //console.log("executed handleUseHook")
  };

   // NEW: Function to handle updating content from HookListModal (e.g., after generating killer hook)

    const handleRewriteHook = (revisedHook: string) => {
    setContent('');
    setContent(revisedHook + '\n' + content);
    //console.log("executed handleRewriteHook")
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccessMap(() => (true));
      setTimeout(() => setCopySuccessMap(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleRequestMoreBlueskyAccounts = () => {
   setShowAddSocialTabModal(false); 
   setIsModalOpen(true); 
 };

   const handleRequestMoreLinkedInAccounts = () => {
   setShowAddSocialTabModal(false); 
   setIsLinkedInModalOpen(true);
 };

   const handleRequestMoreTwitterAccounts = () => {
   setShowAddSocialTabModal(false); 
   setIsTwitterModalOpen(true);
 };  
  
  // Fetch connected accounts on component mount
  useEffect(() => {
    const fetchConnectedAccounts = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        const { data, error } = await supabase
          .from('social_channels')
          .select('*')
          .eq('email', session.user.email)
          .eq('activated', true);

        if (error) throw error;

        if (data && data.length > 0) {
          setConnectedAccounts(data);
          setActiveAccountId(data[0].id); // Set first account as active by default
        }
      } catch (err) {
        console.error('Error fetching connected accounts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectedAccounts();
  }, []);

  const handleConnectBluesky = () => {
    //setIsBlueskyModalOpen(true);
    setShowAddSocialTabModal(true);
  };

  const handleConnectAccount = () => {
    //setIsBlueskyModalOpen(true);
    setShowAddSocialTabModal(true);
  };

  const handleCloseBlueskyModal = () => {
    setIsBlueskyModalOpen(false);
    //setShowAddSocialTabModal(false); // DO NOT ENABLE close tab social 
    
    // Refresh connected accounts after closing modal
    fetchConnectedAccounts();
  };

  const handleConnectLinkedIn = () => {
    //console.log('Connecting to LinkedIn');
  };

  const fetchConnectedAccounts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      const { data, error } = await supabase
        .from('social_channels')
        .select('*')
        .eq('email', session.user.email)
        .eq('activated', true);

      if (error) throw error;

      if (data && data.length > 0) {
        setConnectedAccounts(data);
        if (!activeAccountId) {
          setActiveAccountId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error refreshing connected accounts:', err);
    }
  };

// handle Post (Bluesky LinkedIn and Twitter)
  
  const handlePostOnBluesky = async (content: string, accountId: string | null): Promise<boolean> => {
  try {
    if (!accountId) {
      console.error('No account selected');
      return false;
    }
    
    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      console.error('No authenticated user found');
      return false;
    }
    
    // Get the account details from social_channels
    const { data: accountData, error: accountError } = await supabase
      .from('social_channels')
      .select('*')
      .eq('id', accountId)
      .eq('email', session.user.email)
      .single();
    
    if (accountError) {
      console.error('Error fetching account:', accountError);
      return false;
    }
    
    // Check if this is a Bluesky account
    if (accountData.social_channel !== 'Bluesky') {
      console.error('Selected account is not a Bluesky account');
      return false;
    }
    
    
    // Login with the account credentials
    // Note: We need the app_password from the database
    if (!accountData.app_password) {
      console.error('No app password found for this account');
      return false;
    }
    
    const loginResult = await agent.login({
      identifier: accountData.handle,
      password: accountData.app_password
    });
    
    if (!loginResult.success) {
      console.error('Failed to login to Bluesky');
      return false;
    }


    const postResult = await agent.post({
        text: processedContent, // Use the processedContent
        facets: facets.length > 0 ? facets : undefined, // Conditionally include facets if any were generated
        // You can add additional parameters like:
        // langs: ['en'],
        // embed: {}, // For images, quotes, etc.
      });
    
    // Update the last_login time in the database
    await supabase
      .from('social_channels')
      .update({ 
        last_login: new Date().toISOString() 
      })
      .eq('id', accountId);
    
    //console.log('Post successful:', postResult);
    return true;
    
  } catch (error) {
    console.error('Error posting to Bluesky:', error);
    return false;
  }
};

const handlePostOnLinkedIn = async (postId: string): Promise<boolean> => {
  //console.log('handlePostOnLinkedIn: Triggering Edge Function for postId:', postId);

  if (!VITE_LINKEDIN_POSTER_URL) {
      console.error('handlePostOnLinkedIn: LinkedIn poster Edge Function URL is not configured.');
      // You might want to show a configuration error to the user
      return false;
  }

  try {
    // Make a POST request to your linkedin-poster Edge Function URL
    const response = await fetch(VITE_LINKEDIN_POSTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You typically don't need user's JWT here unless your Edge Function
        // checks RLS using the user's context (less common for background tasks like posting)
        // If your Edge Function uses the Service Role Key, no auth header is needed from frontend.
      },
      body: JSON.stringify({ postId: postId }), // Send the postId in the request body
    });

    //console.log('handlePostOnLinkedIn: Edge Function response status:', response.status);

    const responseBody = await response.json();
    //console.log('handlePostOnLinkedIn: Edge Function response body:', responseBody);


    if (!response.ok) {
      console.error('handlePostOnLinkedIn: Edge Function reported an error:', response.status, responseBody);
      // The Edge Function itself should ideally return an error message in the body
       // TODO: Extract and show a user-friendly error message from responseBody
      return false; // Indicate failure
    }

    // Check the response body from the Edge Function for success details
    // (Your Edge Function returns { message: '...', linkedinPostId: '...' })
    if (responseBody.message === 'LinkedIn post successful') {
         //console.log('handlePostOnLinkedIn: Edge Function confirmed successful LinkedIn post.');
         // Optionally, store the linkedinPostId returned in responseBody.linkedinPostId
         // if you need it on the frontend.
        return true; // Indicate success
    } else {
         console.error('handlePostOnLinkedIn: Edge Function did not report successful post:', responseBody);
         // The Edge Function likely returned a non-200 status in the !response.ok block above,
         // but this is a fallback just in case it returns 200 with an unexpected body.
         return false;
    }


  } catch (err) {
    console.error('handlePostOnLinkedIn: Error calling Edge Function:', err);
     // TODO: Show a user-friendly error message
    return false; // Indicate failure
  }
};


//handle Post function for Twitter
const handlePostOnTwitter = async (postId: string): Promise<boolean> => {
  //console.log('handlePostOnTwitter: Triggering Edge Function for postId:', postId);

  // --- Check for the Twitter poster Edge Function URL environment variable ---
  if (!VITE_TWITTER_POSTER_URL) { // Use process.env.VITE_... based on your build tool
      console.error('handlePostOnTwitter: Twitter poster Edge Function URL is not configured.');
      // TODO: Show a configuration error to the user in your UI
      return false;
  }

  try {
    // Make a POST request to your twitter-poster Edge Function URL
    const response = await fetch(VITE_TWITTER_POSTER_URL, { // Use the Twitter URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // As with LinkedIn, you typically don't need user's JWT here if
        // your Edge Function uses the Service Role Key for DB access.
      },
      body: JSON.stringify({ postId: postId }), // Send the postId in the request body
    });

    //console.log('handlePostOnTwitter: Edge Function response status:', response.status);

    // Attempt to parse the response body as JSON for logging/error details
    let responseBody = null;
    try {
         responseBody = await response.json();
         //console.log('handlePostOnTwitter: Edge Function response body:', responseBody);
    } catch (jsonParseError) {
        console.error('handlePostOnTwitter: Failed to parse Edge Function response body as JSON:', jsonParseError);
         // Even if parsing fails, we can still check response.ok and status
         // responseBody might be null or incomplete here
    }


    // --- Check the response status ---
    if (!response.ok) {
      console.error('handlePostOnTwitter: Edge Function reported an error:', response.status, responseBody || response.statusText);
      // The Edge Function itself should ideally return an error message in the body
       // TODO: Extract and show a user-friendly error message from responseBody?.details or message
      return false; // Indicate failure
    }

    // --- Check the response body from the Edge Function for success details ---
    // Your twitter-poster Edge Function returns:
    // { message: 'Twitter post successful', twitterPostId: '...' } on success (200)
    // { message: 'Post detected as duplicate by Twitter', status: 'skipped_duplicate_tweet', twitterError: {...} } on duplicate (200)
    // It returns other error messages/structures on failure (!response.ok)

    if (responseBody && (responseBody.message === 'Twitter post successful' || responseBody.message === 'Post detected as duplicate by Twitter')) {
         //console.log('handlePostOnTwitter: Edge Function confirmed Twitter post handled (success or duplicate).');
         // Optionally, store the twitterPostId returned in responseBody.twitterPostId
         // if you need it on the frontend.
        return true; // Indicate success (task handled by Edge Function)
    } else {
         console.error('handlePostOnTwitter: Edge Function returned unexpected successful response body:', response.status, responseBody);
         // This case should ideally not happen if the Edge Function always returns
         // a known structure with a 200 status.
         return false;
    }


  } catch (err) {
    console.error('handlePostOnTwitter: Error calling Edge Function:', err);
     // TODO: Show a user-friendly error message (e.g., "Network error, try again")
    return false; // Indicate failure
  }
};

 // handleSubmit to wrap and call each handlePost[social account] 

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  //if (!content.trim()) return;

  const postContent = content.trim();
  if (!postContent) {
      console.warn('handleSubmit: Post content is empty.');
      // TODO: Show validation error to the user
      return;
  }    
  
  // Check if there's an active account
if (!activeAccountId) {
    console.warn('handleSubmit: No active account selected.');
    setShowNoSocialModal(true); 
    return;
  }

  setIsPosting(true); // Start posting loading state
  
  try {
    // Get the active account
    const activeAccount = connectedAccounts.find(account => account.id === activeAccountId);
    
    if (!activeAccount) {
      throw new Error('Active account not found');
    }
    
    let success = false;

    // --- Branching logic based on social_channel ---
    if (activeAccount.social_channel === 'Bluesky') {
      // --- Bluesky Posting (Direct Client-Side API Call) ---
      //console.log('handleSubmit: Calling client-side Bluesky post handler.');
      // Call the original handlePostOnBluesky function
      success = await handlePostOnBluesky(postContent, activeAccountId);



    } else if (activeAccount.social_channel === 'LinkedIn' || activeAccount.social_channel === 'Twitter') {
      // --- Backend-Triggered Posting (LinkedIn, Twitter, etc.) ---
      //console.log(`handleSubmit: Handling backend-triggered post for ${activeAccount.social_channel}.`);

      // --- STEP 1: Create a pending post record in the database ---
      // This record will hold the content and link it to the user and social channel
      // Use your standard Supabase client here (not the service role one) as this is frontend
      //console.log('handleSubmit: Creating pending post record in user_post_schedule...');
      // Ensure currentUserId is available in this scope
      if (!currentUserId) {
          console.error('handleSubmit: Current user ID is not available.');
           // TODO: Show an authentication error to the user
           throw new Error('User not authenticated');
      }
      
      
      const { data: newPostData, error: insertError } = await supabase
          .from('user_post_schedule')
          .insert({
                    user_email: currentUserEmail,
                    user_id: activeAccount.user_id,
                    social_channel: activeAccount.social_channel,
                    user_handle: activeAccount.handle,
                    user_display_name: activeAccount.display_name,
                    calendar_name: "User Generated",
                    full_content: postContent,
                    social_post_id: activeAccount.channel_user_id,
                    services: null,
                    target_audience: null,
                    goals: null,
                    topic: null,
                    theme: null,
                    content_date: format(new Date(), 'yyyy-MM-dd'),
                    //content_time: '00:00',
                    content_time: format(new Date(), 'HH:mm'),
                    created_at: new Date().toISOString(),
                    schedule_status: true,
                    sent_post: false,
                })
        
          .select('id') // Select the ID of the newly inserted row
          .single();


      if (insertError || !newPostData) {
          console.error('handleSubmit: Error creating pending post record:', insertError);
          // TODO: Show a database error message to the user
          throw insertError; // Throw to enter the catch block
      }

      const postId = newPostData.id; // Get the ID of the newly created post record
      //console.log('handleSubmit: Pending post record created with ID:', postId);


      // --- STEP 2: Call the appropriate Edge Function trigger handler with the postId ---
      if (activeAccount.social_channel === 'LinkedIn') {
         //console.log('handleSubmit: Calling handlePostOnLinkedIn with postId:', postId);
        // Call the new handlePostOnLinkedIn function, passing the postId
        success = await handlePostOnLinkedIn(postId);

      } else if (activeAccount.social_channel === 'Twitter') {
         //console.log('handleSubmit: Calling handlePostOnTwitter with postId:', postId);
        // TODO: Implement handlePostOnTwitter(postId) similar to handlePostOnLinkedIn
        success = await handlePostOnTwitter(postId);
         //success = false; // Placeholder for Twitter until implemented

      }
      // No else needed here, as the outer if/else if covers the known channels

    } else {
        // --- Handle Unknown/Unsupported Channels ---
         console.warn('handleSubmit: Unsupported social channel selected:', activeAccount.social_channel);
          // TODO: Show an error message about unsupported channel
          throw new Error(`Unsupported social channel: ${activeAccount.social_channel}`);
    }


    // --- Handle the outcome based on the 'success' flag ---
    if (success) {
      //console.log('handleSubmit: Posting process reported success.');
      setContent(''); // Clear content after successful post
      // TODO: Show a success message notification (e.g., "Post is being sent!")
    } else {
      console.error('handleSubmit: Posting process reported failure.');
       // TODO: Show a failure message notification
    }

  } catch (err) {
    console.error('handleSubmit: Error during post submission:', err);
    // Catch errors from initial checks, DB insert, handler function errors, or unsupported channels
    // TODO: Show a general error message to the user (e.g., "An error occurred while posting.")
  } finally {
    setIsPosting(false); // Stop posting loading state
  }
};

  //handle to manage open and closing of content information
// New function to open the ContentCalendarModal
  const handleOpenContentCalendarModal = async () => {
  if (!activeAccountId) {
    console.warn('No active account selected.');
    return;
  }

  try {
    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    const activeAccount = connectedAccounts.find(account => account.id === activeAccountId);
    if (!activeAccount) {
      console.warn('Active account not found.');
      return;
    }

    // Define formattedDate here, as it's specific to this operation
    const today = new Date();
    const formattedDate = format(today, 'yyyy-MM-dd');

    // Set the new state variable with the formatted date
    setModalContentDate(formattedDate); // <-- Set the date here

    const { data, error } = await supabase
      .from('content_calendar')
      .select('id, theme, topic, content')
      .eq('email', session.user.email)
      //.eq('active', true) Need Active column
      .eq('content_date', formattedDate);

    if (error) {
      console.error('Error fetching calendar content:', error);
      return;
    }

    if (data && data.length > 0) {
      setCampaignContent(data);
    } else {
      setCampaignContent([]);
    }

    setIsDraftPostModalOpen(false) //close Draft Modal
    
    setIsContentCalendarModalOpen(true);
  } catch (error) {
    console.error('Error opening content calendar modal:', error);
  } finally {
    setIsLoading(false);
  }
};

  const handleCloseContentCalendarModal = () => {
    setIsContentCalendarModalOpen(false);
    setIsHookListModalOpen(false);
    setIsDraftPostModalOpen(false);
    setIsContentCalendarModalOpen(false);
    setIsSentPostModalOpen(false);    
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();

    const postContent = content.trim();
    if (!postContent) {
      console.warn('handleSaveDraft: Post content is empty.');
      return;
    }

    if (!activeAccountId) {
      console.warn('handleSaveDraft: No active account selected.');
      setShowNoSocialModal(true);
      return;
    }

    setIsPosting(true);

    try {
      const activeAccount = connectedAccounts.find(account => account.id === activeAccountId);

      if (!activeAccount) {
        throw new Error('Active account not found');
      }

      const { data: newPostData, error: insertError } = await supabase
        .from('user_post_draft')
        .insert({
          user_email: currentUserEmail,
          user_id: activeAccount.user_id,
          social_channel: activeAccount.social_channel,
          user_handle: activeAccount.handle,
          user_display_name: activeAccount.display_name,
          full_content: postContent,
          social_post_id: activeAccount.channel_user_id,
          created_at: new Date().toISOString(),
          avatar_url: activeAccount.avatar_url,
        })
        .select('id')
        .single();

      if (insertError || !newPostData) {
        console.error('handleSaveDraft: Error creating draft:', insertError);
        throw insertError;
      }

      setContent('');
     // --- NEW: Trigger the draft success notification ---
    // 1. Show the notification
    setIsDraftSuccessModalOpen(true);

    // 2. Set a timeout to hide the notification after 3 seconds
    setTimeout(() => {
      setIsDraftSuccessModalOpen(false);
    }, 3000); // Notification will be visible for 3 seconds

  } catch (err) {
    console.error('handleSaveDraft: Error saving draft:', err);
    // You can add logic here to display an error message to the user if needed
  } finally {
    setIsPosting(false); // Ensure the loading state is reset
  }
};
  
   //handle to populate the text area

 

  const handleContinueDraft = (content: string, socialChannel: string, userHandle: string) => {
  // Always set the content in the textarea
  setContent(content);

  // Attempt to find the exact account that originated the draft
  const matchingAccount = connectedAccounts.find(
    (acc) => acc.social_channel === socialChannel && acc.handle === userHandle
  );

  if (matchingAccount) {
    // If a matching connected account is found, set it as active
    setActiveAccountId(matchingAccount.id);
    //console.log(`Draft continued for account: ${userHandle} on ${socialChannel}. Tab set.`);
    // UX improvement: Optionally, provide a temporary visual confirmation to the user
    // e.g., a toast notification: "Draft loaded! Account set to @yourhandle (Platform)"
  } else {
    // If no matching account is found among the currently connected ones
    console.warn(`Draft loaded, but original account not found: ${userHandle} on ${socialChannel}.`);
  }
};

const handleEditSentPost = (content: string, socialChannel: string, userHandle: string) => {
  // Always set the content in the textarea
  setContent(content);

  // Attempt to find the exact account that originated the draft
  const matchingAccount = connectedAccounts.find(
    (acc) => acc.social_channel === socialChannel && acc.handle === userHandle
  );

  if (matchingAccount) {
    // If a matching connected account is found, set it as active
    setActiveAccountId(matchingAccount.id);
    //console.log(`Edit continued for account: ${userHandle} on ${socialChannel}. Tab set.`);
    // UX improvement: Optionally, provide a temporary visual confirmation to the user
    // e.g., a toast notification: "Draft loaded! Account set to @yourhandle (Platform)"
  } else {
    // If no matching account is found among the currently connected ones
    console.warn(`Edit loaded, but original account not found: ${userHandle} on ${socialChannel}.`);
  }
};  

  // Truncate display name to 5 characters
  const truncateDisplayName = (name: string | null, handle: string): string => {
    if (!name) return handle.substring(0, 5);
    return name.length > 5 ? name.substring(0, 5) + '...' : name;
  };

// Add this function to handle content generation
  {/*
const handleGenerateContent = async () => {
   if (!content.trim()) return; 
  
  try {
    setIsGenerating(true);
    
    // Get the theme and topic from the selected calendar content
    const improvedContent = await improveComment(content);

    if (!improvedContent.error) {
       setContent(improvedContent.text);
    } else {
      console.error('Error improving content:', improvedContent.error);
      // Optionally show an error message to the user
    }
  } catch (err) {
    console.error('Error generating content:', err);
  } finally {
    setIsGenerating(false);
  }
};
*/}

// Add this function to handle content generation (new geminiBluesky ts)
const handleGenerateContent = async () => {
  if (!content.trim()) return; 
 
 try {
   setIsGenerating(true);
   
   // Get the theme and topic from the selected calendar content
   const improvedContent = await rewritePostForBluesky(content, 300);

   if (!improvedContent.error) {
      setContent(improvedContent.text);
   } else {
     console.error('Error improving content:', improvedContent.error);
     // Optionally show an error message to the user
   }
 } catch (err) {
   console.error('Error generating content:', err);
 } finally {
   setIsGenerating(false);
 }
};   

// Add this function to handle content generation
const handleGenerateLinkedInContent = async () => {
   if (!content.trim()) return; 
  
  try {
    setIsGeneratingLinkedIn(true);
    
    // Get the theme and topic from the selected calendar content
    const improvedContent = await rewritePostForLinkedIn(content, 1000);

    if (!improvedContent.error) {
       setContent(improvedContent.text);
    } else {
      console.error('Error improving content:', improvedContent.error);
      // Optionally show an error message to the user
    }
  } catch (err) {
    console.error('Error generating content:', err);
  } finally {
    setIsGeneratingLinkedIn(false);
  }
};  


// Add this function to handle content generation
const handleGenerateTwitterContent = async () => {
   if (!content.trim()) return; 
  
  try {
    setIsGeneratingTwitter(true);
    
    // Get the theme and topic from the selected calendar content
    const improvedContent = await rewritePostForTwitter(content, 500);

    if (!improvedContent.error) {
       setContent(improvedContent.text);
    } else {
      console.error('Error improving content:', improvedContent.error);
      // Optionally show an error message to the user
    }
  } catch (err) {
    console.error('Error generating content:', err);
  } finally {
    setIsGeneratingTwitter(false);
  }
};    

// New handleSchedulePost function
const handleSchedulePost = () => {
  if (!activeAccountId || !content.trim()) {
    // Optionally show an error or prevent action if content/account is missing
    return;
  }
  setSelectedDateForModal(new Date()); // Set current date
  setSelectedTimeForModal(format(new Date(), 'HH:mm')); // Set current time
  setIsScheduleModalOpen(true);
  setIsSchedulingPost(true); // Indicate that scheduling process has started
  setIsSuccessModalOpen(false);
  setNotificationDetails(null);
};

// Callback for successful scheduling from the modal
const onModalScheduleSuccess = (newPost: any) => {
  setContent('');
  setIsScheduleModalOpen(false);
  setIsSchedulingPost(false);

  setIsSuccessModalOpen(true);

  setNotificationDetails({
    date: new Date(newPost.content_date),
    time: newPost.content_time.substring(0, 5)
  });

  setTimeout(() => {
    setIsSuccessModalOpen(false);
    setNotificationDetails(null);
  }, 3000);
};  

// Callback for errors during scheduling from the modal
const onModalScheduleError = (error: any) => {
  console.error('Error scheduling post from modal:', error);
  setIsScheduleModalOpen(false);
  setIsSchedulingPost(false);
  // Optionally, show an error message to the user
};  
  


  return (

    /*<div className="p-8">
      <div className="max-w-4xl w-3/4">*/
      
<div className="p-4 bg-white min-h-screen">
<div className="max-w-8xl w-3/4">
      <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-50 rounded-full">
                <PlusCircle className="w-5 h-5 text-blue-500"/>
              </div>
              <h2 className="text-gray-900 font-semibold text-xl">Draft Studio</h2>
              
        </div>
        <p className="text-blue-400 font-normal text-sm mb-6 mt-2 bg-blue-50 rounded-md p-2 inline-block border border-blue-100 hover:border-blue-200">
                👋 Welcome to your content scratch pad. Generate posts from ideas, draft posts 
                <br/>from scratch, save your drafts and recycle old posts... 
          </p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Account Tabs */}
            <div className="mb-4 border-b border-gray-200">
              <div className="flex items-center">
                {connectedAccounts.length > 0 ? (
                  <>
                    <div className="flex overflow-x-auto scrollbar-hide">
                      {connectedAccounts.map(account => (
            
                        <button
                          key={account.id}
                          onClick={() => setActiveAccountId(account.id)}
                          className={`flex items-center space-x-2 px-2 py-2 border-b-2 whitespace-nowrap ${
                            activeAccountId === account.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {/*<TooltipHelp text={`${account.display_name}`}>*/}
                          <div className="relative">
                            
                            <img
                              src={account.avatar_url || `https://ui-avatars.com/api/?name=${account.handle}`}
                              alt={account.handle}
                              className="w-6 h-6 rounded-full hover:border-2 hover:border-blue-100"
                            />
                              
                            <div className="absolute -bottom-1 -right-1 bg-gray-50 rounded-full p-0.5 shadow-sm">
                              <img
                                src={
                                        account.social_channel === 'Bluesky' // Is it Bluesky?
                                        ? BlueskyLogo                      // Yes, use Bluesky logo
                                        : account.social_channel === 'LinkedIn' // No, is it LinkedIn?
                                        ? LinkedInLogo                   // Yes, use LinkedIn logo
                                        : XLogo                    // No, assume Twitter (or use a generic fallback here)
                                   }
                                  alt={account.social_channel}
                                  className="w-2 h-2"
                              />
                            </div>
                          </div>
                          {/* REMOVED DISPLAY NAME
                          <span className="text-sm font-medium">
                            {truncateDisplayName(account.display_name, account.handle)}
                          </span>
                          */}
                        </button>
                    
                      ))}
                    </div>
                    
                    {/* Add Account Button */}
                    {/*<TooltipHelp text="Add accounts">*/}
                    
                  <TooltipHelp text={`⚡ add upto ${MAX_FREE_ACCOUNTS} accounts`}>
                    <button
                        onClick={(e) => {
                        e.stopPropagation();
                          if (!isPaidPlan){
                        setShowAddSocialTabModal(true);
                        setIsContentCalendarModalOpen(false);
                        setIsDraftPostModalOpen(false); 
                          } else {
                            if(remainingSocialAccounts > 0){
                                setIsConnectSocialModalOpen(true)
                            } else {
                              setIsProPlanLimitModalOpen(true)
                                   
                            }
                          }
                          
                        }}

                        className="ml-2 px-2 py-2 bg-blue-50 flex items-center text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                     
                        >
                        
                          {/*<Plus className="w-4 h-4"/>  */}
                          <PlusCircle className="w-4 h-4 mr-1"/>
                          <span className="text-sm">Account</span>
                        </button>
                          </TooltipHelp>
                    
                    

                {/* Start Add a button to open the ContentCampaignModal */}
                <TooltipHelp text="⚡ browse ideas">
                    <button
                      onClick={handleOpenContentCalendarModal}
                      className="ml-2 px-2 py-2 bg-blue-50 flex items-center text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors" >
                        <Lightbulb className="w-4 h-4 font-semibold mr-1"/>
                      <span className="text-sm">Ideas</span>
                      </button>
                  </TooltipHelp>
                
                {/* ------------------------ End Add a button to open the ContentCampaignModal --------------------- */}

          {/*-------------------- Start Add button to show draft posts ------------------------------ */}  
          
          <TooltipHelp text={`⚡ (${totalDraftCount}) saved drafts `}>
            
            <button
                onClick={() => {
                  setIsDraftPostModalOpen(!isDraftPostModalOpen); // Open the DraftPostModal
                  setIsContentCalendarModalOpen(false); // Close the ContentCalendarModal
                }}
              
                className="ml-2 px-2 py-2 bg-blue-50 flex items-center text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                // Added 'items-center' to the button's class for vertical alignment
            >
              {/*<FileEdit className="w-4 h-4 mr-1" />*/}
            <Save className="w-4 h-4 mr-1" />
          <span className="text-sm">Drafts</span>
        </button>
       </TooltipHelp>

         {/* End Add button to show draft posts */}

          {/* ----------------- Start Add button to show sent posts ---------------- */}  
                    
         <TooltipHelp text={`⚡ recycle sent posts`}>   
            <button
               onClick={handleOpenSentPostModal}        
               className="ml-2 px-2 py-2 bg-blue-50 flex items-center text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                
            >
              {/*<Recycle className="w-4 h-4" />*/}
          <MailCheck className="w-4 h-4 mr-1" />   
        <span className="text-sm">Sent</span>
        </button>
       </TooltipHelp>

      {/*----------------- End Add button to show sent posts --------------------------- */}

                    
       {/* ----------------- Start Add button Add Hooks to Posts ---------------- */}                      

       <TooltipHelp text={`⚡ 220+ writing hooks`}>   
         <button
            onClick={handleOpenHookListModal} 
            className="ml-2 px-2 py-2 text-xs bg-blue-50 flex items-center text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"    
            >
          
           <BookOpenText className="w-4 h-4 mr-1" />
           <span className="text-sm">Hooks</span>
           
           {/*Add Hook 🪝*/}
        </button>
       </TooltipHelp>     

    {/* ----------------- End Add button Add Hooks to Posts ----------------- */}                      
                    
                    
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full py-2">
                    <span className="text-sm text-gray-500">No accounts connected</span>
                    
                    <button
                      //onClick={handleConnectAccount}
                        onClick={(e) => {
                        e.stopPropagation();
                        setIsConnectSocialModalOpen(true);}}
                      className="flex items-center space-x-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                    >
                      <span>Connect Account</span>
                    </button>
                  
                  </div>
                )}
              </div>
            </div>

            {/* Compose Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-8">             
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={activeAccountId ? " What's on your mind? 💡" : " Connect an account to start posting"}
                  className="w-full h-64 resize-none outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md text-sm"
                  disabled={!activeAccountId || isPosting}
                />

                {/*Add AI button here*/}

                <button
                  id= "Blueskybutton"
                  type="button"
                    onClick={handleGenerateContent}
                    disabled={isGenerating || !activeAccountId || !content.trim() || isPosting}
                    // Remove the outer conditional rendering for the button itself
                  className={`
                              absolute right-8 top-1 p-1 rounded-md shadow-md
                              transition duration-200 flex items-center space-x-1
                            ${
                        content.trim() // If content exists, apply active styles
                            ? 'bg-gray-50 text-gray-50 hover:bg-white hover:to-blue-800'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            }
                      ${
                        (isGenerating || !activeAccountId || !content.trim() || isPosting)
                          ? 'opacity-70' // Reduce opacity when disabled by any condition
                          : ''
                        }
                      `}
                      >
                    {isGenerating ? (
                        <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                          ) : (
                        <TooltipHelp text="⚡ Rewrite for Bluesky">
                        {/*<Sparkles className="w-3 h-3" />*/}
                          <img src={BlueskyLogo} className="w-3 h-3" />
                        </TooltipHelp>
                          )}
                    </button>
                {/*End Add AI Button*/}

                {/*Start New LinkedIn button*/}
                <button
                  id= "LinkedInbutton"
                  type="button"
                    onClick={handleGenerateLinkedInContent}
                    disabled={isGeneratingLinkedIn || !activeAccountId || !content.trim() || isPosting}
                    // Remove the outer conditional rendering for the button itself
                  className={`
                              absolute right-16 top-1 p-1 rounded-md shadow-md
                              transition duration-200 flex items-center space-x-1
                            ${
                        content.trim() // If content exists, apply active styles
                          ? 'bg-gray-50 text-gray-50 hover:bg-white'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            }
                      ${
                        (isGeneratingLinkedIn || !activeAccountId || !content.trim() || isPosting)
                          ? 'opacity-70' // Reduce opacity when disabled by any condition
                          : ''
                        }
                      `}
                      >
                    {isGeneratingLinkedIn ? (
                        <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                          ) : (
                        <TooltipHelp text="⚡ Rewrite for LinkedIn">
                          {/*<Sparkles className="w-3 h-3" />*/}
                          <img src={LinkedInLogo} className="w-3 h-3" />
                        </TooltipHelp>
                          )}
                    </button>
                {/*End New LinkedIn AI Button*/}


             {/*Start New Twitter button*/}
                <button
                  type="button"
                    onClick={handleGenerateTwitterContent}
                    disabled={isGeneratingTwitter || !activeAccountId || !content.trim() || isPosting}
                    // Remove the outer conditional rendering for the button itself
                  className={`
                              absolute right-24 top-1 p-1 rounded-md shadow-md
                              transition duration-200 flex items-center space-x-1
                            ${
                        content.trim() // If content exists, apply active styles
                          ? 'bg-gray-50 text-gray-50 hover:bg-white hover:to-blue-800'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            }
                      ${
                        (isGeneratingTwitter || !activeAccountId || !content.trim() || isPosting)
                          ? 'opacity-70' // Reduce opacity when disabled by any condition
                          : ''
                        }
                      `}
                      >
                    {isGeneratingTwitter ? (
                        <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                          ) : (
                        <TooltipHelp text="⚡ Rewrite for Twitter(X)">
                          {/*<Sparkles className="w-3 h-3" />*/}
                          <img src={XLogo} className="w-3 h-3" />
                          
                        </TooltipHelp>
                          )}
                    </button>
                {/*End New Twitter AI Button*/}


              {/*Start New Delete button*/}
                
                <button
                  
                  type="button"
                   disabled={!activeAccountId || !content.trim() || isSchedulingPost}
                  onClick={() => setContent('')}
                   className="absolute right-32 top-1 p-1 bg-red-100 hover:bg-red-200 rounded-md shadow-md transition duration-200 flex items-center space-x-1 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed">
                  <TooltipHelp text="⚡ Clear Text">
                   <Trash2 className="w-3 h-3 text-red-500" />       
                    </TooltipHelp>
                  </button>
                 
                {/*End New Deletewitter AI Button*/}


              <button                  
                  type="button"
                    //onClick={() => setContent('')}
                  disabled={!activeAccountId || !content.trim() || isSchedulingPost}
                   onClick={() => handleCopyToClipboard(content)}
                   className="absolute right-40 top-1 p-1 bg-blue-100 hover:bg-blue-200 rounded-md shadow-md transition duration-200 flex items-center space-x-1 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed">
                  <TooltipHelp text={copySuccessMap ? "Copied!" : "⚡Copy Post"}>
                   <Copy className="w-3 h-3 text-blue-500" />       
                  </TooltipHelp>
              </button>
                 
                {/*End New Copy Text Button*/}

                
                 <button                  
                   type="button"
                   disabled={!activeAccountId || !content.trim() || isSchedulingPost}
                   //onClick={() => handleCopyToClipboard(content)}//
                   onClick={handleSchedulePost}
                   className="absolute right-48 top-1 px-1 py-0.5 bg-green-100 hover:bg-green-200 border border-green-500 rounded-md transition duration-200 flex items-center space-x-1 disabled:bg-green-50 disabled:border-green-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:opacity-70">

                   
                    {isSchedulingPost ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </>
                     ):(
                     <>
                       
                       <TooltipHelp text="⚡Schedule Post" className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-green-700 disabled:opacity-70" />
                         <span className="text-xs text-green-700">Schedule</span>
                       </TooltipHelp>
                    </>
                     )}
                    
                 
              </button>
                
                 
                {/*End New Copy Text Button*/}


                {/*start linkedin button */}

                {/*   
              <TooltipHelp text={tooltipMessage}>     
                    <span className={`text-xs ${
                      postContent.length > max_length  ? 'text-red-500 bg-red-50 rounded-full p-2' : 'text-green-500 bg-green-50 rounded-full p-2'
                    }`}>
                      {postContent.length}/{max_length} Characters
                    </span>      
             </TooltipHelp>
          */}
                         
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm mt-4 text-gray-500">
                      <span className={`text-sm ${
                          content.length > max_length  
                              ? 'text-red-500 bg-red-50 rounded-full p-2' 
                              : 'text-green-500 bg-green-50 rounded-full p-2'
                                }`}>                    
                                    {max_length - content.length} characters remaining
                      </span>
                  </div>

                  <div className="flex items-center mt-4 pt-4 space-x-2">

                  <button
                    type="submit"
                    disabled={!activeAccountId || !content.trim() || isPosting}
                      className="px-4 py-2 bg-gray-100 text-sm text-gray-500 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300"
                    onClick={handleSaveDraft}
                  >
                    {isPosting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Draft...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Draft</span> 
                      </>
                    )}
                  </button>

                    {/*
                   <button
                    type="button" // Changed to type="button" to prevent form submission
                    disabled={!activeAccountId || !content.trim() || isSchedulingPost}
                      className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors flex items-center space-x-2 disabled:bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    onClick={handleSchedulePost}
                  >
                    {isSchedulingPost ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scheduling Post...</span>
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="w-4 h-4" />
                        <span>Schedule Post</span>
                      </>
                    )}
                  </button>
                  */}

           <TooltipExtended text={getNextButtonTooltip()} show={!canProceedToPost()}>                    
                  <button
                    key={activeAccount?.id || 'no-account'}
                    type="submit"
                    disabled={!activeAccountId || !content.trim() || isPosting || !canProceedToPost()}
                    className="px-4 py-2 bg-blue-500 text-sm text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {isPosting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{activeAccount?.social_channel ? `Post on ${activeAccount.social_channel}` : 'Post'}</span> 
                      </>
                    )}
                  </button>
           </TooltipExtended>
                  </div>
                  
                </div>
              </div>
          
            </form>
             <FirstLineProgress />
                {firstLineLength <= MAX_FIRST_LINE ? (
                  <p className="text-xs text-green-500">
                    First line readability tracker
                  </p>
                ) : (
                  <p className="text-xs text-red-500">
                    First line should be under {MAX_FIRST_LINE} characters for better readability
                  </p>
                )}

                {isUpdating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}
          </>
        )}
        
      </div>

      <NoSocialModal
        isOpen={showNoSocialModal}
        onClose={() => setShowNoSocialModal(false)}
        onConnectBluesky={handleConnectBluesky}
        onConnectLinkedIn={handleConnectLinkedIn}
      />

      <ConnectSocialModal
        isOpen={isConnectSocialModalOpen}
        onClose={() => setIsConnectSocialModalOpen(false)}
        onConnectBluesky={handleConnectBluesky}
        onConnectLinkedIn={handleConnectLinkedIn}
        setIsBlueskyModalOpen={setIsBlueskyModalOpen}
      />

      <AddSocialTabModal
        isOpen={showAddSocialTabModal}
        onClose={() => setShowAddSocialTabModal(false)}
        onRequestMoreBlueskyAccounts={handleRequestMoreBlueskyAccounts}
        onRequestMoreLinkedInAccounts={handleRequestMoreLinkedInAccounts}
        onRequestMoreTwitterAccounts={handleRequestMoreTwitterAccounts}
        isPaidPlan={isPaidPlan}
        remainingSocialAccounts={remainingSocialAccounts}
      />

      <MoreBlueskyAccounts 
         isOpen={isModalOpen} 
         onClose={() => {
           setIsModalOpen(false);
           setShowAddSocialTabModal(false);
         }} // Closes the second modal
      />

     <MoreLinkedInAccounts 
         isOpen={isLinkedInModalOpen} 
         onClose={() => {
           setIsLinkedInModalOpen(false);
           setShowAddSocialTabModal(false);
         }} // Closes the second modal
      />

    <MoreTwitterAccounts 
         isOpen={isTwitterModalOpen} 
         onClose={() => {
           setIsTwitterModalOpen(false);
           setShowAddSocialTabModal(false);
         }} // Closes the second modal
      />
      
      <CreateBlueskyModal 
        isOpen={isBlueskyModalOpen}
        onClose={handleCloseBlueskyModal}
        isPaidPlan={isPaidPlan}
      />

      <ContentCalendarModal
        isOpen={isContentCalendarModalOpen}
        onClose={handleCloseContentCalendarModal}
        // Pass the entire array of content items
        contentItems={campaignContent || []} // Ensure it's always an array
        content_date={modalContentDate} // Pass the string date for the header
        onRewriteContent={handleRewriteContent} 
        />

      <DraftPostModal
          isOpen={isDraftPostModalOpen}
          onClose={() => setIsDraftPostModalOpen(false)
                
          }
          onContinueDraft={handleContinueDraft}
         />

      {/* NEW: Sent Posts Modal */}
        <SentPostModal
          isOpen={isSentPostModalOpen}
          onClose={handleCloseSentPostModal}
          onEditSentPost={handleEditSentPost}
        />

       {/* NEW: Hook List Modal */}
        <HookListModal
          isOpen={isHookListModalOpen}
          onClose={handleCloseHookListModal}
          onUseHook={handleUseHook} 
          currentComposeContent={content} 
          onRewriteHook={handleRewriteHook} 
        />

       {/* Upgrade Modal After Free Trial Runs Out */}
      <ProPlanLimitModal
          isOpen={isProPlanLimitModalOpen}
          onClose={handleCloseProPlanLimitModal}
          message={modalMessage} 
        />

        {/* SchedulePostModal Integration */}
      <ScheduleDraftPost
          isOpen={isScheduleModalOpen}
          onClose={() => {
              setIsScheduleModalOpen(false);
              setIsSchedulingPost(false); // Reset scheduling state on close
          }}
          selectedDate={selectedDateForModal}
          selectedTime={selectedTimeForModal}
          initialContent={content} // Pass current content
          onSchedule={onModalScheduleSuccess}
          onScheduleError={onModalScheduleError}
      />

      {/* --- RENDER THE SUCCESS POP-UP NOTIFICATION --- */}
      {isSuccessModalOpen && notificationDetails && ( // Use the renamed state here
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-green-100 p-4 flex items-center space-x-3 animate-fade-in z-[9999]">
          <div className="bg-green-100 rounded-full p-2">
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Post Scheduled Successfully</p>
            <p className="text-sm text-gray-500">
              Your post will be published on {format(notificationDetails.date, 'MMM d')} at {notificationDetails.time}
            </p>
          </div>
        </div>
      )}

{isDraftSuccessModalOpen ? (
  <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg border border-green-100 p-4 flex items-center space-x-3 animate-fade-in z-[9999]">
    <div className="bg-green-100 rounded-full p-2">
      <Check className="w-5 h-5 text-green-500" />
    </div>
    <div>
      <p className="font-medium text-gray-900">Draft Saved Successfully</p>
      <p className="text-sm text-gray-500">
        Click view drafts to edit and rewrite your drafts
      </p>
    </div>
  </div>
) : null}
           
    </div>
  );
}

export default ComposePosts;