// supabase/functions/linkedin-poster/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabase } from './lib/supabaseClient.ts';

// --- CORS Headers ---
// Define the CORS headers you want to send.
// For production, replace '*' with your Netlify frontend origin:
// 'https://dapper-dragon-cd4c40.netlify.app'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Specify allowed methods for CORS
  'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Specify allowed headers for CORS
};

const LINKEDIN_API_URL = 'https://api.linkedin.com/v2/posts';

serve(async (req) => {

  // --- Handle CORS Preflight Requests (OPTIONS method) ---
    if (req.method === 'OPTIONS') {
        console.log('Edge Function: Received CORS preflight request (OPTIONS)');
        // Respond successfully with CORS headers
        return new Response(null, { // Respond with an empty body
            status: 204, // Use 204 No Content for successful OPTIONS
            headers: CORS_HEADERS, // Include the CORS headers
        });
    }

    // --- Now handle the actual POST request ---
    if (req.method !== 'POST') {
         console.warn('Edge Function: Received non-POST request after OPTIONS check.');
         // For non-POST requests that aren't OPTIONS, return 405 with CORS headers
         return new Response('Method Not Allowed', {
             status: 405,
             headers: CORS_HEADERS, // Include CORS headers
         });
    }


   let postId: string;
    try {
        const body = await req.json();
        postId = body.postId;
        if (!postId) {
             console.error('Edge Function: Missing postId in request body.');
              return new Response(JSON.stringify({ error: 'Missing postId' }), {
                 status: 400,
                 headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, 
                // Include CORS headers
             });
        }
    } catch (e) {
         console.error('Edge Function: Error parsing request body:', e);
          return new Response(JSON.stringify({ error: 'Invalid request body' }), {
             status: 400,
             headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, 
            // Include CORS headers
         });
    }


    // --- Idempotency Check (Good Practice) ---
    // Check if the post has already been sent to prevent duplicate posts
    // --- Use the imported 'supabase' client here ---
    const { data: existingPost, error: existingPostError } = await supabase
      .from('user_post_schedule')
      .select('sent_post, schedule_status')
      .eq('id', postId)
      .single();

    if (existingPostError) {
      console.error('Edge Function: Error checking existing post status:', existingPostError);
        return new Response(JSON.stringify({ error: 'Failed to verify post status' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }

    if (existingPost?.sent_post === true) {
      console.log(`Edge Function: Post ${postId} already marked as sent. Exiting.`);
        return new Response(JSON.stringify({ message: 'Post already sent' }), {
          status: 200, // Or 208 Already Reported
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }
    // --- End Idempotency Check ---


    // 1. Get the post content from the database
    // Re-fetch the full post data since the initial check only got status
    // --- Use the imported 'supabase' client here ---
    const { data: post, error: postError } = await supabase
        .from('user_post_schedule')
        .select('full_content, user_handle, user_email, social_channel') // Select content and link info
        .eq('id', postId)
        .single();

    if (postError || !post || post.social_channel !== 'LinkedIn') {
        console.error('Edge Function: Error fetching post or post is not for LinkedIn:', postError || 'Not LinkedIn');
        const status = postError ? 500 : 400;
        const message = postError ? 'Failed to fetch post' : 'Post is not for LinkedIn';
        return new Response(JSON.stringify({ error: message }), {
            status: status,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }

    // 2. Get the LinkedIn account details including the LinkedIn User URN
    // Modify this query to select channel_user_id (assuming it stores the URN sub)
    // --- Use the imported 'supabase' client here ---
    const { data: account, error: accountError } = await supabase
        .from('social_channels')
        .select('access_token, handle, channel_user_id') // <-- Select channel_user_id
        // It's more reliable to query by user_id and social_channel if possible,
        // as handle/email might change or not be unique across users.
        // Assuming your post table links user_id, or you can get user_id from the initial post fetch
        // Let's stick to the original query pattern for now but note the potential improvement.
        .eq('handle', post.user_handle)
        .eq('email', post.user_email)
        .eq('social_channel', 'LinkedIn')
        .single();

    if (accountError || !account?.access_token || !account?.channel_user_id) { // Check for access_token and channel_user_id
        console.error('Edge Function: Error fetching LinkedIn account or missing access token/URN:', accountError);
        return new Response(JSON.stringify({ error: 'Failed to fetch LinkedIn account or credentials' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }

    // --- Format the LinkedIn User URN ---
    const linkedInUserUrn = `urn:li:person:${account.channel_user_id}`;
    console.log('Edge Function: Posting as LinkedIn User URN:', linkedInUserUrn);


    // 3. Post to LinkedIn API
    try {
        console.log('Edge Function: Constructing LinkedIn post payload...');

        // --- Construct the CORRECT LinkedIn post payload ---
       const postPayload = {
            "author": linkedInUserUrn, 
            "lifecycleState": "PUBLISHED",
            "commentary": post.full_content, 
            "visibility": "PUBLIC", 
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "targetEntities": [], 
                "thirdPartyDistributionChannels": [] 
            },
            // isReshareDisabledByAuthor is likely optional for a new post, omitting for simplicity
        };

        console.log('Edge Function: Sending payload to LinkedIn:', JSON.stringify(postPayload));


        const response = await fetch(LINKEDIN_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${account.access_token}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                 // LinkedIn API might require a specific LinkedIn-Version header, check docs
                 'LinkedIn-Version': '202401', // Example version header
            },
            body: JSON.stringify(postPayload), // Use the correct payload
        });

         // --- Improved Error Logging for LinkedIn API response ---
         if (!response.ok) {
            console.error('Edge Function: LinkedIn API error status:', response.status, response.statusText);

            // Attempt to read the response body as text first for debugging
            const errorText = await response.text().catch(() => 'Could not read response body as text');
            console.error('Edge Function: LinkedIn API error body (text):', errorText);

           let postData = null;
        const successContentType = response.headers.get('Content-Type');
        if (successContentType && successContentType.includes('application/json')) {
            try {
                postData = JSON.parse(successText); // Try parsing the text we already read
                console.log('Edge Function: LinkedIn API success body (parsed JSON):', postData);
                console.log('Edge Function: LinkedIn post successful. Post ID:', postData?.id || 'N/A'); // Use optional chaining just in case

            } catch (jsonParseError) {
                console.error('Edge Function: Failed to parse success body as JSON:', jsonParseError);
                 // Log the parsing error, but the post *did* succeed API-side.
                 // We should still attempt the DB update if postData is partially available or based on status 200.
                 // We might not get the post ID if parsing failed here.
                 // Decide how critical getting postData.id is vs marking status=true.
                 // For now, proceed with DB update assuming status 200 is primary success indicator,
                 // but log the parsing failure prominently.
                 postData = { parse_error: jsonParseError.message, 
                             raw_body_start: successText.substring(0, 200) + (successText.length > 200 ? '...' : '') 
                            };
            }
        } else {
            console.warn('Edge Function: Success response was not JSON (Content-Type:', successContentType, ')');
            // If not JSON, we can't get postData.id. Log and proceed without post ID.
             postData = { raw_body_text: successText.substring(0, 200) + (successText.length > 200 ? '...' : '') };
              }

            // Attempt to parse the response body as JSON
            let errorBody = null;
            const contentType = response.headers.get('Content-Type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    errorBody = JSON.parse(errorText);
                    console.error('Edge Function: LinkedIn API error body (parsed JSON):', errorBody);

                    // --- Check for the specific DUPLICATE_POST error code ---
                    // Note: Sometimes the top-level code might be ACCESS_DENIED even if DUPLICATE_POST is in details
                    if (response.status === 422 && errorBody?.errorDetails?.inputErrors?.[0]?.code === 'DUPLICATE_POST') {
                      console.warn('Edge Function: LinkedIn detected duplicate post. Marking post record as completed (skipped duplicate).');

                        // --- Update DB: Mark as processed, potentially log duplicate reason ---
                        const { error: updateError } = await supabase
                            .from('user_post_schedule')
                            .update({
                                schedule_status: false, // Mark as scheduling complete
                                sent_post: false, // It wasn't sent *this* attempt
                                post_status_detail: 'skipped_duplicate',
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', postId);

                        if (updateError) {
                            console.error('Edge Function: Error updating post status after duplicate detection:', updateError);
                        }

                        // Return a specific response indicating it was a duplicate
                         return new Response(JSON.stringify({
                            message: 'Post detected as duplicate by LinkedIn',
                            status: 'skipped_duplicate',
                            linkedinError: errorBody // Include LinkedIn's error details
                         }), {
                            status: 200, // Return 200 as the Edge Function successfully handled the duplicate
                            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, // Include CORS headers
                         });
                    }
                     // --- End DUPLICATE_POST handling ---


                } catch (jsonParseError) {
                console.error('Edge Function: Failed to parse error body as JSON:', jsonParseError);
                errorBody = {  parse_error: jsonParseError.message, 
                               raw_body_start: errorText.substring(0, 200) + (errorText.length > 200 ? '...' : '') 
                            };
                }
            } else {
                console.warn('Edge Function: Error response was not JSON (Content-Type:', contentType, ')');
                errorBody = { raw_body_text: errorText.substring(0, 200) + (errorText.length > 200 ? '...' : '') };
            }


            // --- Default Error Handling (for non-duplicate, non-204 errors) ---
            // If it wasn't a duplicate or 204, treat as a general posting failure
            // You might update the DB here to mark it as failed for later review/retry
             console.error('Edge Function: General LinkedIn posting failure.');
             // Optional: Update DB with a 'failed' status and error details
             // await supabase.from('user_post_schedule').update({ schedule_status: false, sent_post: false, error_message: JSON.stringify(errorBody) }).eq('id', postId);

             return new Response(JSON.stringify({
                 error: 'Failed to post to LinkedIn',
                 status: response.status, // Use the actual status from LinkedIn
                 statusText: response.statusText,
                 details: errorBody // Include the parsed or raw error body details
                }), {
                status: response.status >= 400 && response.status < 500 ? 400 : 500,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }, // Include CORS headers
            });
         } else {
        // --- Start of MODIFIED Success Handling Block (response.ok is true) ---
        console.log('Edge Function: LinkedIn API response status (Success):', response.status, response.statusText);

        // *** NEW: Read body as text first to prevent JSON parsing crash on empty body ***
        const successText = await response.text().catch(() => ''); // Read as text, default to empty string on error
        console.log('Edge Function: LinkedIn API success body (text):', successText.substring(0, 500) + (successText.length > 500 ? '...' : '')); // Log partial text

        let postData = null;
        const successContentType = response.headers.get('Content-Type');

        // Attempt to parse as JSON ONLY if Content-Type suggests it AND the text is not empty
        if (successContentType && successContentType.includes('application/json') && successText.length > 0) {
            try {
                postData = JSON.parse(successText); // Try parsing the text we already read
                console.log('Edge Function: LinkedIn API success body (parsed JSON):', postData);

                 // Check for post ID in the parsed data - LinkedIn v2 post success usually returns { id: "..." }
                console.log('Edge Function: LinkedIn post successful. Post ID:', postData?.id || 'N/A'); // Use optional chaining just in case
            } catch (jsonParseError) {
                console.error('Edge Function: Failed to parse success body as JSON:', jsonParseError);
                // Log the parsing error, but the post *did* succeed API-side.
                // The social_post_id will be null in this case.
                postData = { parse_error: jsonParseError.message,
                             raw_body_start: successText.substring(0, 200) + (successText.length > 200 ? '...' : '')
                            };
            }
        } else {
     console.warn('Edge Function: LinkedIn Success response was not JSON (Content-Type:', successContentType, ') or body was empty.');
            // If not JSON or empty, we can't get postData.id. Log and proceed without post ID.
            postData = { raw_body_text: successText.substring(0, 200) + (successText.length > 200 ? '...' : '') };
        }


        // 4. Update the post status in the database (after successful LinkedIn post)
        // *** This block is now GUARANTEED to run after response.ok is true ***
        console.log('Edge Function: Updating DB status for post ID:', postId);
        const { error: updateError } = await supabase
            .from('user_post_schedule')
            .update({
                schedule_status: false,
                sent_post: true,
                posted_at: new Date().toISOString(),
                social_post_id: postData?.id || null, 
              // <--- Use postData?.id, handles null/undefined postData or missing id from parsing
                updated_at: new Date().toISOString(),
            })
            .eq('id', postId);

        if (updateError) {
            console.error('Edge Function: Error updating post status after successful LinkedIn post:', updateError);
            // This is a critical error - the post was sent but DB not updated.
            // Consider alerting or logging this failure prominently.
        } else {
            console.log('Edge Function: Database status updated successfully for post ID:', postId);
         }

        // Return a success response to the caller (e.g., your scheduling system)
        return new Response(JSON.stringify({
             message: 'LinkedIn post was successful', // Keep this message
             linkedinPostId: postData?.id || null // Return the LinkedIn post ID if obtained
            }), {
            status: 200, // Still return 200 because the post itself succeeded
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
        // --- End of MODIFIED Success Handling Block ---

        } // This curly brace closes the 'else' block for if(!response.ok)

    } catch (err) {
        // Catch errors during the fetch call itself (network issues, etc.)
        console.error('Edge Function: Error during LinkedIn post API call (network/unhandled):', err);
        // Note: If a network error happens *before* the API responds, the DB won't be updated here either.
        // Consider adding logic to update DB with a network failure status in this catch block.
        return new Response(JSON.stringify({ error: 'Error during LinkedIn post API call (network/unhandled)', details: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        });
    }
});
