// supabase/functions/twitter-refresh-token/index.ts // New Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Assuming ./lib/supabaseClient.ts initializes the client with the SERVICE_ROLE_KEY
import { supabase } from './lib/supabaseClient.ts'; // <--- Import the shared client
//import { btoa } from 'https://deno.land/std@0.224.2/encoding/base64.ts'; 
// Import btoa for Base64 encoding

// --- Environment Variables ---
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are used in ./lib/supabaseClient.ts
const TWITTER_CLIENT_ID = Deno.env.get('TWITTER_CLIENT_ID'); // Need these as secrets for THIS function
const TWITTER_CLIENT_SECRET = Deno.env.get('TWITTER_CLIENT_SECRET'); // Need these as secrets for THIS function

// --- IMPORTANT: Ensure  ./lib/supabaseClient.ts uses the SERVICE_ROLE_KEY ---
// The supabase client imported from ./lib/supabaseClient.ts MUST be initialized
// with the SUPABASE_SERVICE_ROLE_KEY for this function to have permission
// to update the social_channels table bypassing RLS.
// If your ./lib/supabaseClient.ts uses the anon key, this will fail RLS.
// You might need two client initializations in ./lib: one for anon, one for service role,
// and import the service role one specifically, e.g., import { supabaseServiceRole } from './lib/supabaseClient.ts';

// --- Helper function for Base64 Encoding (for Basic Auth header) ---
function base64Encode(str: string): string {
    return btoa(str);
}

// --- CORS Headers ---
// Include if you might trigger this function directly from frontend for testing/manual refresh
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Replace with your frontend origin in production
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token'; // Twitter's token endpoint

serve(async (req) => {
    // --- Handle CORS Preflight Requests (OPTIONS method) ---
    if (req.method === 'OPTIONS') {
        console.log('Refresh Edge Function: Received CORS preflight request (OPTIONS)');
        return new Response(null, {
            status: 204,
            headers: CORS_HEADERS,
        });
    }

    // --- Now handle the actual POST request ---
    if (req.method !== 'POST') {
        console.warn('Refresh Edge Function: Received non-POST request after OPTIONS check.');
        return new Response('Method Not Allowed', {
            status: 405,
            headers: CORS_HEADERS,
        });
    }

    let socialChannelId: string; // Expecting the PK of the social_channels table record
    try {
        const body = await req.json();
        socialChannelId = body.socialChannelId; // Expecting { socialChannelId: 'uuid-of-the-record' }
        if (!socialChannelId) {
            console.error('Refresh Edge Function: Missing socialChannelId in request body.');
            return new Response(JSON.stringify({ error: 'Missing socialChannelId' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            });
        }
        console.log('Refresh Edge Function: Received request for socialChannelId:', socialChannelId);

    } catch (e) {
        console.error('Refresh Edge Function: Error parsing request body:', e);
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }

    // --- Check for required Twitter API credentials environment variables ---
    // These must be set as secrets for *this* twitter-refresh-token function
    if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
        console.error('Refresh Edge Function: Missing Twitter CLIENT_ID or CLIENT_SECRET environment variables.');
        return new Response(JSON.stringify({ error: 'Twitter API credentials not configured' }), {
            status: 500, // Server configuration error
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }

    // 1. Fetch the refresh_token from the database using the imported supabase client
    try {
        console.log('Refresh Edge Function: Fetching refresh token from DB...');
        const { data: account, error: fetchError } = await supabase // <--- Use imported supabase client
            .from('social_channels')
            .select('refresh_token, user_id, social_channel') // Select refresh_token and other useful info
            .eq('id', socialChannelId)
            .eq('social_channel', 'Twitter') // Ensure it's a Twitter account
            .single();

        if (fetchError || !account || account.social_channel !== 'Twitter' || !account.refresh_token) {
            console.error('Refresh Edge Function: Could not fetch Twitter account or missing refresh token for ID:', socialChannelId, fetchError || 'Data missing');
             // Decide how to handle: account not found, not Twitter, or refresh token is null
             // Marking as needing re-auth might be appropriate
            const errorMessage = fetchError ? 'Database error fetching account' : 'Twitter account not found or refresh token missing';
            // Optional: Update DB to indicate refresh token missing for this account if needed
            // await supabase.from('social_channels').update({ activated: false, error_message: 'Refresh token missing or invalid' }).eq('id', socialChannelId); // <--- Use imported supabase

            return new Response(JSON.stringify({ error: errorMessage }), {
                status: 404, // Or 400 if data is malformed/missing as per expectation
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            });
        }

        const refreshToken = account.refresh_token;
        console.log(`Refresh Edge Function: Found refresh token for social channel ID: ${socialChannelId} (User ID: ${account.user_id})`);


        // 2. Make the Token Refresh API Call to Twitter
        console.log('Refresh Edge Function: Attempting to refresh Twitter access token...');
        const basicAuthHeader = `Basic ${base64Encode(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`)}`;

        const refreshResponse = await fetch(TWITTER_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': basicAuthHeader, // Use Basic Auth with client ID/secret
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken, // Use the refresh token from DB
                client_id: TWITTER_CLIENT_ID, // Include client_id in  body as per Twitter docs
            }),
        });

        const refreshData = await refreshResponse.json();

        console.log('Refresh Edge Function: Twitter token refresh status:', refreshResponse.status);
        console.log('Refresh Edge Function: Twitter token refresh response body:', refreshData);

        // 3. Handle the Response from Twitter
        if (!refreshResponse.ok || refreshData.error) {
            console.error('Refresh Edge Function: Error refreshing token:', refreshResponse.status, refreshData.error || refreshData.error_description || refreshResponse.statusText);
             // The refresh token might be invalid or expired itself
             // Mark the account as inactive or needing re-authentication

            const errorMessage = `Token refresh failed: ${refreshData.error || refreshData.error_description || 'Unknown error'}`;
            await supabase.from('social_channels') // <--- Use imported supabase client
                 .update({
                     activated: false, // Deactivate the account
                     error_message: errorMessage, // Store the specific error
                     updated_at: new Date().toISOString(),
                     // Optionally clear tokens or mark them invalid
                 })
                 .eq('id', socialChannelId);

            return new Response(JSON.stringify({ error: errorMessage }), {
                status: 400, // Indicate a client-side issue (invalid token)
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            });
        }

        // Success: Extract new tokens
        const newAccessToken = refreshData.access_token;
        const newRefreshToken = refreshData.refresh_token; // Often a new one is issued

        if (!newAccessToken) {
             console.error('Refresh Edge Function: New access token is missing from refresh response.');
              // This is an unexpected success response format
             const errorMessage = 'Token refresh succeeded but new access token missing';
             await supabase.from('social_channels') // <--- Use imported supabase client
                 .update({
                     activated: false, // Deactivate if new token not provided
                     error_message: errorMessage,
                     updated_at: new Date().toISOString(),
                 })
                 .eq('id', socialChannelId);

             return new Response(JSON.stringify({ error: errorMessage }), {
                 status: 500, // Indicate an unexpected server issue
                 headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
             });
        }

        console.log('Refresh Edge Function: Token refresh successful.');
        console.log('Refresh Edge Function: New Access Token obtained (partial):', newAccessToken.substring(0, 10) + '...');
        console.log('Refresh Edge Function: New Refresh Token obtained (partial):', newRefreshToken ? newRefreshToken.substring(0, 10) + '...' : 'None Issued');


        // 4. Update the social_channels table with the new tokens using the imported supabase client
        console.log('Refresh Edge Function: Updating DB with new tokens...');
        const { error: updateError } = await supabase // <--- Use imported supabase client
            .from('social_channels')
            .update({
                access_token: newAccessToken,
                refresh_token: newRefreshToken || null, // Update with new refresh token if provided, else null
                // Reset error status if it was previously set due to auth failure
                activated: true, // Mark account as active again
                error_message: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', socialChannelId); // Update the specific record

        if (updateError) {
            console.error('Refresh Edge Function: Error updating DB with new tokens:', updateError);
            // This is a critical error after successful refresh. Log and perhaps mark as failed.
             // The account is now inconsistent (API has new tokens, DB has old)
            return new Response(JSON.stringify({ error: 'Failed to update database with new tokens' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            });
        }

        console.log('Refresh Edge Function: Database updated successfully with new tokens.');

        // 5. Return Success
        return new Response(JSON.stringify({
            message: 'Twitter token refreshed successfully',
            socialChannelId: socialChannelId,
            userId: account.user_id // Include user ID in response
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });

    } catch (err) {
        // Catch network errors or unexpected errors during the process
        console.error('Refresh Edge Function: Unhandled error during token refresh:', err);
        // Optional: Attempt to update DB to mark account as having refresh error
        // await supabase.from('social_channels').update({ activated: false, error_message: `Unhandled refresh error: ${err.message}` }).eq('id', socialChannelId); // <--- Use imported supabase

        return new Response(JSON.stringify({ error: 'Internal server error during token refresh', details: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }
});