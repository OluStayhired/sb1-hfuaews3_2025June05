// Supabase Edge Function (e.g.,/supabase/functions/bluesky-poster/index.ts)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { BskyAgent } from 'npm:@atproto/api';
import { supabase } from './lib/supabaseClient.ts';
import { format, addMinutes } from 'npm:date-fns@2.29.3';
import { utcToZonedTime } from 'npm:date-fns-tz@2.0.0'; // Make sure date-fns-tz is installed

serve(async (req) => {
  try {
    console.log("Bluesky poster function started");

    const now = new Date(); // Gets current time in UTC
    const formattedDate = format(now, 'yyyy-MM-dd'); // UTC date for date filter

    console.log(`Raw server time (UTC): ${now.toISOString()}`);
    console.log(`Function execution time (UTC): ${format(now, 'HH:mm:ss zzz')}`);

    console.log(`Global UTC time window (for reference): ${format(addMinutes(now, -1), 'HH:mm:ss')} to ${format(addMinutes(now, 1), 'HH:mm:ss')}`);


    // --- Step 1: Fetch all candidate posts that match basic criteria (Date, Status, Channel) ---
    // Make sure 'target_timezone' is included in the select if not covered by '*'
    const { data: candidatePosts, error: candidatesError } = await supabase
      .from('user_post_schedule')
      .select('*, user_handle') // 'target_timezone' should be included here if it's a column
      .eq('content_date', formattedDate) // Filter by today's UTC date
      .eq('schedule_status', true)       // Only active posts
      .eq('social_channel', 'Bluesky'); // Only Bluesky posts

    if (candidatesError) {
      console.error('Error fetching candidate posts:', candidatesError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch candidate posts',
        dateQueried: formattedDate,
        socialChannel: 'Bluesky',
        scheduleStatus: true
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${candidatePosts?.length || 0} candidate posts matching Date, Status, Channel.`);

    const postsToProcess = []; // This array will hold posts that pass the timezone-aware time window check

    // --- Step 2: Filter Candidates by Time (using post's target_timezone directly) ---
    if (candidatePosts && candidatePosts.length > 0) {
      // We no longer need to fetch timezones from 'social_channels' for this filtering step.
      // The 'target_timezone' is already available directly on each 'post' object.

      for (const post of candidatePosts) {
          // Retrieve the target_timezone directly from the post object
          const postTargetTimezone = post.target_timezone; 

          if (!postTargetTimezone) {
              console.warn(`Skipping post ${post.id} (${post.content_time}): No target_timezone found for this post. Ensure it's stored in user_post_schedule.`);
              continue; // Cannot check time window if timezone is missing for this specific post
          }

          // Convert function's execution time (UTC) to this specific post's target timezone
          const postLocalNow = utcToZonedTime(now, postTargetTimezone);

          // Calculate the +/- 1-minute window based on this post's local time
          const postLocalBeforeTime = format(addMinutes(postLocalNow, -1), 'HH:mm:ss'); // Time string in post's target timezone
          const postLocalAfterTime = format(addMinutes(postLocalNow, 1), 'HH:mm:ss');    // Time string in post's target timezone

          console.log(`Checking Post ${post.id} (${post.content_time}) for user ${post.user_handle} (Target Timezone: ${postTargetTimezone}). Window: ${postLocalBeforeTime} to ${postLocalAfterTime}`);

          // Compare the post's stored content_time (HH:mm:ss literal, which is in postTargetTimezone)
          // against the calculated window strings IN THE SAME TIMEZONE.
          if (post.content_time >= postLocalBeforeTime && post.content_time <= postLocalAfterTime) {
              console.log(`Post ${post.id} (${post.content_time}) MATCHES time window.`);
              postsToProcess.push(post); // Add the post to the list to be processed
          } else {
              console.log(`Post ${post.id} (${post.content_time}) OUTSIDE time window.`);
          }
      }
    } else {
        console.log("No candidate posts found matching Date, Status, Channel. No posts to process.");
    }

    // --- Step 3: Process the filtered posts ---
    let processedCount = 0;
    console.log(`Found ${postsToProcess.length} posts passing all criteria including timezone-aware time window. Processing...`);

    for (const post of postsToProcess) {
      try {
        console.log(`Processing post ID: ${post.id} for user ${post.user_handle}`);
        
        // 4. Fetch account details (still needed for login credentials)
        // This query *still* needs to fetch 'app_password' and 'handle' from 'social_channels'.
        // It's okay if it fetches 'timezone' from there too, but it won't be used for scheduling.
        const { data: account, error: accountError } = await supabase
          .from('social_channels')
          .select('handle, app_password') // No longer need 'timezone' here for scheduling logic
          .eq('email', post.user_email)
          .eq('handle', post.user_handle)
          .eq('social_channel', 'Bluesky')
          .single();

        if (accountError) {
          console.error(`Error fetching account details for handle ${post.user_handle}:`, accountError);
          continue; 
        }

        console.log(`Found account for handle: ${account.handle}`);

        // 5. Create Bluesky Agent and Login
        const agent = new BskyAgent({ service: 'https://bsky.social' });
        try {
          console.log(`Attempting login for handle: ${account.handle}`);
          await agent.login({
            identifier: account.handle,
            password: account.app_password,
          });
          console.log(`Login successful for handle: ${account.handle}`);
        } catch (loginError) {
          console.error(`Login failed for handle ${account.handle}:`, loginError);
          continue; 
        }

        // 6. Post to Bluesky
        try {
          console.log(`Posting to Bluesky for handle: ${account.handle}`);
          const postResult = await agent.post({ text: post.full_content });

          console.log(`Successfully posted to Bluesky for handle ${account.handle}:`, postResult);
          processedCount++; 

          // 7. Update schedule status
          const { error: updateError } = await supabase
            .from('user_post_schedule')
            .update({ schedule_status: false, sent_post: true })
            .eq('id', post.id);

          if (updateError) {
            console.error(`Error updating schedule status for post ${post.id}:`, updateError);
          } else {
            console.log(`Updated schedule status for post ${post.id}`);
          }
        } catch (postError) {
          console.error(`Error posting to Bluesky for handle ${account.handle}:`, postError);
        }
      } catch (innerLoopError) {
        console.error(`Inner loop error processing post ${post?.id}:`, innerLoopError);
      }
    }


    // --- Step 4: Update response/logs ---
    const ukResponseTime = utcToZonedTime(now, 'Europe/London');
    const ukTimeWindowResponse = {
      before: format(utcToZonedTime(addMinutes(now, -1), 'Europe/London'), 'HH:mm:ss'),
      after: format(utcToZonedTime(addMinutes(now, 1), 'Europe/London'), 'HH:mm:ss')
    };


    return new Response(JSON.stringify({
      message: 'Bluesky poster function completed',
      timestamp: now.toISOString(),
      dateQueried: formattedDate,
      potentialCandidatesFound: candidatePosts?.length || 0,
      postsFoundMatchingTimeWindow: postsToProcess.length,
      postsProcessed: processedCount,
      currentTime: {
        utc: format(now, 'HH:mm:ss zzz'),
        uk: format(ukResponseTime, 'HH:mm:ss zzz')
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fatal error in bluesky poster function:', error);
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