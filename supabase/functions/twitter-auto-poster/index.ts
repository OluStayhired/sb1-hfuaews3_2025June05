// supabase/functions/twitter-auto-poster/index.ts // <--- Updated function name
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Assuming ./lib/supabaseClient.ts initializes the client with the SERVICE_ROLE_KEY
import { supabase } from './lib/supabaseClient.ts';
import { format, addMinutes } from 'npm:date-fns@2.29.3';
import { utcToZonedTime } from 'npm:date-fns-tz@2.0.0'; // Make sure date-fns-tz is installed

// --- Environment Variable for the twitter-poster Edge Function URL ---
// This Edge Function needs to know the public URL of the twitter-poster function it triggers
const TWITTER_POSTER_EDGE_FUNCTION_URL = Deno.env.get('TWITTER_POSTER_EDGE_FUNCTION_URL'); // <--- Updated Env Var Name

if (!TWITTER_POSTER_EDGE_FUNCTION_URL) {
    console.error('Edge Function: Missing TWITTER_POSTER_EDGE_FUNCTION_URL environment variable.'); // <--- Updated Log
    // Consider throwing an error or returning an immediate failure response
    // if critical env vars are missing. The cron job would see this error.
}

serve(async (req) => {
  try {
    console.log("Twitter auto-poster function started"); // <--- Updated Log

    // --- Check if called by Cron (optional but good practice) ---
    // Supabase Cron sends a specific header
    if (req.headers.get('x-supabase-cron') !== 'true') {
        console.warn('Edge Function: Called directly, not by Supabase Cron.');
        // You might want to restrict direct access in production
        // return new Response('Not authorized', { status: 401 });
    }

    const now = new Date(); // Gets current time in UTC
    const formattedDate = format(now, 'yyyy-MM-dd'); // UTC date for date filter

    console.log(`Raw server time (UTC): ${now.toISOString()}`);
    console.log(`Function execution time (UTC): ${format(now, 'HH:mm:ss zzz')}`); // Log UTC time


    // --- Step 1: Fetch all candidate posts that match basic criteria (Date, Status, Channel) ---
    // We will filter by time window *in code* based on user timezone later.
    // Include user_handle and user_id to fetch timezone efficiently later via social_channels table.
    const { data: candidatePosts, error: candidatesError } = await supabase
      .from('user_post_schedule')
      .select('*, user_handle, user_id') // Select all columns (*) and link fields for timezone lookup
      .eq('content_date', formattedDate) // Filter by today's UTC date
      .eq('schedule_status', true)     // Only active posts
      .eq('social_channel', 'Twitter'); // <--- Filter for Twitter posts

    if (candidatesError) {
       console.error('Error fetching candidate posts:', candidatesError);
       return new Response(JSON.stringify({
         error: 'Failed to fetch candidate posts',
         dateQueried: formattedDate,
         socialChannel: 'Twitter', // <--- Updated response detail
         scheduleStatus: true
       }), {
         status: 500,
         headers: { 'Content-Type': 'application/json' },
       });
    }

    console.log(`Found ${candidatePosts?.length || 0} candidate posts matching Date, Status, Channel.`);

    const postsToProcess = []; // This array will hold posts that pass the timezone-aware time window check

    // --- Step 2: Fetch Timezones for Relevant Users & Filter Candidates by Time ---
    if (candidatePosts && candidatePosts.length > 0) {
        // Get unique user IDs from the candidates to fetch timezones efficiently
        const uniqueUserIds = [...new Set(candidatePosts.map(p => p.user_id))];

        // Fetch timezones for all unique user IDs found.
        // ASSUMPTION: User timezone is stored in the 'social_channels' table with user_id.
        const { data: usersWithTimezones, error: userTimezonesError } = await supabase
             .from('social_channels') // Assuming table name
             .select('user_id, timezone') // Select user_id and timezone
             .in('user_id', uniqueUserIds) // Filter for only users who have candidate posts
             .eq('social_channel', 'Twitter'); // <--- Important: Get timezone from their Twitter account record

        if (userTimezonesError) {
             console.error('Error fetching user timezones:', userTimezonesError);
             // Log the error, but proceed. Posts for users whose timezone couldn't be fetched will be skipped.
        }

        // Create a map for quick timezone lookup by user_id
        const userTimezoneMap = new Map(usersWithTimezones?.map(user => [user.user_id, user.timezone])); // Map user_id to timezone string

        // Loop through each candidate post and perform the time check based on its user's timezone
        for (const post of candidatePosts) {
            const userTimezone = userTimezoneMap.get(post.user_id); // <--- Get timezone by user_id

            if (!userTimezone) {
                console.warn(`Skipping post ${post.id} (${post.content_time}): No timezone found for user ID ${post.user_id}. Ensure timezone is stored in social_channels table (or profiles) and linked correctly.`);
                continue; // Cannot check time window if timezone is missing for this user
            }

            // Convert function's execution time (UTC) to this specific user's timezone
            const userLocalNow = utcToZonedTime(now, userTimezone);

            // Calculate the +/- 1-minute window based on this user's local time
            const userLocalBeforeTime = format(addMinutes(userLocalNow, -1), 'HH:mm:ss'); // Time string in user's local timezone
            const userLocalAfterTime = format(addMinutes(userLocalNow, 1), 'HH:mm:ss');  // Time string in user's local timezone

             console.log(`Checking Post ${post.id} (${post.content_time}) for user ${post.user_id} (Timezone: ${userTimezone}). Window: ${userLocalBeforeTime} to ${userLocalAfterTime}`);


            // Compare the post's stored content_time (HH:mm:ss literal)
            // against the calculated window strings IN THE USER'S LOCAL TIMEZONE.
            // Simple string comparison works for HH:mm:ss *if* both strings are in the same timezone.
            if (post.content_time >= userLocalBeforeTime && post.content_time <= userLocalAfterTime) {
                console.log(`Post ${post.id} (${post.content_time}) MATCHES time window.`);
                postsToProcess.push(post); // Add the post to the list to be processed
            } else {
                 console.log(`Post ${post.id} (${post.content_time}) OUTSIDE time window.`);
            }
        }
    } else {
        console.log("No candidate posts found matching Date, Status, Channel. No posts to process.");
    }


    // --- Step 3: Trigger twitter-poster Edge Function for each filtered post ---
    let processedCount = 0;
    const failedToProcess = []; // Track posts that failed to trigger the poster function

    console.log(`Found ${postsToProcess.length} posts passing all criteria including timezone-aware time window. Triggering twitter-poster for each...`); // <--- Updated Log

     if (!TWITTER_POSTER_EDGE_FUNCTION_URL) { // <--- Check Updated Env Var
          console.error('Edge Function: Cannot trigger twitter-poster, URL is missing.'); // <--- Updated Log
           return new Response(JSON.stringify({
             error: 'Twitter poster Edge Function URL not configured', // <--- Updated Response Message
             timestamp: new Date().toISOString(),
           }), {
             status: 500,
             headers: { 'Content-Type': 'application/json' },
           });
     }


    for (const post of postsToProcess) {
      try {
        console.log(`Attempting to trigger twitter-poster for post ID: ${post.id}`); // <--- Updated Log

        // --- Trigger the twitter-poster Edge Function via HTTP POST ---
        const triggerResponse = await fetch(TWITTER_POSTER_EDGE_FUNCTION_URL, { // <--- Use Updated Env Var URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                 // No Authorization header needed here if twitter-poster uses Service Role Key
            },
            body: JSON.stringify({ postId: post.id }), // Pass the post ID
        });

        console.log(`Trigger response status for post ${post.id}:`, triggerResponse.status);

        // Check the response from the twitter-poster Edge Function
        if (!triggerResponse.ok) {
            const errorBody = await triggerResponse.json().catch(() => null); // Attempt to parse error body
            console.error(`Error triggering twitter-poster for post ${post.id}:`, triggerResponse.status, triggerResponse.statusText, 'Body:', errorBody); // <--- Updated Log
            failedToProcess.push({ postId: post.id, status: triggerResponse.status, details: errorBody });

            // --- Optional: Update DB status to 'failed_trigger' for this post ---
            // This prevents the scheduler from picking it up again endlessly if triggering consistently fails
            // await supabase.from('user_post_schedule').update({ schedule_status: false, sent_post: false, error_message: `Failed to trigger poster: ${triggerResponse.status}` }).eq('id', post.id);

        } else {
             // Assuming twitter-poster returns 200 on success or handled duplicate
            console.log(`Successfully triggered twitter-poster for post ${post.id}`); // <--- Updated Log
             processedCount++; // Increment count if triggering was successful
             // The actual sent_post/schedule_status update is handled BY twitter-poster
        }

      } catch (triggerError) {
        console.error(`Network or unhandled error triggering twitter-poster for post ${post.id}:`, triggerError); // <--- Updated Log
        failedToProcess.push({ postId: post.id, details: triggerError.message });
         // --- Optional: Update DB status to 'failed_network' for this post ---
         // await supabase.from('user_post_schedule').update({ schedule_status: false, sent_post: false, error_message: `Network error triggering poster: ${triggerError.message}` }).eq('id', post.id);
      }
    }


    // --- Step 4: Update response/logs ---
    // Calculate UK time again for the response (if needed, optional for scheduler response)
    const ukResponseTime = utcToZonedTime(now, 'Europe/London');


    return new Response(JSON.stringify({
      message: 'Twitter auto-poster function completed', // <--- Updated Response Message
      timestamp: now.toISOString(), // Still UTC execution timestamp
      dateQueried: formattedDate, // Still UTC date used for initial query
      potentialCandidatesFound: candidatePosts?.length || 0, // Count matching date, status, channel
      postsFoundMatchingTimeWindow: postsToProcess.length, // Count matching all criteria including timezone time window
      triggerAttemptsSuccessful: processedCount, // Count of successful triggers to poster function
      triggerAttemptsFailed: failedToProcess.length, // Count of failed triggers
      // Optional: Include details of failed posts for debugging
      // failedPostDetails: failedToProcess
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });


    // --- Fatal error handling for the scheduler function itself ---
  } catch (error) {
    console.error('Fatal error in twitter auto-poster function:', error); // <--- Updated Log
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});