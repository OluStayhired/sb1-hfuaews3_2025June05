import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { CalendarCheck, Sparkles, PenSquare, ThumbsUp, Calendar, Clock, Users, LogOut, ChevronDown, PenTool, UserPlus, Megaphone, Settings, Puzzle, AlertCircle, CreditCard, Globe, Target, Combine, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ComposePosts from '../components/ComposePosts';
import ManageSchedule from '../components/ManageSchedule';
import ViewCalendars from '../components/ViewCalendars';
import CreateCampaign from '../components/CreateCampaign';
import AccessAccounts from '../components/AccessAccounts';
import ShowCalendarContent from '../components/ShowCalendarContent';
import BlueskyLogo from '../images/bluesky-logo.svg';
import XLogo from '../images/x-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import { supabase } from '../lib/supabase';
import { CreateBlueskyModal } from '../components/CreateBlueskyModal';
import { useBlueskyStore } from '../store/blueskyStore';
import { MoreBlueskyAccounts } from '../components/MoreBlueskyAccounts';
import { MoreLinkedInAccounts } from '../components/MoreLinkedInAccounts';
import { MoreTwitterAccounts } from '../components/MoreTwitterAccounts';
import { CreateCalendarForm } from '/src/components/CreateCalendarForm';
import { CampaignSuccessfulModal } from '../components/CampaignSuccessfulModal';
import { ManageScheduleSlots } from '../components/ManageScheduleSlots';
import { UserDashboard } from '../components/UserDashboard';
import { OnboardSuccessPage } from '../components/OnboardSuccessPage';
import { SettingsPage } from '../components/SettingsPage';
import { FeedbackPage } from '../components/FeedbackPage';
import { PaymentSuccessPage } from '../components/PaymentSuccessPage';
import { PaymentCancelPage } from '../components/PaymentCancelPage';
import { PricingPage } from '../components/PricingPage';
import { v4 as uuidv4 } from 'uuid';
import { TooltipHelp } from '../utils/TooltipHelp';
import { CalendarList } from '../components/CalendarList';
import { useProductTier } from '../hooks/useProductTierHook'


function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isBlueskyModalOpen, setIsBlueskyModalOpen] = useState(false);
  const { isAuthenticated: isBlueskyAuthenticated } = useBlueskyStore();
  const { user: blueskyUser } = useBlueskyStore();
  const { login } = useBlueskyStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);
  const [isTwitterModalOpen, setIsTwitterModalOpen] = useState(false);
  const [isCampaignSuccessModalOpen, setIsCampaignSuccessModalOpen] = useState(false);
  const [createdCampaignName, setCreatedCampaignName] = useState('');

    //Twitter OAUTH
  const [twitterUser, setTwitterUser] = useState<SocialAccount | null>(null);
  const [disconnectingTwitterAccount, setDisconnectingTwitterAccount] = useState<string | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialChannelAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  
  //LinkedIn VITE
  const VITE_LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
  const VITE_LINKEDIN_REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;
  const VITE_FINAL_REDIRECT_URL = import.meta.env.VITE_FINAL_REDIRECT_URL;

  //Twitter VITE
  const VITE_TWITTER_CLIENT_ID = import.meta.env.VITE_TWITTER_CLIENT_ID;
  const VITE_TWITTER_REDIRECT_URI = import.meta.env.VITE_TWITTER_REDIRECT_URI;
  
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // LinkedIn OAUTH
  const [linkedinUser, setLinkedinUser] = useState<SocialAccount | null>(null);
  const [disconnectingLinkedInAccount, setDisconnectingLinkedInAccount] = useState<string | null>(null);
  const [linkedinLoading, setLinkedinLoading] = useState(false);

  // NEW: State to track if the user has a paid account
  const [isPaidAccount, setIsPaidAccount] = useState(false);

   // Use a useEffect to get the current user's email after session loads
  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
      }
    };
    fetchUserEmail();
  }, []); // Run once on mount to get the initial user email



//---- NEW Hook to Capture all Account Type Paramenters -----//
    const {
    isLoading,
    error,
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
    remainingCampaigns,
    remainingSocialAccounts,
  } = useProductTier(supabase, currentUserEmail);
  
// --- ADDED FOR DEBUGGING MODAL STATE ---
  useEffect(() => {
    console.log('isBlueskyModalOpen state changed:', isBlueskyModalOpen);
  }, [isBlueskyModalOpen]);

  useEffect(() => {
    console.log('isModalOpen (MoreBlueskyAccounts) state changed:', isModalOpen);
  }, [isModalOpen]);
  // --- END DEBUGGING ADDITION ---
  

// NEW: useEffect to check user's account type 
useEffect(() => {
  // Function to initially fetch account type and update state
  const fetchAndSetAccountType = async () => {
    if (!user?.id) {
      setIsPaidAccount(false); // Not paid if no user is logged in
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('account_type')
        .eq('user_id', user.id) // Ensure 'user_id' column is used
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching account type:', error);
        setIsPaidAccount(false); // Default to free on error
        return;
      }

      // Assuming 'Pro' or 'Paid' indicates a paid account
      if (data?.account_type === 'Pro Plan' || data?.account_type === 'Paid') {
        setIsPaidAccount(true);
      } else {
        setIsPaidAccount(false);
      }
    } catch (err) {
      console.error('Unexpected error checking account type initially:', err);
      setIsPaidAccount(false); // Default to free on unexpected error
    }
  };

  // Function to set up the Realtime subscription
  const setupRealtimeSubscription = () => {
    if (!user?.id) {
      return undefined; // No user, no subscription to set up
    }

    console.log(`Setting up Realtime subscription for user_id: ${user.id}`);

    // Subscribe to changes specifically for this user's row in 'user_preferences'
    const channel = supabase
      .channel(`user_preferences_update:${user.id}`) // Create a unique channel name per user
      .on(
        'postgres_changes', // Listen for Postgres changes
        {
          event: 'UPDATE', // Specifically interested in UPDATE events
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user.id}`, // Filter to only receive updates for this user's row
        },
        (payload) => {
          console.log('Realtime update received for user_preferences:', payload);
          // Check the new value of 'account_type' from the payload
          const newAccountType = (payload.new as { account_type: string }).account_type;

          if (newAccountType === 'Pro Plan' || newAccountType === 'Paid') {
            setIsPaidAccount(true);
          } else {
            setIsPaidAccount(false);
          }
        }
      )
      .subscribe(); // Start listening for changes

    // Return a cleanup function for useEffect
    return () => {
      console.log(`Unsubscribing from user_preferences_update:${user.id} channel.`);
      supabase.removeChannel(channel); // Clean up the subscription when component unmounts or user changes
    };
  };

  // 1. Perform initial fetch (important for displaying current state immediately)
  fetchAndSetAccountType();

  // 2. Set up the Realtime subscription
  const cleanupRealtime = setupRealtimeSubscription();

  // 3. Return the cleanup function for useEffect
  return () => {
    if (cleanupRealtime) {
      cleanupRealtime();
    }
  };

}, [user?.id]); // Dependency array: Re-run this effect when user.id changes (login/logout)  
  

  const checkActiveSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return false; // No user session, so no active accounts
    }

    const { data: activeAccounts, error } = await supabase
      .from('social_channels')
      .select('id, social_channel, handle, display_name, avatar_url')
      .eq('email', session.user.email)
      .in('social_channel', ['Bluesky', 'Twitter', 'LinkedIn']) 
      .eq('activated', true);

    if (error) {
      console.error('Error checking active sessions:', error);
      return false;
    }

    // Return the actual active accounts data, not just a boolean.
    // This allows you to process it later.
    return activeAccounts || []; // Return an empty array if no data
  } catch (err) {
    console.error('Error checking for active sessions:', err);
    return []; // Return an empty array on error
  }
  fetchAccounts();
};   

  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoadingAccounts(true);
      const accounts = await checkActiveSession(); // Use the refined checkActiveSession
      setConnectedAccounts(accounts);
      setIsLoadingAccounts(false);
      
    };
    fetchAccounts();
  }, []); // Run once on component  mount

  const refreshConnectedAccounts = useCallback(async () => {
      setIsLoadingAccounts(true);
      const accounts = await checkActiveSession();
      setConnectedAccounts(accounts);
      setIsLoadingAccounts(false);
   }, [checkActiveSession]);

useEffect(() => {
  const checkAndConnectBluesky = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        return;
      }

      if (!isBlueskyAuthenticated) {
        await handleAutoConnectBsky();
      }
    } catch (err) {
      console.error('Error in auto-connect check:', err);
    }
  };

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      refreshConnectedAccounts();
      checkAndConnectBluesky();
    }
  });

  checkAndConnectBluesky();

  return () => {
    subscription.unsubscribe();
  };
}, [isBlueskyAuthenticated]);



  
  const menuItems = [
    //{ icon: <Clock className="w-5 h-5" />, label: 'Create Schedule', path: 'schedule' },
    //{ icon: <Megaphone className="w-4 h-4" />, label: 'Create Campaign', path: 'campaign/createcalendarform' },
    { icon: <Megaphone className="w-4 h-4" />, label: 'Create Campaign', path: 'campaign' },
    { icon: <UserPlus className="w-4 h-4" />, label: 'Connect Accounts', path: 'accounts' },
    { icon: <Clock className="w-4 h-4" />, label: 'Add Schedule', path: 'slots' },
    { icon: <Settings className="w-4 h-4" />, label: 'Account Settings', path: 'settings' },
    
  ];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

const handleConnectBluesky = () => {
    //console.log('Connecting to Bluesky');
  setIsBlueskyModalOpen(true);
};

const handleCloseBlueskyModal = () => {
    setIsBlueskyModalOpen(false);
  };

  const handleAutoConnectBsky = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      console.error('No authenticated user found');
      return;
    }

//added maybeSingle to this because new accounts don't have social media connected    
    const { data: activeAccount, error } = await supabase
      .from('social_channels')
      .select('handle, app_password')
      .match({
        email: session.user.email,
        social_channel: 'Bluesky',
        activated: true
      })
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No active Bluesky account found');
        return;
      }
      throw error;
    }

    if (activeAccount?.handle && activeAccount?.app_password) {
      await login(activeAccount.handle, activeAccount.app_password, true);
      console.log('Auto-connected to Bluesky');
    }

  } catch (err) {
    console.error('Error auto-connecting to Bluesky:', err);
  }
};

const checkActiveBlueskySession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return false;
    }

    const { data: activeAccounts, error } = await supabase
      .from('social_channels')
      .select('id')
      .match({
        email: session.user.email,
        social_channel: 'Bluesky',
        activated: true
      });

    if (error) {
      console.error('Error checking active sessions:', error);
      return false;
    }

    return activeAccounts && activeAccounts.length > 0;
  } catch (err) {
    console.error('Error checking Bluesky session:', err);
    return false;
  }
};

const checkActiveLinkedInSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return false;
    }

    const { data: activeAccounts, error } = await supabase
      .from('social_channels')
      .select('id')
      .match({
        email: session.user.email,
        social_channel: 'LinkedIn',
        activated: true
      });

    if (error) {
      console.error('Error checking active sessions:', error);
      return false;
    }

    return activeAccounts && activeAccounts.length > 0;
  } catch (err) {
    console.error('Error checking LinkedIn session:', err);
    return false;
  }
};  

const checkActiveTwitterSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return false;
    }

    const { data: activeAccounts, error } = await supabase
      .from('social_channels')
      .select('id')
      .match({
        email: session.user.email,
        social_channel: 'Twitter',
        activated: true
      });

    if (error) {
      console.error('Error checking active sessions:', error);
      return false;
    }

    return activeAccounts && activeAccounts.length > 0;
  } catch (err) {
    console.error('Error checking LinkedIn session:', err);
    return false;
  }
};    

 

const handleRequestMoreBskyAcct = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      console.error('No authenticated user found');
      return;
    }

    const { data: existingAccounts, error } = await supabase
      .from('social_channels')
      .select('id')
      .match({
        email: session.user.email,
        social_channel: 'Bluesky'
      });

    if (error) {
      console.error('Error checking social channels:', error);
      return;
    }

    if (existingAccounts && existingAccounts.length > 0) {
      setIsModalOpen(true);
    } else {
      console.log('Please connect a Bluesky account first');
    }

  } catch (err) {
    console.error('Error checking Bluesky accounts:', err);
  }
};

const handleBlueskyButtonClick = async () => {
  const hasActiveSession = await checkActiveBlueskySession();
// free plans and early adopters  
if (!isPaidPlan) {  
  if (hasActiveSession) {    
    handleRequestMoreBskyAcct();
  } else {    
    handleConnectBluesky();
  }
} else {
  if (remainingSocialAccounts > 0 ) {
   handleConnectBluesky();
    }
  }
     
};  

const handleLinkedInButtonClick = async () => {
  const hasActiveLinkedInSession = await checkActiveLinkedInSession();
  
   // free plans and early adopters  
    if (!isPaidPlan) {  
        if (hasActiveSession) {        
            handleRequestMoreLinkedInAcct();
      } else {
            handleConnectLinkedIn();
        }  
      } else {
    if (remainingSocialAccounts > 0 ) {
           handleConnectLinkedIn();
      }
    } 
};    

const handleTwitterButtonClick = async () => {
  const hasActiveTwitterSession = await checkActiveTwitterSession();
  
     // free plans and early adopters  
    if (!isPaidPlan) {  
        if (hasActiveSession) {        
            handleRequestMoreTwitterAcct();
      } else {
             handleConnectTwitter();
        }  
      } else {
    if (remainingSocialAccounts > 0 ) { // make sure you have social credits
           handleConnectTwitter();
      }
    }  
};     

  const blueskyButtonContent = isBlueskyAuthenticated ? (
    <span className="text-green-600">Connected to Bluesky</span>
  ) : (
    <span>Connect Bluesky</span>
  ); 


// --- Helper function for PKCE ---
// Required for Twitter OAuth 2.0 (PKCE)
const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};
  
// twitter helper functions
const base64urlencode = (input: ArrayBuffer): string => {
  const bytes = new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const generateCodeChallenge = async (code_verifier: string): Promise<string> => {
  const hashed = await sha256(code_verifier);
  return base64urlencode(hashed);
};

//handleconnect Twitter
const handleConnectTwitter = async () => {
  console.log('handleConnectTwitter: initiated');
  setTwitterLoading(true); // Start loading indicator

  try {
    // 1. Get current user's session to ensure we're authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('handleConnectTwitter: No authenticated user found or session error:', sessionError);
      return;
    }

    const currentUserId = session.user.id;
    const currentUserEmail = session.user.email;
    const frontendOrigin = window.location.origin;
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // 2. Generate PKCE code_verifier and code_challenge
    //    code_verifier: A high-entropy random string
    //    code_challenge: SHA256 hash of the verifier, base64url encoded
    const code_verifier = uuidv4() + uuidv4(); 
    const code_challenge = await generateCodeChallenge(code_verifier);

    // 3. Generate a unique state parameter for security (standard OAuth param)
    const uniqueState = uuidv4();

    // 4. Store the state AND the code_verifier in the database linked to the user ID
    //    The code_verifier is needed by the backend/Edge Function callback to exchange the code
    try {
      const { error: stateError } = await supabase
        .from('oauth_states') // Assuming 'oauth_states' is the table to store temporary OAuth data
        .insert({
          state: uniqueState,
          code_verifier: code_verifier, // <--- Store the verifier!
          user_id: currentUserId,
          email: currentUserEmail,
          frontend_origin: frontendOrigin,
          user_timezone: userTimezone,
          // Add a timestamp and perhaps an expiry for cleanup
          created_at: new Date().toISOString(),
        });


      

      if (stateError) {
        console.error('handleConnectTwitter: Error storing OAuth state and code_verifier:', stateError);
        setTwitterLoading(false); 
       
        return;
      }

      //console.log('handleConnectTwitter: OAuth state and code_verifier stored successfully:', uniqueState);

    } catch (dbError) {
      console.error('handleConnectTwitter: Unexpected error storing OAuth data:', dbError);
      setTwitterLoading(false); 
      
      return;
    }

    // 5. Define the required Twitter permissions (scopes)
    //    These depend on what your app needs to do (read tweets, post tweets, etc.)
    //    'offline.access' is usually needed to get a refresh token
    const twitterScopes = [
      'tweet.read',
      'users.read',
      'tweet.write', 
      'offline.access', // Required to get a refresh token for long-term access
      // Add other scopes as needed based on Twitter API docs
    ];
    const scopeParam = encodeURIComponent(twitterScopes.join(' ')); 
    // Twitter scopes are space-separated, not comma-separated

    // 6. Construct the Twitter (X) authorization URL (OAuth 2.0 endpoint)
    //    Verify the latest endpoint and required parameters in the Twitter Developer documentation
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
                    `response_type=code&` +
                    `client_id=${encodeURIComponent(VITE_TWITTER_CLIENT_ID)}&` + // Use your Twitter Client ID env var
                    `redirect_uri=${encodeURIComponent(VITE_TWITTER_REDIRECT_URI)}&` + // THIS IS YOUR EDGE FUNCTION URL for the Twitter callback
                    `state=${encodeURIComponent(uniqueState)}&` + // Send the state back
                    `scope=${scopeParam}&` + // Send the requested scopes
                    `code_challenge=${encodeURIComponent(code_challenge)}&` + // Send the code challenge
                    `code_challenge_method=S256`; // Indicate the challenge method

    //console.log('handleConnectTwitter: Redirecting user to Twitter authorization URL:', authUrl);

    // 7. Redirect the user's browser to Twitter's authorization page
    //    The Edge Function will take over when Twitter redirects back to REDIRECT_URI
    window.location.href = authUrl;

    // Note: setTwitterLoading(false) is typically not called here because
    // window.location.href navigates away from the current page.
    // The loading state is effectively reset when the new page loads (or fails to load).

  } catch (generalError) {
    // Catch any errors before the database save/redirect
    console.error('handleConnectTwitter: An unexpected error occurred before redirection:', generalError);
    setTwitterLoading(false); 
  }
};  

  const handleConnectLinkedIn = async () => {
  //console.log('Connecting to LinkedIn...');
  //console.log('LinkedIn Client ID:', VITE_LINKEDIN_CLIENT_ID);
  //console.log('LinkedIn Redirect URI:', VITE_LINKEDIN_REDIRECT_URI);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.error('No authenticated user found. User must be logged in to connect LinkedIn.');
      return;
    }
    //console.log('Authenticated user ID:', session.user.id);

    const currentUserId = session.user.id;
    const currentUserEmail = session.user.email;
    const frontendOrigin = window.location.origin; 
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const uniqueState = uuidv4();

    try {
      const { error: stateError } = await supabase
        .from('oauth_states')
        .insert({
          state: uniqueState,
          user_id: currentUserId,
          email: currentUserEmail,
          frontend_origin: frontendOrigin,
          user_timezone: userTimezone,
        });

      if (stateError) {
        console.error('Error storing OAuth state:', stateError);
        return;
      }

      //console.log('OAuth state stored successfully:', uniqueState);

    } catch (error) {
      console.error('Unexpected error storing OAuth state:', error);
      return;
    }

    const linkedinScopes = ['openid', 'profile', 'email', 'w_member_social'];
    const scopeParam = encodeURIComponent(linkedinScopes.join(' '));

    const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
                            `response_type=code&` +
                            `client_id=${encodeURIComponent(VITE_LINKEDIN_CLIENT_ID!)}&` +
                            `redirect_uri=${encodeURIComponent(VITE_LINKEDIN_REDIRECT_URI!)}&` +
                            `scope=${scopeParam}&` +
                            `state=${encodeURIComponent(uniqueState)}`;

    //console.log('Redirecting user to LinkedIn authorization URL:', linkedInAuthUrl);

    window.location.href = linkedInAuthUrl;

  } catch (err) {
    console.error('Error connecting to LinkedIn:', err);
  }
};

  const handleRequestMoreLinkedInAcct = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      console.error('No authenticated user found');
      return;
    }

    const { data: existingAccounts, error } = await supabase
      .from('social_channels')
      .select('id')
      .match({
        email: session.user.email,
        social_channel: 'LinkedIn'
      });

    if (error) {
      console.error('Error checking social channels:', error);
      return;
    }

    if (existingAccounts && existingAccounts.length > 0) {
      setIsLinkedInModalOpen(true);
    } else {
      console.log('Please connect a LinkedIn account first');
    }

  } catch (err) {
    console.error('Error checking LinkedIn accounts:', err);
  }
};

 const handleRequestMoreTwitterAcct = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      console.error('No authenticated user found');
      return;
    }

    const { data: existingAccounts, error } = await supabase
      .from('social_channels')
      .select('id')
      .match({
        email: session.user.email,
        social_channel: 'Twitter'
      });

    if (error) {
      console.error('Error checking social channels:', error);
      return;
    }

    if (existingAccounts && existingAccounts.length > 0) {
      setIsTwitterModalOpen(true);
    } else {
      console.log('Please connect a LinkedIn account first');
    }

  } catch (err) {
    console.error('Error checking LinkedIn accounts:', err);
  }
};  

  const handleCampaignSuccess = (campaignName: string) => {
    setCreatedCampaignName(campaignName);
    setIsCampaignSuccessModalOpen(true);
  };

const twitterConnectedUser = connectedAccounts.find(acc => acc.social_channel === 'Twitter');  
const linkedinConnectedUser = connectedAccounts.find(acc => acc.social_channel === 'LinkedIn');

const isTwitterAuthenticated = !!twitterUser;
const isLinkedInAuthenticated = !!linkedinUser;  

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          
          <div className="flex items-center justify-between"> {/*space-x-8">*/}
            
            <div className="flex items-center space-x-2">
              <div className="bg-blue-600 rounded-full p-2 rotate-180">
                <PenTool className="h-6 w-6 fill-white stroke-blue-600" />
              </div>
              <span className="text-xl font-medium text-gray-900">SoSavvy</span>
            </div>
          
            <div className="ml-24 flex items-center space-x-8">
              <button 
                onClick={() => navigate('calendars')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname.includes('calendars')
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="font-medium">Campaigns</span>
              </button>

              <button 
                onClick={() => navigate('schedule')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname.includes('schedule')
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="font-medium">Posts</span>
              </button>

              <button 
                onClick={() => navigate('compose')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname.includes('compose')
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="font-medium">Drafts</span>
              </button>

                <button 
                onClick={() => navigate('userdashboard')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname.includes('userdashboard')
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="font-medium">Dashboard</span>
              </button>

              <button 
                onClick={() => navigate('feedback')}
                className={`flex bg-blue-50 items-center space-x-2 px-4 py-1 rounded-lg transition-colors ${
                  location.pathname.includes('feedback')
                    ? 'text-blue-500'
                    : 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                       <ThumbsUp className="w-3.5 h-3.5"/>        
                <span className="font-medium">Feedback</span>
              </button>

          {/*Using the Paid Plan logic from the useProductTierHook hook */}
          {/*!isPaidPlan && (*/}
            {!isPaidAccount && (          
             
                <button 
                  onClick={() => navigate('pricing')}
                  className={`flex bg-blue-600 items-center space-x-2 px-4 py-1 rounded-lg transition-colors ${
                    location.pathname.includes('pricing')
                      ? 'text-white'
                      : 'text-white hover:bg-blue-500'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5"/>        
                  <span className="font-medium">Upgrade Now</span>
                </button>
              )}

              {/*
               <button 
                onClick={() => navigate('feedback')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname.includes('feedback')
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="font-medium">Feedback</span>
              </button>
              */}
              
            </div>


            
          </div>
          
          


          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {user.email?.[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        <aside className="w-64 bg-white border-r border-gray-200">

         {
        (
    isBlueskyAuthenticated ||
    (linkedinConnectedUser && checkActiveLinkedInSession) ||
    (twitterConnectedUser && checkActiveTwitterSession)
       ) &&
        
        ( 
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Connected Accounts</h3>

            {/*<div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-white rounded-lg">*/}
            
            <div className="flex items-center space-x-3 p-1 rounded-lg">
              
          {isBlueskyAuthenticated && (   
            <TooltipHelp text={`${blueskyUser.displayName || blueskyUser.handle || 'Bluesky User'}`}>
              <div className="relative"> 
                <img
                  src={blueskyUser?.avatar || `https://ui-avatars.com/api/?name=${blueskyUser?.handle}`}
                  alt={blueskyUser?.handle}
                  className="w-10 h-10 rounded-full"
                />
                
                <div className="absolute -bottom-1 -right-1 bg-blue-50 border border-blue-100  rounded-full p-1 shadow-sm">
                  <img
                    src={BlueskyLogo}
                    alt="Bluesky"
                    className="w-3 h-3"
                  />
                </div>
                
              </div> 
            </TooltipHelp> 
            
              )}

              {linkedinConnectedUser && checkActiveLinkedInSession && (   
              <TooltipHelp text={`${linkedinConnectedUser.display_name}`}>
              <div className="relative"> 
                <img
                  src={linkedinConnectedUser?.avatar_url || `https://ui-avatars.com/api/?name=${linkedinConnectedUser?.handle}`}
                  alt={linkedinConnectedUser?.handle}
                  className="w-10 h-10 rounded-full"
                />
                
                <div className="absolute -bottom-1 -right-1 bg-blue-50 border border-blue-100   rounded-full p-1 shadow-sm">
                  <img
                    src={LinkedInLogo}
                    alt="Bluesky"
                    className="w-3 h-3"
                  />
                </div>
                
              </div> 
            </TooltipHelp> 
            )}

         {twitterConnectedUser && checkActiveTwitterSession && (   
            <TooltipHelp text={`${twitterConnectedUser.display_name}`}>
              <div className="relative"> 
                <img
                  src={twitterConnectedUser?.avatar_url || `https://ui-avatars.com/api/?name=${twitterConnectedUser?.handle}`}
                  alt={twitterConnectedUser?.handle}
                  className="w-10 h-10 rounded-full"
                />
                
                <div className="absolute -bottom-1 -right-1 bg-blue-50 border border-blue-100  rounded-full p-1 shadow-sm">
                  <img
                    src={XLogo}
                    alt="Bluesky"
                    className="w-3 h-3"
                  />
                </div>
                
              </div> 
            </TooltipHelp> 
            )}
                                  
      </div>
  </div>
)} 

          <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-3"> {/* Added flex, items-center, space-x-2 */}
        
          <span className="bg-blue-50 px-3 py-3 rounded-full p-1 text-blue-500"><PlusCircle className="h-5 w-5"/></span>
            <h3 className="text-lg font-medium text-blue-500 m-0 p-0">Channels</h3> 
        
        </div>
            
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleBlueskyButtonClick}
                className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                  <img src={BlueskyLogo} alt="Bluesky" className="w-3.5 h-3.5" />
                </div>
                <span>Connect Bluesky</span>
              </button>

              <button
                onClick={handleLinkedInButtonClick}
                className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                  <img src={LinkedInLogo} alt="LinkedIn" className="w-3.5 h-3.5" />
                </div>
                <span>Connect LinkedIn</span>
              </button>

              <button
                onClick={handleTwitterButtonClick}
                className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                  <img src={XLogo} alt="LinkedIn" className="w-3.5 h-3.5" />
                </div>
                <span>Connect Twitter/X</span>
              </button>
            </div>
          </div>

          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                      location.pathname.includes(item.path)
                        ? 'bg-blue-50 text-blue-500'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >

                    
                    
                    <span className="bg-blue-50 rounded-full p-2 text-blue-500">{item.icon} </span>

                    
                    <span>{item.label}</span>

                    
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 overflow-auto">
          <Routes>
            {/*<Route index element={<UserDashboard />} />*/}
            <Route path="compose" element={<ComposePosts />} />
            <Route path="schedule" element={<ManageSchedule />} />
            <Route path="calendars" element={<ViewCalendars />} />
            <Route path="calendar-list" element={<CalendarList />} />
            <Route path="calendars/:calendarName" element={<ShowCalendarContent />} /> 
            <Route path="campaign" element={<CreateCampaign />} />
            <Route path="userdashboard" element={<UserDashboard />} />
            <Route path="feedback" element={<FeedbackPage />} />
            

            {/*<Route path="accounts" element={<AccessAccounts />} />*/}
            
            <Route path="accounts" element={<AccessAccounts refreshDashboardAccounts={refreshConnectedAccounts} />} />
            <Route path="slots" element={<ManageScheduleSlots />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="onboarding-success" element={<OnboardSuccessPage />} />
            <Route path="campaign/createcalendarform" element={<CreateCalendarForm />} />
            <Route path="success" element={<PaymentSuccessPage />} />
            <Route path="cancel" element={<PaymentCancelPage />} />
            <Route path="pricing" element={<PricingPage />} />
            
            {/*Default Route Shown Below*/}
            
            {/* Re-enable this, making sure the target is an ABSOLUTE path relative to BrowserRouter root */}
              <Route path="*" element={<Navigate to="/dashboard/userdashboard" replace={true} />} />
    
          </Routes>
        </main>
      </div>
    </div>
    <CreateBlueskyModal 
        isOpen={isBlueskyModalOpen}
        onClose={handleCloseBlueskyModal}
        isPaidPlan={isPaidPlan}
      />
    <MoreBlueskyAccounts 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      <MoreTwitterAccounts 
        isOpen={isTwitterModalOpen}
        onClose={() => setIsTwitterModalOpen(false)}
      />
      <MoreLinkedInAccounts 
        isOpen={isLinkedInModalOpen}
        onClose={() => setIsLinkedInModalOpen(false)}
      />
    <CampaignSuccessfulModal
        isOpen={isCampaignSuccessModalOpen}
        onClose={() => setIsCampaignSuccessModalOpen(false)}
        campaignName={createdCampaignName}
      />
    </>
  );
}

export default Dashboard;