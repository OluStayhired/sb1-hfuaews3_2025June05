// supabase/functions/twitter-poster/index.ts // <--- Updated function name
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabase } from './lib/supabaseClient.ts';

const TWITTER_REFRESH_TOKEN_EDGE_FUNCTION_URL = Deno.env.get('TWITTER_REFRESH_TOKEN_EDGE_FUNCTION_URL');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const TWITTER_API_URL = 'https://api.twitter.com/2/tweets';

// --- Helper function to make the Twitter API call ---
// Takes access token and tweet content, returns the fetch Response
const makeTwitterPostRequest = async (accessToken: string, tweetContent: string): Promise<Response> => {
    console.log('Edge Function: Making Twitter API post request...');
    const postPayload = { "text": tweetContent }; // Assuming simple  text posts

    return fetch(TWITTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(postPayload),
    });
};

// --- Helper function to handle a successful post response and update DB ---
const handleSuccessfulPost = async (postId: string, response: Response, attemptType: 'initial' | 'retry'): Promise<Response> => {
    console.log(`Edge Function: Handling successful Twitter post response (${attemptType} attempt).`);
    const successText = await response.text().catch(() => '');
    let postData = null;
    const successContentType = response.headers.get('Content-Type');

    if (successContentType && successContentType.includes('application/json') && successText.length > 0) {
        try {
            const parsedSuccessData = JSON.parse(successText);
            postData = parsedSuccessData?.data;
            console.log(`Edge Function: Extracted Tweet ID from success response (${attemptType}):`, postData?.id || 'N/A');
        } catch(e) {
             console.error(`Edge Function: Failed to parse success response JSON (${attemptType}):`, e);
             postData = { parse_error: e.message, raw_body_start: successText.substring(0, Math.min(successText.length, 200)) + (successText.length > 200 ? '...' : '') };
         }
    } else {
         console.warn(`Edge Function: Success response not JSON or empty (${attemptType}):`, successContentType);
         postData = { raw_body_text: successText.substring(0, Math.min(successText.length, 200)) + (successText.length > 200 ? '...' : '') };
    }

    console.log(`Edge Function: Updating DB status for post ID ${postId} after successful ${attemptType} post.`);
    const { error: updateError } = await supabase
        .from('user_post_schedule')
        .update({
            schedule_status: false,
            sent_post: true,
            posted_at: new Date().toISOString(),
            social_post_id: postData?.id || null,
            error_message: null, // Clear any previous error
            post_status_detail: `${attemptType}_success${postData?.id ? '' : '_no_id'}`, // e.g., 'initial_success', 'retry_success_no_id'
            updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

    if (updateError) {
        console.error(`Edge Function: Error updating post status after successful ${attemptType} Twitter post:`, updateError);
        // Critical failure - post sent but DB not updated. Log loudly.
        // Return 200 because post sent, but include DB error info
        return new Response(JSON.stringify({
            message: `Twitter post successful (${attemptType}), BUT DB update failed!`,
            twitterPostId: postData?.id || null,
            dbError: updateError.message
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    } else {
        console.log(`Edge Function: Database status updated successfully after successful ${attemptType} Twitter post.`);
        return new Response(JSON.stringify({
            message: `Twitter post successful (${attemptType}${attemptType === 'retry' ? ' after retry' : ''})`,
            twitterPostId: postData?.id || null
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }
};

// --- Helper function to handle a failed post response and update DB ---
const handleFailedPost = async (postId: string, response: Response | null, failureReason: string, errorDetails?: any): Promise<Response> => {
     const status = response?.status || 500; // Use response status if available, else 500
     const statusText = response?.statusText || 'Internal Error';
     console.error(`Edge Function: Handling post failure for ID ${postId}. Reason: ${failureReason}`);
     if (response) console.error('Failure response status:', status, statusText);
     if (errorDetails) console.error('Failure details:', errorDetails);

     const errorMessage = errorDetails?.detail || errorDetails?.message || response?.statusText || statusText || `Posting failed (${failureReason})`;

     // Update DB status for failure
     const { error: updateError } = await supabase
         .from('user_post_schedule')
         .update({
             schedule_status: false, // Mark as scheduled processing complete
             sent_post: false, // Not sent successfully
             posted_at: null,
             social_post_id: null,
             error_message: errorMessage.substring(0, Math.min(errorMessage.length, 255)), // Store the error message (truncate)
             post_status_detail: failureReason, // Store a code for the failure reason
             updated_at: new Date().toISOString(),
         })
         .eq('id', postId);

     if (updateError) {
         console.error('Edge Function: Error updating post status after posting failure:', updateError);
     } else {
         console.log('Edge Function: Database status updated successfully after posting failure:', postId);
     }

     // Return an appropriate error response to the caller
     return new Response(JSON.stringify({
         error: errorMessage,
         status: status,
         statusText: statusText,
         details: errorDetails,
         failureReason: failureReason
     }), {
         status: status >= 400 && status < 600 ? status : 500, // Return actual status if 4xx/5xx, else 500
         headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
     });
};


serve(async (req) => {

    if (req.method === 'OPTIONS') {
        console.log('Edge Function: Received CORS preflight request (OPTIONS)');
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        console.warn('Edge Function: Received non-POST request after OPTIONS check.');
        return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
    }

   let postId: string;
    try {
        const body = await req.json();
        postId = body.postId;
        if (!postId) {
            console.error('Edge Function: Missing postId in request body.');
            return await handleFailedPost(null as any, null, 'missing_post_id', { message: 'Missing postId in request body' }); // Handle failure early
        }
    } catch (e) {
        console.error('Edge Function: Error parsing request body:', e);
        return await handleFailedPost(null as any, null, 'invalid_request_body', { message: e.message }); // Handle failure early
    }

    // --- Idempotency Check ---
    const { data: existingPost, error: existingPostError } = await supabase
      .from('user_post_schedule')
      .select('sent_post, schedule_status')
      .eq('id', postId)
      .single();

    if (existingPostError) {
      console.error('Edge Function: Error checking existing post status:', existingPostError);
      return await handleFailedPost(postId, null, 'db_idempotency_check_failed', { dbError: existingPostError.message });
    }

    if (existingPost?.sent_post === true) {
      console.log(`Edge Function: Post ${postId} already marked as sent. Exiting.`);
      return new Response(JSON.stringify({ message: 'Post already sent' }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    }
    // --- End Idempotency Check ---


    // 1. Get the post content & 2. Get Twitter account details (Initial fetch)
    // Fetch user_id with the post to reliably link to social_channels
    const { data: post, error: postError } = await supabase
        .from('user_post_schedule')
        .select('full_content, user_handle, user_email, social_channel, user_id') // Select user_id here
        .eq('id', postId)
        .single();

    if (postError || !post || post.social_channel !== 'Twitter' || !post.user_id) {
        console.error('Edge Function: Error fetching post, post not for Twitter, or missing user_id:', postError || 'Not Twitter or missing user_id');
        return await handleFailedPost(postId, null, 'post_fetch_failed', { dbError: postError?.message || 'Post not found/invalid channel/missing user_id' });
    }

    // Fetch account by user_id and social_channel
    const { data: account, error: accountError } = await supabase
        .from('social_channels')
        .select('id, access_token, channel_user_id')
        .eq('user_id', post.user_id) // Fetch by user_id
        .eq('social_channel', 'Twitter')  
        .single();

    if (accountError || !account?.access_token || !account?.channel_user_id) {
        console.error('Edge Function: Error fetching Twitter account or missing token/user ID:', accountError);
        return await handleFailedPost(postId, null, 'account_fetch_failed', { dbError: accountError?.message || 'Account not found or missing credentials' });
    }

    const socialChannelId = account.id;
    let currentAccessToken = account.access_token; // Use this variable for the token


   try {
        // --- Attempt Post to Twitter API (Initial Try) ---
        console.log('Edge Function: Attempting initial Twitter post...');
        let response = await makeTwitterPostRequest(currentAccessToken, post.full_content);

        // --- Handle Initial Response ---
        if (!response.ok) {
            console.error('Edge Function: Twitter API error status (Initial):', response.status, response.statusText);

            // Attempt to read and parse error body for details
            const errorText = await response.text().catch(() => '');
            let errorBody = null;
            const contentType = response.headers.get('Content-Type');
            if (contentType && (contentType.includes('application/json') || contentType.includes('application/problem+json')) && errorText.length > 0) {
                try { errorBody = JSON.parse(errorText); } catch(e) { console.error('Failed parse initial error body:',e); errorBody = {parse_error: e.message, raw_body_start: errorText.substring(0,Math.min(errorText.length, 200))}; }
            } else { errorBody = { raw_body_text: errorText.substring(0,Math.min(errorText.length, 200))}; }


            // --- Check for Duplicate on Initial Failure ---
            const twitterErrorCodes = errorBody?.errors?.map(err => err.code) || [];
            const isDuplicateError = twitterErrorCodes.includes(187);
            if (response.status === 403 && isDuplicateError) { // Twitter often uses 403 for duplicates in v2
                console.warn('Edge Function: Twitter detected duplicate tweet (Code 187) on initial try. Marking as skipped.');
                // Update DB for duplicate and return success response for handled duplicate
                return await handleFailedPost(postId, response, 'skipped_duplicate_tweet', errorBody); // Use handleFailedPost but return 200 status for duplicate
            }

            // --- Check for 401 Unauthorized on Initial Failure ---
            if (response.status === 401) {
                console.warn('Edge Function: Twitter API returned 401 Unauthorized on initial try. Attempting refresh and retry.');

                // Trigger Refresh Function and AWAIT its completion
                if (TWITTER_REFRESH_TOKEN_EDGE_FUNCTION_URL) {
                    try {
                        console.log('Edge Function: Calling twitter-refresh-token Edge Function and awaiting...');
                        const refreshTriggerResponse = await fetch(TWITTER_REFRESH_TOKEN_EDGE_FUNCTION_URL, { // *** AWAITING HERE ***
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ socialChannelId: socialChannelId }),
                            // Optional: Add a secret key for refresh function if needed
                        });
                        // Optional: Check refreshResponse.ok and body for refresh success/failure details
                        if (!refreshTriggerResponse.ok) {
                            console.error('Edge Function: Token refresh trigger returned non-ok status:', refreshTriggerResponse.status);
                             // Could read refreshTriggerResponse body here for error details from refresh function
                        } else {
                            console.log('Edge Function: Refresh trigger call completed.');
                        }
                    } catch (refreshTriggerError: any) { // Catch network/unhandled errors calling refresh trigger
                        console.error('Edge Function: Failed to call twitter-refresh-token Edge Function:', refreshTriggerError);
                         // If calling refresh trigger fails, the retry will likely fail with stale token.
                         // Log this refresh *trigger* failure, and proceed to retry attempt which will then likely fail.
                    }
                } else {
                    console.error('Edge Function: TWITTER_REFRESH_TOKEN_EDGE_FUNCTION_URL is not configured. Cannot trigger token refresh or retry based on 401.');
                    // Handle this as a final failure due to configuration *before* retrying
                    return await handleFailedPost(postId, response, 'refresh_config_missing', errorBody); // Use original response/error body
                }

                // --- Re-fetch Account Details to get NEW Token ---
                console.log('Edge Function: Re-fetching account details for new token...');
                const { data: accountRetry, error: accountRetryError } = await supabase
                    .from('social_channels')
                    .select('access_token') // Just need the access token
                    .eq('id', socialChannelId) // Fetch by social channel ID
                    .single();

                if (accountRetryError || !accountRetry?.access_token) {
                    console.error('Edge Function: Failed to re-fetch account details or new token missing after refresh trigger:', accountRetryError);
                    // Handle this as a final failure because we couldn't get a new token to retry
                    return await handleFailedPost(postId, null, 'get_new_token_failed', { dbError: accountRetryError?.message || 'Unknown error' });
                }
                currentAccessToken = accountRetry.access_token; // Update the token for the retry

                // --- Retry Post Attempt ---
                console.log('Edge Function: Attempting Twitter post retry with new token...');
                let retryResponse = await makeTwitterPostRequest(currentAccessToken, post.full_content);

                // --- Handle Retry Response ---
                if (!retryResponse.ok) {
                    console.error('Edge Function: Twitter API error status (Retry):', retryResponse.status, retryResponse.statusText);
                    // Read and parse retry error body
                    const retryErrorText = await retryResponse.text().catch(() => '');
                    let retryErrorBody = null;
                    const retryContentType = retryResponse.headers.get('Content-Type');
                    if (retryContentType && (retryContentType.includes('application/json') || retryContentType.includes('application/problem+json')) && retryErrorText.length > 0) {
                        try { retryErrorBody = JSON.parse(retryErrorText); } catch(e) { console.error('Failed parse retry error body:',e); retryErrorBody = {parse_error: e.message, raw_body_start: retryErrorText.substring(0,Math.min(retryErrorText.length, 200))}; }
                    } else { retryErrorBody = { raw_body_text: retryErrorText.substring(0,Math.min(retryErrorText.length, 200))}; }

                    // Handle final retry failure by calling the general failure handler
                    return await handleFailedPost(postId, retryResponse, 'retry_failed', retryErrorBody); // Update DB and return appropriate status

                } else {
                    // --- Retry Successful! ---
                    console.log('Edge Function: Twitter post retry successful!');
                    // Handle successful retry by calling the general success handler
                    return await handleSuccessfulPost(postId, retryResponse, 'retry'); // Update DB and return 200
                }

            } else {
            // --- Handle Initial Failure (non-duplicate, non-401) ---
             console.error('Edge Function: General Twitter posting failure (non-401, non-duplicate) on initial try.');
             // Handle initial failure by calling the general failure handler
             return await handleFailedPost(postId, response, 'initial_failure', errorBody); // Use initial response and errorBody
            }

        } else {
            // --- Initial Try Successful! ---
            console.log('Edge Function: Initial Twitter post successful!');
            // Handle successful initial post by calling the general success handler
            return await handleSuccessfulPost(postId, response, 'initial'); // Update DB and return 200
        }

    } catch (err: any) { // Catch errors during the process
        console.error('Edge Function: Unhandled error during Twitter post process:', err);
        // Handle any unhandled exceptions by calling the general failure handler
        return await handleFailedPost(postId, null, 'unhandled_exception', { message: err.message, stack: err.stack });
    }
});

// --- Implement handleSuccessfulPost helper function ---
// Takes postId, the successful Response object, and the attempt type ('initial' or 'retry')
// Handles parsing success body, updating DB with success status, and returning final Response
// (Code for handleSuccessfulPost is provided above in the analysis block, keep it after serve)


// --- Implement handleFailedPost helper function ---
// Takes postId, the failed Response object (or null), a failure reason code, and error details
// Handles reading/parsing error body (if response provided), updating DB with failure status, and returning final Response
// (Code for handleFailedPost is provided above in the analysis block, keep it after serve)