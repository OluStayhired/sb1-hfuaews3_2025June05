// src/components/AddSocialTabModal.tsx
import React, { useState } from 'react';
import { X, AlertCircle, ArrowRight } from 'lucide-react';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { MoreBlueskyAccounts } from './MoreBlueskyAccounts'
import { MoreLinkedInAccounts } from './MoreLinkedInAccounts'
import { MoreTwitterAccounts } from './MoreTwitterAccounts'
import { CreateBlueskyModal } from './CreateBlueskyModal';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

interface AddSocialTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestMoreBlueskyAccounts: () => void;
  onRequestMoreLinkedInAccounts: () => void;
  onRequestMoreTwitterAccounts: () => void;
  isPaidPlan: boolean;
  remainingSocialAccounts: number;
  //onConnectBluesky: () => void;
  //onConnectLinkedIn: () => void;
}

export function AddSocialTabModal({ 
  isOpen, 
  onClose,
  onRequestMoreBlueskyAccounts,
  onRequestMoreLinkedInAccounts,
  onRequestMoreTwitterAccounts,
  isPaidPlan,
  remainingSocialAccounts
}: AddSocialTabModalProps) {
const [isBlueskyModalOpen, setIsBlueskyModalOpen] = useState(false);
const [isMoreAccountsModalOpen, setIsMoreAccountsModalOpen] = useState(false);
const [isTwitterModalOpen, setIsTwitterModalOpen] = useState(false);  
const [isLinkedInModalOpen, setIsLinkedInModalOpen] = useState(false);    

   //Twitter OAUTH
  const [twitterUser, setTwitterUser] = useState<SocialAccount | null>(null);
  const [disconnectingTwitterAccount, setDisconnectingTwitterAccount] = useState<string | null>(null);
  const [twitterLoading, setTwitterLoading] = useState(false);
  
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

// --- Helper function for Twitter PKCE ---
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
// End Helper Functions for Twitter


  
  
  const handleCloseBlueskyModal = () => {
    setIsBlueskyModalOpen(false);
    //onClose();

  };

  const handleConnectBluesky = async () => {
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

      
  if (!isPaidPlan) { // this condition is only for Free Plans and Early Adopters
      if (existingAccounts && existingAccounts.length > 0) {
        onRequestMoreBlueskyAccounts();
        onClose();
      } else {
        setIsBlueskyModalOpen(true);
        setIsMoreAccountsModalOpen(false);
      }
    }

    if (isPaidPlan && remainingSocialAccounts > 0 ) { // this condition is only for Paid Plans with remaining accounts availability
      //console.log('checking isPaidPlan:', isPaidPlan)
      //console.log('checking remaingingAccounts:', remainingSocialAccounts)
        setIsBlueskyModalOpen(true);
        setIsMoreAccountsModalOpen(false);
  }
      
      
    } catch (err) {
      console.error('Error checking Bluesky accounts:', err);
    }
  };

  const handleConnectLinkedIn = async () => {
  console.log('Connecting to LinkedIn...');
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

      console.log('OAuth state stored successfully:', uniqueState);

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

    console.log('Redirecting user to LinkedIn authorization URL:', linkedInAuthUrl);

    window.location.href = linkedInAuthUrl;

  } catch (err) {
    console.error('Error connecting to LinkedIn:', err);
  }
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
        .from('oauth_states') 
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

      console.log('handleConnectTwitter: OAuth state and code_verifier stored successfully:', uniqueState);

    } catch (dbError) {
      console.error('handleConnectTwitter: Unexpected error storing OAuth data:', dbError);
      setTwitterLoading(false); 
      
      return;
    }

    // 5. Define the required Twitter permissions (scopes)
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
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
                    `response_type=code&` +
                    `client_id=${encodeURIComponent(VITE_TWITTER_CLIENT_ID)}&` + 
                    `redirect_uri=${encodeURIComponent(VITE_TWITTER_REDIRECT_URI)}&` + 
                    `state=${encodeURIComponent(uniqueState)}&` + 
                    `scope=${scopeParam}&` + 
                    `code_challenge=${encodeURIComponent(code_challenge)}&` + 
                    `code_challenge_method=S256`; 

    console.log('handleConnectTwitter: Redirecting user to Twitter authorization URL:', authUrl);

    // 7. Redirect the user's browser to Twitter's authorization page
    window.location.href = authUrl;

  } catch (generalError) {
    // Catch any errors before the database save/redirect
    console.error('handleConnectTwitter: An unexpected error occurred before redirection:', generalError);
    setTwitterLoading(false); 
  }
};  

const handleConnectLinkedInClick = async () => {
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


//----- Section to be Replaced ------------//      
      {/*  if (existingAccounts && existingAccounts.length > 0) {
        onRequestMoreLinkedInAccounts();
        onClose();
      } else {
        handleConnectLinkedIn();
        setIsMoreAccountsModalOpen(false);
      }
      */}
//------ end section to be replaced ---------//

 if (!isPaidPlan) { // this condition is only for Free Plans and Early Adopters
      if (existingAccounts && existingAccounts.length > 0) {
        onRequestMoreLinkedInAccounts();
        onClose();
      } else {
        handleConnectLinkedIn();
        setIsMoreAccountsModalOpen(false);
      }
    }

    if (isPaidPlan && remainingSocialAccounts > 0 ) { // this condition is only for Paid Plans with remaining accounts availability
        handleConnectLinkedIn();
        setIsMoreAccountsModalOpen(false);
  }      
      
    } catch (err) {
      console.error('Error checking LinkedIn accounts:', err);
    }
  };

  const handleConnectTwitterClick = async () => {
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
      
//----- Section to be Replaced ------------//      
      {/*
      if (existingAccounts && existingAccounts.length > 0) {
        onRequestMoreTwitterAccounts();
        onClose();
      } else {
        handleConnectTwitter();
        setIsMoreAccountsModalOpen(false);
      }
     */}
//------ end section to be replaced ---------//
  if (!isPaidPlan) { // this condition is only for Free Plans and Early Adopters
      if (existingAccounts && existingAccounts.length > 0) {
        onRequestMoreTwitterAccounts();
        onClose();
      } else {
        handleConnectTwitter();
        setIsMoreAccountsModalOpen(false);
      }
    }

    if (isPaidPlan && remainingSocialAccounts > 0 ) { // this condition is only for Paid Plans with remaining accounts availability
        handleConnectTwitter();
        setIsMoreAccountsModalOpen(false);
      }    
    } catch (err) {
      console.error('Error checking Twitter accounts:', err);
    }
  };
  
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connect More Accounts
          </h2>
          <p className="text-gray-600 text-sm">
            Want to manage multiple accounts? Let us know you're interested in this feature
          </p>
        </div>

        {/* Platform Options */}
        <div className="space-y-3 mb-6">
          <button
            
            //onClick={() => { onRequestMoreBlueskyAccounts(); 
            //onClose(); 
           onClick={handleConnectBluesky}
               
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-lg hover:border-blue-300 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <img src={BlueskyLogo} alt="Bluesky" className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Connect Bluesky</p>
                <p className="text-sm text-gray-500">Request access to connect more accounts</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick= {handleConnectLinkedInClick}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-lg  hover:border-blue-300 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <img src={LinkedInLogo} alt="LinkedIn" className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Connect LinkedIn</p>
                <p className="text-sm text-gray-500">Request access to connect more accounts</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick= {handleConnectTwitterClick}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-lg hover:border-blue-300 transition-all group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                <img src={XLogo} alt="LinkedIn" className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Connect Twitter/X</p>
                <p className="text-sm text-gray-500">Request access to connect more accounts</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <p className="text-xs text-center text-gray-500">
          Connect once to manage your social media accounts in one place
        </p>
      </div>
      {/*
      <MoreBlueskyAccounts 
        isOpen={isMoreAccountsModalOpen}
        onClose={() => setIsMoreAccountsModalOpen(false)}
        />
        */}

      <CreateBlueskyModal 
        isOpen={isBlueskyModalOpen}
        onClose={handleCloseBlueskyModal}
        isPaidPlan={isPaidPlan}
      />

      <MoreBlueskyAccounts
        isOpen={isMoreAccountsModalOpen}
        onClose={() => setIsMoreAccountsModalOpen(false)}
      />

      <MoreLinkedInAccounts
        isOpen={isMoreAccountsModalOpen}
        //isOpen={isLinkedInModalOpen}
        onClose={() => setIsMoreAccountsModalOpen(false)}
      />

      <MoreTwitterAccounts
        isOpen={isMoreAccountsModalOpen}
        onClose={() => setIsMoreAccountsModalOpen(false)}
      />
      
    </div>
  );
}
