import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.2'; // Use latest Supabase JS client

// Load environment variables (Supabase Secrets)
const THREADS_CLIENT_ID = Deno.env.get('THREADS_CLIENT_ID')!; // Use non-null assertion or checks
const THREADS_CLIENT_SECRET = Deno.env.get('THREADS_CLIENT_SECRET')!;
const THREADS_REDIRECT_URI = Deno.env.get('THREADS_REDIRECT_URI')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Initialize Supabase client with Service Role Key for backend operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false, // No user session to manage here
    autoRefreshToken: false,
  },
});

// --- State Management Helper (Conceptual - Needs Actual Implementation) ---
// These functions need to interact with your chosen secure state storage
// (e.g., temporary DB table or signed cookies).
// This is a simplified example assuming a database table named 'oauth_states'.

interface OAuthState {
    state: string;
    user_id: string;
    created_at: string;
}

// Function to verify state and retrieve user_id (needs to query your state storage)

async function verifyAndRetrieveState(state: string): Promise<{ userId: string; frontendOrigin: string } | null> {
     console.log('Edge Function: Verifying state...');
     if (!state) {
         console.error('Edge Function: State is missing.');
         return null;
     }

    try {
        // Query the temporary table for the state, selecting both user_id and frontend_origin
        const { data, error } = await supabaseAdmin
            .from('oauth_states')
            .select('user_id, frontend_origin, email, user_timezone') // Select both fields
            .eq('state', state)
            .single();

        if (error || !data || !data.frontend_origin) { // Check if frontend_origin is present
            console.error('Edge Function: State verification failed, state not found, or frontend_origin missing:', error);
            return null;
        }

        // Delete the state entry
        const { error: deleteError } = await supabaseAdmin
            .from('oauth_states')
            .delete()
            .eq('state', state);

        if (deleteError) {
             console.warn('Edge Function: Failed to delete used state from storage:', deleteError);
        }

        console.log('Edge Function: State verified successfully. Retrieved user ID:', 
                    data.user_id, 'and Frontend Origin:', 
                    data.frontend_origin
                   );
        // Return an object containing both
        return { userId: data.user_id, 
                 frontendOrigin: data.frontend_origin, 
                 userEmail: data.email, 
                 userTimezone: data.user_timezone 
               };

    } catch (error) {
        console.error('Edge Function: Error in state verification process:', error);
        return null;
    }
}

// --- End State Management Helper ---


// Helper function to fetch Threads user profile
async function getThreadsProfile(accessToken: string): Promise<any | null> {
  // Use graph.threads.net for profile data
  // Request specific fields you need. id, username are typically available.
  const profileApiUrl = 'https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,account_type,media_count'; // Add/remove fields as needed

  try {
    const response = await fetch(profileApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    const profileData = await response.json();

    if (!response.ok) {
      console.error('Threads API error fetching profile:', response.status, profileData);
      return null;
    }

    return profileData;
  } catch (error) {
    console.error('Failed to fetch Threads profile:', error);
    return null;
  }
}

// Main Edge Function handler
serve(async (req) => {
  const { url, method } = req;
  const { searchParams } = new URL(url);

  // This function is designed ONLY to handle the OAuth callback GET request
  if (method === 'GET' && searchParams.has('code') && searchParams.has('state')) {
    const code = searchParams.get('code')!;
    const state = searchParams.get('state')!;

    console.log('Received Threads OAuth callback');

    const stateData = await verifyAndRetrieveState(state);
    if (!stateData) {
      console.error('Edge Function: State verification failed, cannot proceed.');
      // Redirect using the Edge Function's origin as a fallback since frontendOrigin is unknown
      return Response.redirect(`${new URL(url).origin}/error?message=oauth_state_mismatch`, 302);
    }

    // 1. State Verification and User ID Retrieval
    const userId = stateData.userId;
    const frontendOrigin = stateData.frontendOrigin;
    const userEmail = stateData.userEmail;
    const userTimezone = stateData.userTimezone;

    console.log('Edge Function: State verified. User ID:', userId, 'Frontend Origin:', frontendOrigin);

    if (!userId) {
      console.error('State verification failed or could not retrieve user ID.');
      // Redirect back to dashboard with an error
      return Response.redirect(`${new URL(url).origin}/dashboard/accounts?error=oauth_state_mismatch`, 302);
    }

    // 2. Exchange Authorization Code for Access Token
    try {
      // Use graph.facebook.com for token exchange
      const tokenExchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?`; // Verify Graph API version

      const tokenResponse = await fetch(tokenExchangeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: THREADS_REDIRECT_URI, // Must match the one in Meta App settings
          client_id: THREADS_CLIENT_ID,
          client_secret: THREADS_CLIENT_SECRET,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || tokenData.error) {
        console.error('Error exchanging code for token:', tokenResponse.status, tokenData);
        // Redirect back to dashboard with an error
        return Response.redirect(`${new URL(url).origin}/dashboard/accounts?error=oauth_token_exchange_failed`, 302);
      }

      const accessToken = tokenData.access_token;
      // Note: The first token might be short-lived. Meta recommends exchanging for a long-lived token.
      // Implement the long-lived token exchange here if needed.
      // See Meta's docs: GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={your-access-token}
      // Store the long-lived token.

      // 3. Fetch Threads User Profile
      const threadsProfile = await getThreadsProfile(accessToken);

      if (!threadsProfile) {
         // Error fetching profile is already logged in getThreadsProfile
         return Response.redirect(`${new URL(url).origin}/dashboard/accounts?error=threads_profile_fetch_failed`, 302);
      }

      const threadsUserId = threadsProfile.id;
      const threadsUsername = threadsProfile.username;
      const threadsAvatar = threadsProfile.threads_profile_picture_url;
      // ... get other fields like display_name, avatar_url if available via API

      // 4. Store/Update Threads connection in Supabase
      const { error: dbError } = await supabaseAdmin
        .from('social_channels')
        .upsert({
          user_id: userId, 
          email: userEmail,
          social_channel: 'Threads', 
          channel_user_id: threadsUserId, 
          handle: threadsUsername, 
          access_token: accessToken, 
          // Optionally store refresh_token and expiration time if available/needed
          display_name: threadsUsername, // Use username as display name initially, or fetch full name if available
          avatar_url: threadsAvatar,
          activated: true,
          updated_at: new Date().toISOString(),
          timezone: userTimezone
        }, {
           // Conflict based on user_id and social_channel type, or the Threads user ID
          onConflict: 'user_id, channel_user_id',
          ignoreDuplicates: false // Ensure update happens if conflict occurs
        });

      if (dbError) {
        console.error('Error storing Threads data:', dbError);
        return Response.redirect(`${frontendOrigin}/dashboard/accounts?error=db_save_failed`, 302);
      }

      console.log(`Successfully connected Threads account for user ${userId}`);

      // 5. Redirect back to your application dashboard
      return Response.redirect(`${frontendOrigin}/dashboard/accounts?threads_connected=true`, 302);

    } catch (err) {
      console.error('Unexpected error during Threads OAuth callback processing:', err);
       return Response.redirect(`${frontendOrigin}/dashboard/accounts?error=internal_error`, 302);
    }
  } else {
    // If the Edge Function endpoint is accessed without the correct callback parameters,
    // perhaps redirect to a relevant page or return an error.
    console.warn('Edge Function accessed without expected OAuth callback parameters.');
    return new Response('Not Found', { status: 404 });
  }
});