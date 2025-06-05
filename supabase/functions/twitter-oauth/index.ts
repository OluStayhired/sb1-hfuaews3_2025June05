// supabase/functions/twitter-oauth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.2';

// --- Environment Variables ---
const TWITTER_CLIENT_ID = Deno.env.get('TWITTER_CLIENT_ID');
const TWITTER_CLIENT_SECRET = Deno.env.get('TWITTER_CLIENT_SECRET');
const REDIRECT_URI = Deno.env.get('TWITTER_REDIRECT_URI'); // This is the URL of THIS Edge Function
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// --- Supabase Admin Client (using Service Role Key) ---
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Edge Function: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    // In a real scenario, you might want to exit or throw here if critical env vars are missing
}
const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
        persistSession: false, // Don't try to save session in Edge Functions
        autoRefreshToken: false, // Don't try to refresh tokens automatically
    },
});

// --- Helper function for Base64 Encoding (for Basic Auth header) ---
function base64Encode(str: string): string {
    // Deno's standard library includes `encodeBase64` in `encoding/base64.ts`
    // Or you can use `btoa` which is available in Deno runtime
    return btoa(str);
}

// --- Verify state and retrieve user_id, code_verifier, etc. from oauth_states table ---
// Adapted to also retrieve code_verifier
async function verifyAndRetrieveState(state: string): Promise<{
    userId: string;
    frontendOrigin: string;
    userEmail: string;
    userTimezone: string;
    codeVerifier: string; // <-- Now we need the code_verifier
} | null> {
    console.log('Edge Function: Verifying state...');
    if (!state) {
        console.error('Edge Function: State is missing.');
        return null;
    }

    try {
        // Query the temporary table for the state, selecting user_id, frontend_origin, and code_verifier
        const { data, error } = await supabaseAdmin
            .from('oauth_states')
            .select('user_id, frontend_origin, email, user_timezone, code_verifier') // Select code_verifier
            .eq('state', state)
            .single();

        // Check if state was found and contains the necessary data (including code_verifier)
        if (error || !data || !data.frontend_origin || !data.code_verifier) {
            console.error('Edge Function: State verification failed, state not found, or missing data (frontend_origin/code_verifier):', error);
            return null;
        }

        // Delete the state entry immediately after retrieval
        const { error: deleteError } = await supabaseAdmin
            .from('oauth_states')
            .delete()
            .eq('state', state);

        if (deleteError) {
            console.warn('Edge Function: Failed to delete used state from storage:', deleteError);
            // Log the warning, but proceed as the critical data was retrieved
        }

        console.log('Edge Function: State verified successfully. Retrieved user ID:', data.user_id, 'Frontend Origin:', data.frontend_origin, 'Code Verifier (partial):', data.code_verifier ? data.code_verifier.substring(0, 5) + '...' : 'Missing');

        // Return the retrieved data, including the code_verifier
        return {
            userId: data.user_id,
            frontendOrigin: data.frontend_origin,
            userEmail: data.email,
            userTimezone: data.user_timezone,
            codeVerifier: data.code_verifier, // <-- Return the code_verifier
        };

    } catch (error) {
        console.error('Edge Function: Error in state verification process:', error);
        return null;
    }
}

// --- Main Edge Function handler ---
serve(async (req) => {
    const { url, method } = req;
    const { searchParams } = new URL(url);

    // Check if this is the expected GET request with code and state parameters
    if (method === 'GET' && searchParams.has('code') && searchParams.has('state')) {
        const code = searchParams.get('code')!;
        const state = searchParams.get('state')!;

        console.log('Edge Function: Handling Twitter OAuth callback...');
        console.log('Edge Function: Received State:', state);
        console.log('Edge Function: Received Code (partial):', code ? code.substring(0, 10) + '...' : 'Missing');

        // 1. Verify State and Retrieve Data (including code_verifier)
        const stateData = await verifyAndRetrieveState(state);
        if (!stateData) {
            console.error('Edge Function: State verification failed, cannot proceed with token exchange.');
            // Redirect user to an error page or accounts page with an error message
            // Use a default fallback origin if frontendOrigin is somehow missing from state data
             const fallbackOrigin = `${new URL(url).protocol}//${new URL(url).host}`.replace('.supabase.co', '.vercel.app'); // Adjust fallback as needed
            const redirectUrl = `${stateData?.frontendOrigin || fallbackOrigin}/dashboard/accounts?error=twitter_oauth_state_mismatch`;
            console.log('Edge Function: Redirecting to error URL:', redirectUrl);
            return Response.redirect(redirectUrl, 302);
        }

        const { userId, frontendOrigin, userEmail, userTimezone, codeVerifier } = stateData;

        console.log('Edge Function: State verified. User ID:', userId, 'Frontend Origin:', frontendOrigin);

        // 2. Check for Required Environment Variables
        if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET || !REDIRECT_URI) {
            console.error('Edge Function: Missing Twitter environment variables.');
            const redirectUrl = `${frontendOrigin}/dashboard/accounts?error=twitter_config_missing`;
            console.log('Edge Function: Redirecting to error URL:', redirectUrl);
            return Response.redirect(redirectUrl, 302);
        }

        // 3. Exchange Authorization Code for Access Token (Twitter OAuth 2.0 PKCE)
        console.log('Edge Function: Exchanging code for Twitter token...');
        const tokenExchangeUrl = 'https://api.twitter.com/2/oauth2/token'; // Twitter's token endpoint

        try {
            // Build the Basic Authorization header (required for confidential clients like Edge Functions)
            const basicAuthHeader = `Basic ${base64Encode(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`)}`;

            const tokenResponse = await fetch(tokenExchangeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': basicAuthHeader, // <--- Use Basic Auth header
                },
                // Body parameters for PKCE
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code, // The code received from Twitter
                    redirect_uri: REDIRECT_URI, // Must match the registered redirect_uri
                    code_verifier: codeVerifier, // <--- The stored code_verifier
                    client_id: TWITTER_CLIENT_ID, // Include client_id in body too as per some examples/requirements
                }),
            });

            const tokenData = await tokenResponse.json();

            console.log('Edge Function: Token exchange status:', tokenResponse.status);
            console.log('Edge Function: Token exchange body:', tokenData); // Log potential errors from Twitter

            // Check for errors in the response
            if (!tokenResponse.ok || tokenData.error) {
                console.error('Edge Function: Error exchanging code for token:', tokenResponse.status, tokenData);
                 const redirectUrl = `${frontendOrigin}/dashboard/accounts?error=twitter_oauth_token_exchange_failed&details=${tokenData.error || tokenData.error_description || tokenResponse.status}`;
                 console.log('Edge Function: Redirecting to error URL:', redirectUrl);
                return Response.redirect(redirectUrl, 302);
            }

            // Extract tokens (Twitter provides refresh_token if 'offline.access' scope was requested)
            const accessToken = tokenData.access_token;
            const refreshToken = tokenData.refresh_token; // Will be present if offline.access scope included
            const expiresIn = tokenData.expires_in; // Access token validity in seconds

            console.log('Edge Function: Access Token obtained (partial):', accessToken ? accessToken.substring(0, 10) + '...' : 'Missing');
            console.log('Edge Function: Refresh Token obtained (partial):', refreshToken ? refreshToken.substring(0, 10) + '...' : 'Missing');


            if (!accessToken) {
                 console.error('Edge Function: Access token is missing from token exchange response.');
                  const redirectUrl = `${frontendOrigin}/dashboard/accounts?error=twitter_access_token_missing`;
                  console.log('Edge Function: Redirecting to error URL:', redirectUrl);
                return Response.redirect(redirectUrl, 302);
            }

            // 4. Fetch Twitter User Profile Information (using Access Token)
            console.log('Edge Function: Fetching Twitter user profile...');
            const profileApiUrl = 'https://api.twitter.com/2/users/me'; // Twitter v2 user endpoint

            // Specify the fields you need (profile_image_url, name, username, etc.)
            const userFields = ['profile_image_url', 'name', 'username', 'id']; // Include 'id' here too

            const profileResponse = await fetch(`${profileApiUrl}?user.fields=${userFields.join(',')}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`, // Use the obtained access token
                },
            });

            const profileData = await profileResponse.json();

            console.log('Edge Function: Profile response status:', profileResponse.status);
            console.log('Edge Function: Profile response body:', profileData); // Log potential errors from Twitter

            // Check for errors fetching profile
            if (!profileResponse.ok || profileData.errors) { // Twitter API v2 indicates errors in an 'errors' array
                console.error('Edge Function: Error fetching Twitter profile:', profileResponse.status, profileData.errors);
                 const redirectUrl = `${frontendOrigin}/dashboard/accounts?error=twitter_profile_fetch_failed&details=${profileData.errors ? JSON.stringify(profileData.errors) : profileResponse.status}`;
                 console.log('Edge Function: Redirecting to error URL:', redirectUrl);
                return Response.redirect(redirectUrl, 302);
            }

            // Extract Twitter user data
            const twitterUserData = profileData.data; // Twitter v2 user endpoint returns user data in 'data' field
            const twitterUserId = twitterUserData.id;
            const twitterHandle = twitterUserData.username; // In v2, 'username' is the handle
            const twitterDisplayName = twitterUserData.name;
            const twitterAvatarUrl = twitterUserData.profile_image_url;


            // 5. Save/Update Social Channel Information in Supabase
            console.log('Edge Function: Upserting Twitter data into social_channels...');

            const { error: dbError } = await supabaseAdmin
                .from('social_channels')
                .upsert({
                    user_id: userId, // Our app's user ID from oauth_states
                    social_channel: 'Twitter', // Static string for Twitter
                    channel_user_id: twitterUserId, // The Twitter user's unique ID
                    email: userEmail, // User's email from oauth_states
                    handle: twitterHandle, // Twitter username
                    display_name: twitterDisplayName, // Twitter display name
                    access_token: accessToken, // Twitter access token
                    refresh_token: refreshToken, // Twitter refresh token (if offline.access scope used)
                    avatar_url: twitterAvatarUrl, // Twitter profile picture URL
                    activated: true, // Mark as activated
                    timezone: userTimezone, // User's timezone from oauth_states
                    updated_at: new Date().toISOString(), // Timestamp
                }, {
                    onConflict: 'user_id, channel_user_id', // Conflict strategy
                    ignoreDuplicates: false // Ensure updates happen on conflict
                });

            console.log('Edge Function: Upsert operation complete.');

            if (dbError) {
                console.error('Edge Function: Error storing Twitter data:', dbError);
                 const redirectUrl = `${frontendOrigin}/dashboard/accounts?error=db_save_failed`;
                 console.log('Edge Function: Redirecting to error URL:', redirectUrl);
                return Response.redirect(redirectUrl, 302);
            }

            console.log(`Edge Function: Successfully connected Twitter account ${twitterHandle} for user ${userId}`);

            // 6. Redirect User Back to Frontend Success Page
            const redirectUrl = `${frontendOrigin}/dashboard/accounts?twitter_connected=true`;
            console.log('Edge Function: Redirecting to success URL:', redirectUrl);
            return Response.redirect(redirectUrl, 302);


        } catch (fetchError) {
            // Catch errors during fetch operations (token exchange or profile fetch)
            console.error('Edge Function: Fetch error during callback processing:', fetchError);
            const redirectUrl = `${frontendOrigin}/dashboard/accounts?error=fetch_error&details=${fetchError.message}`;
            console.log('Edge Function: Redirecting to error URL:', redirectUrl);
            return Response.redirect(redirectUrl, 302);
        }

    } else if (searchParams.has('error')) {
        // Handle errors returned directly by Twitter (e.g., user denied access)
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description') || 'No description provided';
        const state = searchParams.get('state');

        console.warn(`Edge Function: Received OAuth error from Twitter. Error: ${error}, Description: ${errorDescription}, State: ${state}`);

         // Attempt to retrieve frontendOrigin from state to redirect correctly
        let frontendOriginForErrorRedirect = `${new URL(url).protocol}//${new URL(url).host}`.replace('.supabase.co', '.vercel.app'); // Default fallback

        if(state) {
             try {
                 const { data: stateData, error: stateError } = await supabaseAdmin
                    .from('oauth_states')
                    .select('frontend_origin')
                    .eq('state', state)
                    .single();

                if (stateData?.frontend_origin) {
                    frontendOriginForErrorRedirect = stateData.frontend_origin;
                     // Clean up the state entry even if it was an error redirect
                     await supabaseAdmin.from('oauth_states').delete().eq('state', state);
                     console.log('Edge Function: Deleted state after error redirect.');
                } else if (stateError) {
                     console.warn('Edge Function: Could not retrieve frontend_origin for error redirect state cleanup:', stateError);
                }
            } catch(e) {
                 console.error('Edge Function: Error during state lookup for error redirect:', e);
            }
        }

        const redirectUrl = `${frontendOriginForErrorRedirect}/dashboard/accounts?error=twitter_oauth_denied&details=${errorDescription}`;
        console.log('Edge Function: Redirecting to error URL:', redirectUrl);
        return Response.redirect(redirectUrl, 302);

    } else {
        // Handle access without expected parameters (e.g., someone hitting the URL directly)
        console.warn('Edge Function: Accessed without expected OAuth callback or error parameters.');
        return new Response('Not Found', { status: 404 });
    }
});