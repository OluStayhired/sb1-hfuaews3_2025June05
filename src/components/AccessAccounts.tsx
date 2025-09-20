import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, X, Unplug, Users, UserCheck, Clock, Zap, UserPlus, PlusCircle, Video, BadgeCheck, Award } from 'lucide-react';
import BlueskyLogo from '../images/bluesky-logo.svg';
import XLogo from '../images/x-logo.svg';
import BlueskyLogoWhite from '../images/bluesky-logo-white.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import ThreadsLogo from '../images/threads-logo.svg';
import { useBlueskyStore } from '../store/blueskyStore';
import { supabase } from '../lib/supabase';
import { CreateBlueskyModal } from '/src/components/CreateBlueskyModal';
import { MoreBlueskyAccounts } from '/src/components/MoreBlueskyAccounts';
import { EditSocialUserTimezoneModal } from '/src/components/EditSocialUserTimezoneModal';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { TooltipHelp } from '../utils/TooltipHelp';
import { useProductTier } from '../hooks/useProductTierHook'
import { AddSocialTabModal } from './AddSocialTabModal';
import { ConnectSocialModal } from './ConnectSocialModal';
import { ProPlanLimitModal } from './ProPlanLimitModal';
import { getLinkedInTokenDaysRemaining } from '../utils/tokenUtils';
import { format } from 'date-fns';

// Define AccessAccountsProps interface based on your usage
interface AccessAccountsProps {
  refreshDashboardAccounts: () => void;
}

interface ConnectedAccountCardProps {
    account: SocialAccount;
    // accountType is typically redundant if account.social_channel is used
    // If accountType is still used for name/logo, you might keep it.
    // For simplicity, I'm assuming account.social_channel is the primary source.
    accountType?: { name: string, social_channel: string }; // Optional if solely derived from 'account'
    onDisconnect: (id: string, socialChannel: string) => void;
    isLoading: boolean; // General loading for the page/accounts list
    disconnectingAccount: string | null;
    onTimezoneChange?: (account: SocialAccount) => void; // Optional if not implemented yet

    // NEW PROPS FOR TWITTER VIDEO UPLOAD
    // These should only be passed if account.social_channel === 'Twitter'
    onConnectTwitterVideo?: () => void; // Function to trigger OAuth 1.0a flow
    isConnectingTwitterVideo?: boolean; // Loading state for video connection
    hasTwitterVideoConnected?: boolean; // Indicates if OAuth 1.0a is fully connected for this Twitter account
    twitterVideoConnectError?: string | null; // Error message for video connection
}

//--------------- Adding Dynamic Functions For Rendering Connected Accounts ---------------------------- //

// Reusable component for displaying a connected social account card
//const ConnectedAccountCard = ({ account, accountType, onDisconnect, isLoading, disconnectingAccount, onTimezoneChange }) => {
const ConnectedAccountCard = ({ 
  account, 
  accountType, 
  onDisconnect, 
  isLoading, 
  disconnectingAccount, 
  onTimezoneChange, 

// NEW PROPS
    onConnectTwitterVideo,
    isConnectingTwitterVideo,
    hasTwitterVideoConnected,
    twitterVideoConnectError,
}) => {
  // Debugging log: Check the account prop when it renders
  //console.log('ConnectedAccountCard rendering with account:', account);
  if (account && account.social_channel === undefined) {
    console.error('social_channel is UNDEFINED for account:', account);
  }

  // Function to get the correct logo based on account social_channel
  const getLogo = (socialChannel) => {
    // Convert to lowercase to ensure consistent matching with internal identifiers
    const lowerCaseSocialChannel = socialChannel ? String(socialChannel).toLowerCase() : ''; // Ensure it's a string before toLowerCase
    switch (lowerCaseSocialChannel) {
      case 'bluesky': return BlueskyLogo;
      case 'linkedin': return LinkedInLogo; // Placeholder, replace with actual SVG if available
      case 'twitter': return XLogo;
      case 'threads': return ThreadsLogo; // New Threads logo
      case 'instagram': return InstagramLogo; // Placeholder, replace with actual SVG if available
      case 'pinterest': return PinterestLogo; // Placeholder, replace with actual SVG if available
      case 'tiktok': return TikTokLogo; // Placeholder, replace with actual SVG if available
      default: return null; // Or a generic placeholder logo
    }
  };

  // Function to get the display name, handling different property names
  const getDisplayName = (account) => {
    return account.displayName || account.display_name || account.handle;
  };

  // Function to get the handle
  const getHandle = (account) => {
    return account.handle;
  };

  // Function to get the avatar URL, with a fallback to ui-avatars
  const getAvatar = (account) => {
    return account.avatar || account.avatar_url || `https://ui-avatars.com/api/?name=${getHandle(account)}`;
  };

  // Handler for disconnecting a dynamic account
  const disconnectHandler = () => {
    //onDisconnect(account.id, accountType.social_channel);
    onDisconnect(account.id, account.social_channel);
    //refreshDashboardAccounts();
  };

  // Determine if this is a Twitter account and if video connection is needed/enabled
    //const isTwitterAccount = account.social_channel.toLowerCase() === 'twitter';
    const isTwitterAccount = account.social_channel.toLowerCase() === 'twitter';
    // The `hasTwitterVideoConnected` prop should be passed from the parent based on checking
    // account.oauth1_access_token and account.oauth1_access_token_secret
    const showEnableVideoButton = isTwitterAccount && !hasTwitterVideoConnected;



   // Helper function to display token status
  const renderTokenStatus = (account: SocialAccount) => {
    if (account.social_channel === 'LinkedIn' && account.linkedin_expires_at) {
      const expiresAtDate = new Date(account.linkedin_expires_at);
      const now = new Date();

      if (expiresAtDate < now) {
        return <span className="text-red-500 text-sm">Token Expired! (Reconnect Now)</span>;
      }

      // Calculate days remaining. Note: expiresInSeconds is not directly available here,
      // so we calculate days from the stored timestamp.
      const daysRemaining = Math.max(0, Math.ceil((expiresAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      if (daysRemaining <= 7) {
        return <span className="text-yellow-500 text-sm">{daysRemaining} days left</span>;
      }
      return <span className="text-gray-500 text-sm">Active: {daysRemaining} days left</span>;
    }
    return null;
  }; 

  return (
    <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg border border-blue-100 hover:border hover:border-blue-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {/* User Avatar */}
            <img
              src={getAvatar(account)}
              alt={getHandle(account)}
              className="w-12 h-12 rounded-full"
            />
            {/* Social Media Logo Overlay */}
            <div className="absolute -bottom-1 -right-1 bg-blue-50 border border-blue-100 rounded-full p-1 shadow-sm">
              <img
                //src={getLogo(account.social_channel)}
                src={getLogo(accountType.social_channel || account.social_channel )}
                alt={accountType.name}
                //src={BlueskyLogo}
                //alt="Bluesky"
                className="w-4 h-4"
              />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{getDisplayName(account)}</h3>
            <p className="text-sm text-gray-500">@{getHandle(account)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {account.timezone && (
            <TooltipHelp text="Change Timezone (soon) ☺️">
              <button
                // onClick={() => onTimezoneChange(account)} // Uncomment and implement if needed
                className="flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                <Clock className="w-3.5 h-3.5 mr-1" />
                <span className="mr-1">Timezone: </span>
                {account.timezone}
              </button>
            </TooltipHelp>
          )}

          {account.social_channel === 'LinkedIn' && (
           <TooltipHelp text="⚡LinkedIn Access Token Status">
                    <button 
                      className="flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                      <BadgeCheck className="w-3.5 h-3.5 mr-1" />               
                      <span className="mr-1"> {renderTokenStatus(account)} </span>
                    </button>
            </TooltipHelp>
            )}


          <span className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
            <Zap className="w-3.5 h-3.5 mr-1" />
            <span className="mr-1">Connected </span>
          </span>
          <TooltipHelp text={`Remove ${accountType.name || account.social_channel}`}>    
          
            <button
              onClick={disconnectHandler}
              disabled={isLoading || disconnectingAccount === account.id}
              className="p-2 text-green-700 hover:text-red-500 bg-green-100 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {isLoading || disconnectingAccount === account.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Unplug className="w-5 h-5" />
              )}
            </button>
          </TooltipHelp>
        </div>
      </div>
      {/*--------------- Start Section for Twitter Enable Videos ---------------*/}

        {/* NEW: Conditional rendering for "Enable Video Uploads" button */}
      {/*showEnableVideoButton && onConnectTwitterVideo && (*/}
      {/*
      {isTwitterAccount && onConnectTwitterVideo && (
                <div className="mt-4 pt-4 border-t border-blue-100">
                    <p className="mb-2 text-sm text-gray-600">
                        To post videos to Twitter, you need to enable additional permissions.
                    </p>
                    <button
                        onClick={onConnectTwitterVideo}
                        disabled={isConnectingTwitterVideo}
                        className={`
                            w-half py-2 px-4 rounded-md text-white font-medium text-sm
                            transition-colors duration-200 ease-in-out
                            flex items-center justify-center space-x-2
                            ${isConnectingTwitterVideo
                                ? 'bg-blue-300 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600'
                            }
                        `}
                    >
                        {isConnectingTwitterVideo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Video className="w-4 h-4" />
                        )}
                        <span>{isConnectingTwitterVideo ? 'Enabling Video...' : 'Enable Video Uploads'}</span>
                    </button>
                    {twitterVideoConnectError && (
                        <p className="text-red-500 text-xs mt-2 text-center">
                            {twitterVideoConnectError}
                        </p>
                    )}
                </div>
        )} 
            {isTwitterAccount && hasTwitterVideoConnected && (
                <div className="mt-4 pt-4 border-t border-blue-100">
                    <p className="text-green-600 font-medium text-center text-sm">
                        Video Uploads Enabled for Twitter! 🎬
                    </p>
                </div>
            )}
*/}
      
      {/*----------------End Section for Twitter Enable Videos ----------------*/}
      
    </div>
  );
};

// Reusable component for displaying a "Connect" social account card
const ConnectAccountCard = ({ accountType, onConnect, isLoading }) => {
  // Function to get the correct logo based on account social_channel
  const getLogo = (socialChannel) => {
    // Convert to lowercase to ensure consistent matching with internal identifiers
    const lowerCaseSocialChannel = socialChannel ? String(socialChannel).toLowerCase() : ''; // Ensure it's a string before toLowerCase
    switch (lowerCaseSocialChannel) {
      case 'bluesky': return BlueskyLogo;
      case 'linkedin': return LinkedInLogo; // Placeholder
      case 'twitter': return XLogo;
      case 'threads': return ThreadsLogo; // New Threads logo
      // Add cases for other social media social_channels
      default: return null; // Or a generic placeholder logo
    }
  };

  const connectHandler = () => {
    onConnect(accountType.social_channel);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
              <img
                src={getLogo(accountType.social_channel)}
                alt={accountType.name}
                className="w-6 h-6"
              />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{accountType.name}</h3>
            <p className="text-sm text-gray-500">Connect your {accountType.name} account</p>
          </div>
        </div>
        <TooltipHelp text={`⚡Connect ${accountType.name}`}>
          <button
            onClick={connectHandler}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Connect</span>
              </>
            )}
          </button>
        </TooltipHelp>
      </div>
    </div>
  );
};

//---------------End Adding Dynamic Functions For Rendering Connected Accounts ------------------------ //



// ------------- Start Adding Functions to Manage OAuth1.0 ----------------//

// Utility to generate a random string for state parameter (if not already defined)
const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
//------------- End Adding Functions to Manage OAuth1.0 ------------------//

interface SocialAccount {
  id: string;
  user_id: string;
  channel_user_id?: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  social_channel: string;
  timezone: string;
  oauth1_access_token?: string; // NEW: OAuth 1.0a token
  oauth1_access_token_secret?: string; // OAuth 1.0a Secret
}

interface EditSocialUserTimezoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTimeZone: string;
  onSave: (timezone: string) => Promise<void>;
  userHandle: string; // Required prop for the specific social account handle
}

//function AccessAccounts() { ({ refreshDashboardAccounts })


export function AccessAccounts({
    refreshDashboardAccounts // Destructure the prop directly here
}: AccessAccountsProps) {                        
  const { user: blueskyUser, isLoading, logout: disconnectBluesky } = useBlueskyStore();
  const [disconnectingAccount, setDisconnectingAccount] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlueskyModalOpen, setIsBlueskyModalOpen] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [isJustLoading, setIsJustLoading] = useState(false); // Define isLoading and setIsLoading
  const [isPosting, setIsPosting] = useState(false);
  const [isTimezoneSelectorOpen, setIsTimezoneSelectorOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<SocialAccount | null>(null);
  const [showAddSocialTabModal, setShowAddSocialTabModal] = useState(false);
  const [isConnectSocialModalOpen, setIsConnectSocialModalOpen] = useState(false);
  //const [accountAddedThisSession, setAccountAddedThisSession] = useState(false);


  //Threads OAUTH
  const [threadsUser, setThreadsUser] = useState<SocialAccount | null>(null);
  const [disconnectingThreadsAccount, setDisconnectingThreadsAccount] = useState<string | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(false);

  //Twitter OAUTH
  const [twitterUser, setTwitterUser] = useState<SocialAccount | null>(null);
  const [disconnectingTwitterAccount, setDisconnectingTwitterAccount] = useState<string | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(false);

  // Check Limits Based on Product Tier
  const [isProPlanLimitModalOpen, setIsProPlanLimitModalOpen] = useState(false);
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  //const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  //const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  //LinkedIn VITE
  const VITE_LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
  const VITE_LINKEDIN_REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;
  const VITE_FINAL_REDIRECT_URL = import.meta.env.VITE_FINAL_REDIRECT_URL;

  //Threads VITE
  const VITE_THREADS_CLIENT_ID = import.meta.env.VITE_THREADS_CLIENT_ID;
  const VITE_THREADS_REDIRECT_URI = import.meta.env.VITE_THREADS_REDIRECT_URI;

  //Twitter VITE
  const VITE_TWITTER_CLIENT_ID = import.meta.env.VITE_TWITTER_CLIENT_ID;
  const VITE_TWITTER_REDIRECT_URI = import.meta.env.VITE_TWITTER_REDIRECT_URI;
  const VITE_TWITTER_OAUTH1_REQUEST_TOKEN_URL = import.meta.env.VITE_TWITTER_OAUTH1_REQUEST_TOKEN_URL;
  
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // LinkedIn OAUTH
  const [linkedinUser, setLinkedinUser] = useState<SocialAccount | null>(null);
  const [disconnectingLinkedInAccount, setDisconnectingLinkedInAccount] = useState<string | null>(null);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // New Twitter Video State Management List
  const [hasOAuth2Connected, setHasOAuth2Connected] = useState(false); // Indicates if OAuth 2.0 is done
  const [connectingTwitterVideo, setConnectingTwitterVideo] = useState(false);
  const [hasOAuth1VideoConnected, setHasOAuth1VideoConnected] = useState(false);
  const [twitterVideoConnectError, setTwitterVideoConnectError] = useState<string | null>(null);
  
  const navigate = useNavigate(); 
  
  const max_length = 300;


// --- Helper function for PKCE ---
// Required for Twitter OAuth 2.0 (PKCE)
const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

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
  {/*
    const {
    isLoadin: isProductLoading,
    error: isProductError,
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
  */}

//--------- Handle Connect All Social Accounts -------------//

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


//----------------- Start Adding New Twitter OAuth1.0 Functions ------------------ //

// Helper to fetch user's connection status (including OAuth 1.0a)
  const fetchTwitterConnectionStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setHasOAuth2Connected(false);
      setHasOAuth1VideoConnected(false);
      return;
    }

    const { data: socialChannel, error } = await supabase
      .from('social_channels')
      .select('access_token, oauth1_access_token, oauth1_access_token_secret') // Select relevant tokens
      .eq('user_id', session.user.id)
      .eq('social_channel', 'Twitter')
      .single();

    if (error || !socialChannel) {
      console.error('Error fetching social channel status:', error);
      setHasOAuth2Connected(false);
      setHasOAuth1VideoConnected(false);
      return;
    }

    // Determine connection status based on token presence
    setHasOAuth2Connected(!!socialChannel.access_token);
    setHasOAuth1VideoConnected(!!socialChannel.oauth1_access_token && !!socialChannel.oauth1_access_token_secret);
  };

  // Run status fetch on component mount and after any OAuth redirects
  useEffect(() => {
    fetchTwitterConnectionStatus();

    // Check URL for success/error messages from OAuth 1.0a callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('twitter_oauth1_video_success') === 'true') {
      //console.log('Twitter video connection successful!');
      setTwitterVideoConnectError(null);
      // Clean URL params (optional but good for user experience)
      urlParams.delete('twitter_oauth1_video_success');
      window.history.replaceState({}, document.title, "?" + urlParams.toString());
      fetchTwitterConnectionStatus(); // Re-fetch status to update UI
    } else if (urlParams.has('error') && urlParams.get('error')?.startsWith('oauth1')) {
      const errorMsg = urlParams.get('error') || 'Unknown error during video connection.';
      console.error('Twitter video connection error:', errorMsg);
      setTwitterVideoConnectError(`Failed to enable video uploads: ${errorMsg}`);
      // Clean URL params (optional)
      urlParams.delete('error');
      urlParams.delete('details');
      window.history.replaceState({}, document.title, "?" + urlParams.toString());
    }
  }, []); 

//----------------- End Adding New Twitter OAuth1.0 Function --------------------//  

  

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
        //const limitedAccountTypes = ['Free Plan', 'Early Adopter']; // Define the types that have this limit
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
  

const handleOpenConnectSocialModal = async () => {
  //setIsConnectSocialModalOpen(true);
  //Only open for Paid Accounts

    //----------- Start Checking Limits Here --------------// 
     if (isLoading || isCheckingLimits) {
          return; // Already busy with something
        }

      //console.log("Starting limit check...");
      const canProceed =  await checkActionLimits('addAccount');

      if (!canProceed) {
            //console.log("Limit check failed. Modal should be open. Returning.");
            return; // This return is crucial and should prevent anything below from running
        } else {

        //console.log("Limit check passed. Proceeding with campaign creation logic.");
        setUserMessage('');
        setIsConnectSocialModalOpen(true);
      }
       
       //-------------- End Checking Limits Here --------------- //
  
}


//------------------------ Start handleconnect Twitter Video  --------------------//
// NEW FUNCTION: handleConnectTwitterVideo (OAuth 1.0a Flow Initiation)
 const handleConnectTwitterVideo = async (twitterAccountId: string) => {
    //console.log(`handleConnectTwitterVideo: initiated for OAuth 1.0a video connection for account ID: ${twitterAccountId}.`);
    setConnectingTwitterVideo(true);
    setTwitterVideoConnectError(null); 

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.error('handleConnectTwitterVideo: No authenticated user found or session error:', sessionError);
        setConnectingTwitterVideo(false);
        setTwitterVideoConnectError('You must be logged in to connect your Twitter account for video uploads.');
        return;
      }

      // Ensure currentUserId is available
      if (!currentUserId || !currentUserEmail) {
        console.error('handleConnectTwitterVideo: User ID or Email not available.');
        setConnectingTwitterVideo(false);
        setTwitterVideoConnectError('User session information missing. Please try logging in again.');
        return;
      }

      const frontendOrigin = window.location.origin; 
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const uniqueState = generateRandomString(32); 

      const oauth1CallbackUrl = import.meta.env.VITE_TWITTER_OAUTH1_CALLBACK_URL;
      const oauth1RequestTokenUrl = import.meta.env.VITE_TWITTER_OAUTH1_REQUEST_TOKEN_URL; // NEW ENVIRONMENT VARIABLE

      if (!oauth1CallbackUrl || !oauth1RequestTokenUrl) {
          console.error('handleConnectTwitterVideo: Missing Twitter OAuth 1.0a environment variables (callback or request token URL).');
          setTwitterVideoConnectError('App configuration error: Twitter OAuth 1.0a URLs are missing.');
          setConnectingTwitterVideo(false);
          return;
      }

      //console.log(`handleConnectTwitterVideo: Calling twitter-oauth1-request-token Edge Function at: ${oauth1RequestTokenUrl}`);
      const requestTokenResponse = await fetch(oauth1RequestTokenUrl, { // USE NEW ENV VAR HERE
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          email: currentUserEmail,
          frontendOrigin: frontendOrigin,
          userTimezone: userTimezone,
          oauth1CallbackUrl: oauth1CallbackUrl,
          state: uniqueState,
        }),
      });

      if (!requestTokenResponse.ok) {
        const errorData = await requestTokenResponse.json().catch(() => ({ message: 'Unknown error fetching request token.' }));
        console.error('handleConnectTwitterVideo: Error fetching OAuth 1.0a request token:', requestTokenResponse.status, requestTokenResponse.statusText, errorData);
        setTwitterVideoConnectError(`Failed to prepare video connection (${requestTokenResponse.status}): ${errorData.message || requestTokenResponse.statusText}`);
        setConnectingTwitterVideo(false);
        return;
      }

      const { twitterAuthUrl } = await requestTokenResponse.json();
      
      if (twitterAuthUrl) {
        //console.log('handleConnectTwitterVideo: Redirecting user to Twitter OAuth 1.0a authorization URL:', twitterAuthUrl);
        window.location.href = twitterAuthUrl;
      } else {
        console.error('handleConnectTwitterVideo: Twitter authorization URL not received from Edge Function.');
        setTwitterVideoConnectError('Failed to get Twitter authorization URL for video connection.');
        setConnectingTwitterVideo(false);
      }

    } catch (error: any) {
      console.error('handleConnectTwitterVideo: An unexpected error occurred:', error);
      setTwitterVideoConnectError(`An unexpected error occurred: ${error.message}`);
    } finally {
      // The loading state will be reset upon page reload after redirection,
      // or explicitly set to false if an error occurs *before* redirection.
    }
  };
  
//----------------------- End handleconnect Twitter Video ----------------------//  
  
//handleconnect Twitter
const handleConnectTwitter = async () => {
  //console.log('handleConnectTwitter: initiated');
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
      'media.write',
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

  
 //handleconnect threads
const handleConnectThreads = async () => {
  /*nothing yet*/
 // 1. Get current user's session to ensure we're authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) { // Check for user object directly
    console.error('No authenticated user found. User must be logged in to connect Threads.');
    // TODO: Redirect to login page or show a user-friendly message
    return;
  }

  
    const currentUserId = session.user.id;
    const currentUserEmail = session.user.email;
    const frontendOrigin = window.location.origin; 
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // 2. Generate a unique state parameter for security
  const uniqueState = uuidv4();

  // 3. Store the state in the database linked to the user ID
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

  // 4. Define the required Threads permissions (scopes)
  const threadsScopes = [
    'threads_basic',
    'threads_content_publish',
    // Add other necessary scopes based on Threads API documentation
    // Example: 'threads_read_replies', 'threads_manage_replies', 'threads_manage_insights'
  ];
  const scopeParam = encodeURIComponent(threadsScopes.join(','));

  // 5. Construct the Meta (Threads) authorization URL
  //    Use Meta's OAuth dialog endpoint. Verify the latest Graph API version.
  const metaGraphVersion = 'v19.0'; // **Verify the latest version in Meta's docs!**
  const authUrl = `https://www.facebook.com/${metaGraphVersion}/dialog/oauth?` +
                  `response_type=code&` +
                  `client_id=${encodeURIComponent(VITE_THREADS_CLIENT_ID)}&` + // Ensure correct encoding
                  `redirect_uri=${encodeURIComponent(VITE_THREADS_REDIRECT_URI)}&` + // THIS IS YOUR EDGE FUNCTION URL
                  `state=${encodeURIComponent(uniqueState)}&` + // Send the state to Meta
                  `scope=${scopeParam}`;

  //console.log('Redirecting user to Meta authorization URL:', authUrl);

  // 6. Redirect the user's browser to Meta's authorization page
  //    The Edge Function will take over when Meta redirects back to REDIRECT_URI
  window.location.href = authUrl;
  
}
  
//helper functions for checking Bluesky account status
const handleConnectBluesky = () => {
    //console.log('Connecting to Bluesky');
  setIsBlueskyModalOpen(true);
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

//-------------- End Handle Connect Accounts --------------//
  

// Fetch and set the current user's email and ID when the component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUserEmail(session.user.email);
          setCurrentUserId(session.user.id);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();

     // Set up a listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUserEmail(session.user.email);
        setCurrentUserId(session.user.id);
      } else {
        setCurrentUserEmail(null);
        setCurrentUserId(null);
      }
    });
    
    // Clean up the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  {/*Start LinkedIn Functions Here */}  


const refreshConnectedAccounts = async () => {
    //console.log('Refreshing connected accounts...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
     
      if (!session?.user?.id) {
        //console.log('No authenticated user ID found for refresh.');
        // Clear accounts if user logs out
        setConnectedAccounts([]);
        setLinkedinUser(null);
        setThreadsUser(null);
        setTwitterUser(null);
        //setBlueskyUser(null);
        
        return;
      }
      const currentUserId = session?.user?.id; 

      //console.log(`Workspaceing connected accounts for user ID: ${currentUserId}`);
      const { data, error } = await supabase
        .from('social_channels')
        .select('*')
        // Use user_id for the fetch filter
        .eq('user_id', currentUserId)
        .eq('activated', true); // Fetch only active accounts

      if (error) {
        console.error('Error fetching connected accounts:', error);
        throw error; // Throw to be caught by the outer catch if needed
      }

      //console.log('Fetched connected accounts data:', data);

      // Update the main list of connected accounts
      setConnectedAccounts(data || []); // Handle null case

      // --- NEW LOGIC TO POPULATE INDIVIDUAL SOCIAL USER STATES ---
      if (data && data.length > 0) {
          // Find the LinkedIn account in the fetched data
          const linkedinAccount = data.find(account => account.social_channel === 'LinkedIn');
          setLinkedinUser(linkedinAccount || null); // Set linkedinUser state

          // Find other social accounts similarly
          const threadsAccount = data.find(account => account.social_channel === 'Threads');
          setThreadsUser(threadsAccount || null); // Set threadsUser state

          const twitterAccount = data.find(account => account.social_channel === 'Twitter');
          setTwitterUser(twitterAccount || null);

          // --- Update Bluesky User ---
          const blueskyAccount = data.find(account => account.social_channel === 'Bluesky');
            if (blueskyAccount) {
            // If a Bluesky account is found, update the blueskyUser in the store
            useBlueskyStore.setState({
              user: {
                did: blueskyAccount.channel_user_id,
                handle: blueskyAccount.handle,
                displayName: blueskyAccount.display_name,
                avatar: blueskyAccount.avatar_url,
                timezone: blueskyAccount.timezone
              }
        });
      } else {
        // If no Bluesky account is found, clear the blueskyUser in the store
        useBlueskyStore.setState({ user: null });
      }
      // --- End Update Bluesky User ---
        
      } else {
          // If no accounts found, clear all individual social user states
          setLinkedinUser(null);
          setThreadsUser(null);
          setTwitterUser(null);
          useBlueskyStore.setState({ user: null });
          // ... clear other social user states
          setActiveAccountId(null);
      }
    } catch (err) {
      console.error('Error refreshing connected accounts:', err);
    } finally {
        setIsJustLoading(false); // Ensure loading state is turned off
    }
  };

  
     useEffect(() => {
       
        if (currentUserId) {
            //console.log('currentUserId detected, calling refreshConnectedAccounts...');
            refreshConnectedAccounts();
        } else {
            
            //console.log('currentUserId is null, clearing connected accounts state...');
            setConnectedAccounts([]);
            setLinkedinUser(null);
            setThreadsUser(null);
            setTwitterUser(null);
            // Add other social user states here if needed
        }

    // This effect should re-run whenever currentUserId changes
    }, [currentUserId]); 

 //---------- Start Handle render Display Token Status --------------- //

// Helper function to display token status
const renderTokenStatus = (account: SocialAccount) => {
  if (account.social_channel === 'LinkedIn' && account.linkedin_expires_at) {
    const expiresAtDate = new Date(account.linkedin_expires_at);
    const now = new Date();

    if (expiresAtDate < now) {
      return <span className="text-red-500 text-sm">Token Expired! (Reconnect Now)</span>;
    }

    // Calculate days remaining. Note: expiresInSeconds is not directly available here,
    // so we calculate days from the stored timestamp.
    const daysRemaining = Math.max(0, Math.ceil((expiresAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    if (daysRemaining <= 7) {
      return <span className="text-yellow-500 text-sm">Token Active: {daysRemaining} days left</span>;
    }
    //return <span className="text-green-500 text-xs">Active</span>;
    return <span className="text-gray-500 text-sm">Token Active: {daysRemaining} days left</span>;
  }
  return null;
};

//--------- End Handle render Display Token Startus -------------- //

  //---------- Handle Disconnect Social Accounts ---------------//

  const handleDisconnectTwitter = async () => {
  //console.log('Attempting to disconnect Twitter account...');

  // Check if the Twitter account state has data and if the user is authenticated
  if (!twitterUser?.id || !currentUserId) {
    console.error('No connected Twitter account found in state or user not authenticated.');
    // Optionally, show a user-friendly message to log in or indicating no account is linked
    return;
  }

  // Set the disconnecting state to show UI feedback for this specific account
  setDisconnectingTwitterAccount(twitterUser.handle);

  try {
    // Perform the Supabase update to mark the channel as inactive
    const { error: updateError } = await supabase
      .from('social_channels') // Target the table
      .update({
        activated: false, // Set activated to false
        updated_at: new Date().toISOString() // Update the timestamp
      })
      .match({
        // Match the specific row:
        id: twitterUser.id, // Use the unique row ID from the social_channels table
        user_id: currentUserId, // Ensure it belongs to the current user
        social_channel: 'Twitter' // Specify the social channel type
      });

    if (updateError) {
      console.error('Error updating social channel for Twitter disconnection:', updateError);
      // TODO: Show user-friendly error message about the disconnection failing
      throw updateError; // Propagate the error to the catch block
    }

    //console.log(`Successfully marked Twitter account (${twitterUser.handle}) as inactive in DB.`);

    // Refresh the list of connected accounts to update the UI
    await refreshConnectedAccounts();

    await refreshDashboardAccounts(); 

  } catch (error) {
    console.error('Error disconnecting Twitter:', error);
     // TODO: Handle the error (e.g., show a persistent error notification)
  } finally {
    // Reset the disconnecting state regardless of success or failure
    setDisconnectingTwitterAccount(null);
  }
};  

  const handleDisconnectLinkedIn = async () => {
  //console.log('Attempting to disconnect LinkedIn account...');

  if (!linkedinUser?.id || !currentUserId) {
    console.error('No connected LinkedIn account found in state or user not authenticated.');
    return;
  }

  setDisconnectingLinkedInAccount(linkedinUser.handle);

  try {
    const { error: updateError } = await supabase
      .from('social_channels')
      .update({
        activated: false,
        updated_at: new Date().toISOString()
      })
      .match({
        id: linkedinUser.id,
        user_id: currentUserId,
        social_channel: 'LinkedIn'
      });

    if (updateError) {
      console.error('Error updating social channel for LinkedIn disconnection:', updateError);
      throw updateError;
    }

    //console.log(`Successfully marked LinkedIn account (${linkedinUser.handle}) as inactive in DB.`);

    await refreshConnectedAccounts();
    
    //send state update to Dashboard
    await refreshDashboardAccounts(); 

  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
  } finally {
    setDisconnectingLinkedInAccount(null);
  }
};



 const handleDisconnectBluesky = async () => {
  try {
    if (!blueskyUser?.handle) return;
    
    setDisconnectingAccount(blueskyUser.handle);
    
    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      throw new Error('No authenticated user found');
    }

    // First update the social_channels table
    const { error: deleteError } = await supabase
      .from('social_channels')
      .delete()
      .match({
        handle: blueskyUser.handle,
        email: session.user.email,
        social_channel: 'Bluesky',
        activated: true
      });

    if (deleteError) {
      console.error('Error deleting social channel:', deleteError);
      throw updateError;
    }

    // Call the logout function from the Bluesky store
    await disconnectBluesky();
    
    // Refresh the list of connected accounts
    refreshConnectedAccounts();

    // send updated list to dashboard
    await refreshDashboardAccounts(); 
    
  } catch (error) {
    console.error('Error disconnecting Bluesky:', error);
  } finally {
    setDisconnectingAccount(null);
  }
};
  
  
// handle close bluesky account  
const handleCloseBlueskyModal = () => {
    setIsBlueskyModalOpen(false);
  };

  // --- Handlers for dynamic `connectedAccounts` ---
  const handleDisconnectDynamicAccount = async (accountId: string, socialChannel: string) => {
    
    //--- Start Disconnect Accounts based on Channel
      if (socialChannel==="Bluesky"){
        handleDisconnectBluesky(accountId);      
      }  

    if (socialChannel==="Twitter"){
        handleDisconnectTwitter(accountId);      
      }  

    if (socialChannel==="LinkedIn"){
        handleDisconnectLinkedIn(accountId);      
      }  
    //--- End Disconnect Accounts Based on Channel
    
    setDisconnectingAccount(accountId); // Use general disconnecting state for dynamic accounts
    await new Promise(resolve => setTimeout(resolve, 1000));
    setConnectedAccounts(prevAccounts =>
      prevAccounts.filter(acc => acc.id !== accountId)
    );
    //await refreshConnectedAccounts();
    
    //send state update to Dashboard
    await refreshDashboardAccounts(); 
    
    setDisconnectingAccount(null);
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
      //console.log('Please connect a Bluesky account first');
    }

  } catch (err) {
    console.error('Error checking Bluesky accounts:', err);
  }
};


// end helper functions for checking Bluesky account status  

const handleBlueskyButtonClick = async () => {
  const hasActiveSession = await checkActiveBlueskySession();
  
  if (hasActiveSession) {
    //console.log('Executing handleRequestMoreBskyAcct')
    handleRequestMoreBskyAcct();
  } else {
    //console.log('Executing handleConnectBluesky')
    handleConnectBluesky();
  }
};    

  
//const handleTimezoneOpenModal = (userHandle: string) => {

const handleTimezoneOpenModal = (userHandleToEdit: string) => {  
  // Store the selected user handle for the timezone modal
  //const selectedAccount = connectedAccounts.find(account => account.handle === userHandle);
  const foundAccount = connectedAccounts.find(account => account.handle === userHandleToEdit);
  if (foundAccount) {
      // 2. Set this found account into your state variable.
      // This step is crucial as it tells React to re-render and use this new data.
      setSelectedAccount(foundAccount);
      setIsTimezoneSelectorOpen(true); // Open the modal
    } else {
      console.error(`Error: No account found with handle: ${userHandleToEdit}`);
      // Optionally, set an error state here to display a message to the user
    }
  };

const handleSaveTimezone = async (newTimezone: string) => {
  if (!selectedAccount) {
    console.error('No account selected for timezone update');
    return;
  }
  
  try {
    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      throw new Error('No authenticated user found');
    }

    // Update timezone for the specific social account
    const { error: updateError } = await supabase
      .from('social_channels')
      .update({ 
        timezone: newTimezone,
        updated_at: new Date().toISOString()
      })
      .match({ 
        email: session.user.email,
        handle: selectedAccount.handle,
        social_channel: selectedAccount.social_channel
      });

    if (updateError) {
      console.error('Error updating timezone for social account:', updateError);
      throw updateError;
    }

    // Update local state
    setConnectedAccounts(prev => 
      prev.map(account => 
        account.id === selectedAccount.id 
          ? { ...account, timezone: newTimezone } 
          : account
      )
    );

    // If this is the Bluesky account, also update the blueskyUser state
    if (selectedAccount.social_channel === 'Bluesky' && blueskyUser) {
      // This assumes you have a way to update the blueskyUser state
      // You might need to implement this based on how blueskyUser is managed
    }

    // Refresh connected accounts to get updated data
    await refreshConnectedAccounts();
    
    // Close the timezone selector modal
    setIsTimezoneSelectorOpen(false);
    setSelectedAccount(null);
    
  } catch (err) {
    console.error('Error saving timezone for social account:', err);
    // Optionally show an error message to the user
  }
};



  return (
    <div className="p-4 bg-white h-full">
      <div className="max-w-8xl mx-auto">
        <div className="flex items-center justify-between mb-8"> 
          <div className="flex items-center space-x-2"> 
            <div className="p-2 bg-blue-50 rounded-md"> 
               <UserPlus className="w-5 h-5 text-blue-500"/> 
            </div>
              <h2 className="text-xl font-semibold text-gray-900">Connected Accounts</h2>
           </div>
          
              <div className="flex items-center space-x-3">
                  
            </div>
         </div>
            
        <div className="space-y-6">
{ !isPaidPlan && (
  <>
 {/* Bluesky Account */}
          {blueskyUser ? (
            <div className="bg-gradient-to-r from-blue-50 to-white  p-6 rounded-lg border border-blue-100 hover:border hover:border-blue-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {/* User Avatar */}
                    <img
                      src={blueskyUser.avatar || `https://ui-avatars.com/api/?name=${blueskyUser.handle}`}
                      alt={blueskyUser.handle}
                      className="w-12 h-12 rounded-full"
                    />
                    {/* Bluesky Logo Overlay */}
                    <div className="absolute -bottom-1 -right-1 bg-blue-50 border border-blue-100  rounded-full p-1 shadow-sm">
                      <img
                        src={BlueskyLogo}
                        alt="Bluesky"
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{blueskyUser.displayName || blueskyUser.handle}</h3>
                    <p className="text-sm text-gray-500">@{blueskyUser.handle}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {blueskyUser.timezone && (
                  <TooltipHelp text="Change Timezone (soon) 😊">
                    <button 
                      //onClick={() => handleTimezoneOpenModal(blueskyUser.handle)} 
                      className="flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      <span className="mr-1">Timezone: </span>
                      {blueskyUser.timezone}
                    </button>
                  </TooltipHelp>
              
                  )}
                  <span className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    <span className="mr-1">Connected </span>
                  </span>

                <TooltipHelp text="Remove Bluesky">
                  <button
                    onClick={handleDisconnectBluesky}
                    disabled={isLoading || disconnectingAccount === blueskyUser.handle}
                    className="p-2 text-green-700 hover:text-red-500 bg-green-100 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                    //title="Disconnect"
                  >
                    {isLoading || disconnectingAccount === blueskyUser.handle ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Unplug className="w-5 h-5" />
                    )}
                  </button>
                </TooltipHelp>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                      <img
                        src={BlueskyLogo}
                        alt="LinkedIn"
                        className="w-6 h-6"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Bluesky</h3>
                    <p className="text-sm text-gray-500">Connect your Bluesky account</p>
                  </div>
                </div>
                <TooltipHelp text="⚡Connect Bluesky">
                <button
                  onClick={handleConnectBluesky}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
                </TooltipHelp>   
              </div>
            </div>
          )}


          
      {/* LinkedIn Account */}
          {linkedinUser ? (
            <div className="bg-gradient-to-r from-blue-50 to-white  p-6 rounded-lg border border-blue-100 hover:border hover:border-blue-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {/* User Avatar */}
                    <img
                      src={linkedinUser.avatar_url || `https://ui-avatars.com/api/?name=${linkedinUser.handle}`}
                      alt={linkedinUser.handle}
                      className="w-12 h-12 rounded-full"
                    />
                    {/* LinkedIn Logo Overlay */}
                    <div className="absolute -bottom-1 -right-1 bg-blue-50 border border-blue-100  rounded-full p-1 shadow-sm">
                      <img
                        src={LinkedInLogo}
                        alt="LinkedIn"
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{linkedinUser.display_name || linkedinUser.handle}</h3>
                    <p className="text-sm text-gray-500">@{linkedinUser.handle}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {linkedinUser.timezone && (
                  <TooltipHelp text="Change Timezone (soon) 😊">
                    <button 
                      //onClick={() => handleTimezoneOpenModal(linkedinUser.handle)} 
                      className="flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      <span className="mr-1">Timezone: </span>
                      {linkedinUser.timezone}
                    </button>
                  </TooltipHelp>
                  )}

                {linkedinUser.social_channel === 'LinkedIn' && (    
                  <TooltipHelp text="⚡LinkedIn Access Token Status">
                    <button 
                      //onClick={() => handleTimezoneOpenModal(linkedinUser.handle)} 
                      className="flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                      <BadgeCheck className="w-3.5 h-3.5 mr-1" />
                      <span className="mr-1"> {renderTokenStatus(linkedinUser)} </span>
                      
                    </button>
                  </TooltipHelp>
              )}

                  <span className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    <span className="mr-1">Connected </span>
                  </span>
                  <TooltipHelp text="Remove LinkedIn">
                  <button
                    onClick={handleDisconnectLinkedIn}
                    disabled={linkedinLoading || disconnectingLinkedInAccount === linkedinUser.handle}
                    className="p-2 text-green-700 hover:text-red-500 bg-green-100 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                    //title="Disconnect"
                  >
                    {linkedinLoading || disconnectingLinkedInAccount === linkedinUser.handle ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Unplug className="w-5 h-5" />
                    )}
                  </button>
                  </TooltipHelp>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center">
                      <img
                        src={LinkedInLogo}
                        alt="LinkedIn"
                        className="w-6 h-6"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">LinkedIn</h3>
                    <p className="text-sm text-gray-500">Connect your LinkedIn account</p>
                  </div>
                </div>
                <TooltipHelp text="⚡Connect LinkedIn ">
                <button
                  onClick={handleConnectLinkedIn}
                  disabled={linkedinLoading}
                  className="px-4 py-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
                >
                  {linkedinLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
                </TooltipHelp>
              </div>
            </div>
          )}
         
  {/* Twitter Account */}
          {twitterUser ? (
            <div className="bg-gradient-to-r from-blue-50 to-white  p-6 rounded-lg border border-blue-100 hover:border hover:border-blue-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {/* User Avatar */}
                    <img
                      src={twitterUser.avatar_url || `https://ui-avatars.com/api/?name=${twitterUser.handle}`}
                      alt={twitterUser.handle}
                      className="w-12 h-12 rounded-full"
                    />
                    {/* Twitter Logo Overlay */}
                    <div className="absolute -bottom-1 -right-1 bg-blue-50 border border-blue-100  rounded-full p-1 shadow-sm">
                      <img
                        src={XLogo}
                        alt="Threads"
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{twitterUser.display_name || twitterUser.handle}</h3>
                    <p className="text-sm text-gray-500">@{twitterUser.handle}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {twitterUser.timezone && (
                  <TooltipHelp text="Change Timezone (soon) 😊">
                    <button 
                      //onClick={() => handleTimezoneOpenModal(twitterUser.handle)} 
                      className="flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      <span className="mr-1">Timezone: </span>
                      {twitterUser.timezone}
                    </button>
                  </TooltipHelp> 
                  )}
                  <span className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    <span className="mr-1">Connected </span>
                  </span>

                  <TooltipHelp text="Remove Twitter">
                  <button
                    onClick={handleDisconnectTwitter}
                    disabled={twitterLoading || disconnectingTwitterAccount === twitterUser.handle}
                    className="p-2 text-green-700 hover:text-red-500 bg-green-100 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                    //title="Disconnect"
                  >
                    {twitterLoading || disconnectingTwitterAccount === twitterUser.handle ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Unplug className="w-5 h-5" />
                    )}
                  </button>
                  </TooltipHelp>  
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-blue-100 border border-blue-200 p-2.5 flex items-center justify-center">
                      <img
                        src={XLogo}
                        alt="Threads"
                        className="w-8 h-8 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">X/Twitter</h3>
                    <p className="text-sm text-gray-500">Connect your X account</p>
                  </div>
                </div>
              <TooltipHelp text="⚡Connect Twitter">
                <button
                  onClick={handleConnectTwitter}
                  disabled={twitterLoading}
                  className="px-4 py-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
                >
                  {twitterLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Connect</span>
                    </>
                  )}
                </button>
              </TooltipHelp>
              </div>
            </div>
          )}   
    </>
  )}

 {/*------------------------Start Paid Plan Separation Showing Button for Adding More Accounts --------------------------- */}     

{isPaidPlan && ( // Only render this section if the user is on a paid plan
            <>
              {/* Add More Accounts Button - Placed after fixed accounts */}
              {/*<div className="mx-auto justify-end items-end relative flex border-t border-gray-100 pt-4">*/}
            <div className="mx-auto justify-end items-end relative flex pt-2">

              <TooltipHelp text="⚡Add upto 8 Social Accounts">
                <button
                  onClick={handleOpenConnectSocialModal}
                  disabled={isLoading} // Use isJustLoading for this button
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add More Accounts</span>
                </button>
                </TooltipHelp>
              </div>

              {/* 
              Dynamic Section for Additional Connected Accounts 
              {connectedAccounts.length > 0 && (
                <div className="flex items-center space-x-2 mt-8 pt-6 ">
                  <h3 className="text-lg font-semibold text-blue-500">Your Additional Accounts</h3>
                </div>
              )}
            */}      
        

              {connectedAccounts.length > 0 ? (
                connectedAccounts.map((account) => (
                  <ConnectedAccountCard
                    key={account.id} // Use a unique ID for the key
                    accountType={account.social_channel}
                    account={account}
                    onDisconnect={handleDisconnectDynamicAccount}
                    isLoading={isLoading} // Use general loading for dynamic accounts
                    disconnectingAccount={disconnectingAccount} // Use general disconnecting for dynamic accounts
                    // onTimezoneChange={handleTimezoneOpenModal} // Pass if you implement this for dynamic accounts

                    // Pass Twitter-specific props if it's a Twitter account
                    onConnectTwitterVideo={account.social_channel === 'Twitter' ? () => handleConnectTwitterVideo(account.id) : undefined}
                    isConnectingTwitterVideo={account.social_channel === 'Twitter' ? connectingTwitterVideo : false}
                    hasTwitterVideoConnected={account.social_channel === 'Twitter' ? (!!account.oauth1_access_token && !!account.oauth1_access_token_secret) : false}
                    twitterVideoConnectError={account.social_channel === 'Twitter' ? twitterVideoConnectError : null}
                  />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No additional accounts connected yet. Click "Add More Accounts" to get started!</p>
              )}
            </>
          )}          
{/*------------------------End Paid Plan Separation Showing Button for Adding More Accounts --------------------------- */}              

          
        </div>
      </div>

  <CreateBlueskyModal 
  isOpen={isBlueskyModalOpen}
  onClose={handleCloseBlueskyModal}
  isPaidPlan={isPaidPlan}
  onAccountAdded={refreshDashboardAccounts}
  onAccountAddedDisplay={refreshConnectedAccounts}
/>
<MoreBlueskyAccounts 
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  
/>

{remainingSocialAccounts > 0 && (      
  <ConnectSocialModal
        isOpen={isConnectSocialModalOpen}
        onClose={() => setIsConnectSocialModalOpen(false)}
        onConnectBluesky={handleConnectBluesky}
        onConnectLinkedIn={handleConnectLinkedIn}
        setIsBlueskyModalOpen={setIsBlueskyModalOpen}
        //onAccountAdded={refreshConnectedAccounts} // prop to determine account added and refresh
        onAccountAdded={refreshDashboardAccounts}
        onAccountAddedDisplay={refreshConnectedAccounts}
      />    
  )}

      {selectedAccount && (
        <EditSocialUserTimezoneModal
          isOpen={isTimezoneSelectorOpen}
          onClose={() => {
            setIsTimezoneSelectorOpen(false);
            setSelectedAccount(null); 
            refreshConnectedAccounts()
          }}
          selectedTimeZone={selectedAccount.timezone || userTimezone}
          userHandle={selectedAccount.handle} 
          social_channel={selectedAccount.social_channel}       // Pass this
          user_display_name={selectedAccount.display_name} // Pass this
          avatar_url={selectedAccount.avatar_url}  
          onSave={handleSaveTimezone}
        />
      )}      

      {/* Upgrade Modal After Free Trial Runs Out */}
      <ProPlanLimitModal
          isOpen={isProPlanLimitModalOpen}
          onClose={handleCloseProPlanLimitModal}
          message={modalMessage} 
        />
      
    </div>
  );
}
export default AccessAccounts;