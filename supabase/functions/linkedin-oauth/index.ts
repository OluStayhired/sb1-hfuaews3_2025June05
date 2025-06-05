// supabase/functions/linkedin-oauth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.2';

const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID');
const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET');
const REDIRECT_URI = Deno.env.get('LINKEDIN_REDIRECT_URI');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});


// Verify state and retrieve user_id from oauth_states table

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

        console.log('Edge Function: State verified successfully. Retrieved user ID:', data.user_id, 'and Frontend Origin:', data.frontend_origin);
        // Return an object containing both
        return { userId: data.user_id, frontendOrigin: data.frontend_origin, userEmail: data.email, userTimezone: data.user_timezone };

    } catch (error) {
        console.error('Edge Function: Error in state verification process:', error);
        return null;
    }
}

// Fetch LinkedIn profile picture
async function getLinkedInProfilePicture(accessToken: string): Promise<string | null> {
  const profileApiUrl = 'https://api.linkedin.com/v2/me';
  const projection = '(id,profilePicture(displayImage~:playableStreams))';
  const apiUrlWithProjection = `${profileApiUrl}?projection=${projection}`;

    console.log('Edge Function: Fetching LinkedIn profile picture...');

  try {
    const response = await fetch(apiUrlWithProjection, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202405',
        //'X-Restli-Protocol-Version': '2.0'
      }
    });

    console.log('Edge Function: Profile picture response status:', response.status);
    const responseBody = await response.json();
    console.log('Edge Function: Profile picture response body:', responseBody);


    if (!response.ok) {
      console.error('Edge Function: LinkedIn API error fetching profile picture:', response.status, responseBody);
      return null;
    }

    let avatarUrl: string | null = null;
    const displayImage = responseBody?.profilePicture?.['displayImage~'];

    if (displayImage?.elements && Array.isArray(displayImage.elements)) {
        const imageElement = displayImage.elements.find((el: any) => el.data?.['com.linkedin.digitalmedia.asset.Image']);

        if (imageElement?.identifiers && Array.isArray(imageElement.identifiers)) {
             const fullSizeIdentifier = imageElement.identifiers.find((id: any) => id.identifierType === 'FULL');
             avatarUrl = fullSizeIdentifier?.identifier || imageElement.identifiers[0]?.identifier || null;
        }
    }

    console.log('Edge Function: Extracted avatar URL:', avatarUrl);
    return avatarUrl;
  } catch (error) {
    console.error('Edge Function: Failed to fetch LinkedIn profile picture:', error);
    return null;
  }
}


// Main Edge Function handler
serve(async (req) => {
  const { url, method } = req;
  const { searchParams } = new URL(url);

  if (method === 'GET' && searchParams.has('code') && searchParams.has('state')) {
    const code = searchParams.get('code')!;
    const state = searchParams.get('state')!;

    console.log('Edge Function: Handling LinkedIn OAuth callback...');
    console.log('Edge Function: Received State:', state);
    console.log('Edge Function: Received Code (partial):', code ? code.substring(0, 10) + '...' : 'Missing');

    // Extract context from state BEFORE verifying the whole state string
    const stateParts = state.split('_');
    const contextIdentifier = stateParts.length > 1 ? stateParts[1] : null;

    const stateData = await verifyAndRetrieveState(state);
    if (!stateData) {
      console.error('Edge Function: State verification failed, cannot proceed.');
      // Redirect using the Edge Function's origin as a fallback since frontendOrigin is unknown
      return Response.redirect(`${new URL(url).origin}/error?message=oauth_state_mismatch`, 302);
    }
    
    const userId = stateData.userId;
    const frontendOrigin = stateData.frontendOrigin;
    const userEmail = stateData.userEmail;
    const userTimezone = stateData.userTimezone;
    
    console.log('Edge Function: State verified. User ID:', userId, 'Frontend Origin:', frontendOrigin);

    if (!userId) {
      console.error('Edge Function: State verification failed or could not retrieve user ID.');
      return Response.redirect(`${new URL(url).origin}/dashboard/accounts?error=oauth_state_mismatch`, 302);
    }

    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !REDIRECT_URI) {
        console.error('Edge Function: Missing LinkedIn environment variables.');
         return Response.redirect(`${new URL(url).origin}/dashboard/accounts?error=linkedin_config_missing`, 302);
    }

    try {
        console.log('Edge Function: Exchanging code for LinkedIn token...');
        const tokenExchangeUrl = 'https://www.linkedin.com/oauth/v2/accessToken';

      const tokenResponse = await fetch(tokenExchangeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
        }),
      });

      const tokenData = await tokenResponse.json();

      console.log('Edge Function: Token exchange status:', tokenResponse.status);
      console.log('Edge Function: Token exchange body:', tokenData);

      if (!tokenResponse.ok || tokenData.error) {
        console.error('Edge Function: Error exchanging code for token:', tokenResponse.status, tokenData);
        return Response.redirect(`${new URL(url).origin}/dashboard/accounts?error=oauth_token_exchange_failed&details=${tokenData.error?.code || tokenResponse.status}`, 302);
      }

      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in;
      const refreshToken = tokenData.refresh_token;

      console.log('Edge Function: Access Token obtained (partial):', accessToken ? accessToken.substring(0, 10) + '...' : 'Missing');

      if (!accessToken) {
          console.error('Edge Function: Access token is missing from response.');
          return Response.redirect(`${new URL(url).origin}/dashboard/accounts?error=linkedin_access_token_missing`, 302);
      }

    //const profileApiUrl = 'https://api.linkedin.com/v2/me';
    const profileApiUrl = 'https://api.linkedin.com/v2/userinfo';
     console.log('Edge Function: Fetching LinkedIn user profile...');

     const profileResponse = await fetch(profileApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
         //'LinkedIn-Version': '202405',
         //'X-Restli-Protocol-Version': '2.0'
      },
    });

    const profileData = await profileResponse.json();

     console.log('Edge Function: Profile response status:', profileResponse.status);
     console.log('Edge Function: Profile response body:', profileData);

    if (!profileResponse.ok) {
      console.error('Edge Function: Error fetching LinkedIn profile:', profileResponse.status, profileData);
      return Response.redirect(`${frontendOrigin}/dashboard/accounts?error=linkedin_profile_fetch_failed&details=${profileData.status || profileResponse.status}`, 302);
    }

    const linkedinUserId = profileData.sub; 
    const linkedinDisplayName = profileData.name; 
    const linkedinGivenName = profileData.given_name;
    const linkedinFamilyName = profileData.family_name;
    const linkedinPictureUrl = profileData.picture; 
    const linkedinEmail = profileData.email;
    const linkedinEmailVerified = profileData.email_verified;     

    // converted to be inserted into social_channels table
    const channelUserId = linkedinUserId; 
    const handle = linkedinUserId; 
    const displayName = linkedinDisplayName || `${linkedinGivenName || ''} ${linkedinFamilyName || ''}`.trim();
    const avatarUrl = linkedinPictureUrl; // Use the picture URL from userinfo
  

    //const avatarUrl = await getLinkedInProfilePicture(accessToken);

    console.log('Edge Function: Upserting LinkedIn data into social_channels...');

    const { error: dbError } = await supabaseAdmin
      .from('social_channels')
      .upsert({
        user_id: userId,
        social_channel: 'LinkedIn',
        channel_user_id: channelUserId,  
        email: userEmail,
        handle: handle,
        display_name: displayName,
        access_token: accessToken,
        avatar_url: avatarUrl,
        activated: true,
        timezone: userTimezone,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id, channel_user_id',
        ignoreDuplicates: false
      });

      console.log('Edge Function: Upsert operation complete.');

      if (dbError) {
        console.error('Edge Function: Error storing LinkedIn data:', dbError);
        return Response.redirect(`${frontendOrigin}/dashboard/accounts?error=db_save_failed`, 302);

      }

      console.log(`Edge Function: Successfully connected LinkedIn account for user ${userId}`);

    

    // Removed the redirect response to include a condition that searches for a specific state
    // return Response.redirect(`${frontendOrigin}/dashboard/accounts?linkedin_connected=true`, 302);


      // --- NEW: Determine final redirect based on contextIdentifier ---
     if (contextIdentifier === 'welcome_guide') {
         // If from welcome guide, redirect to dashboard with the welcome_guide context
        console.log(`Edge Function: Identified contextIdentifier - ${contextIdentifier}`);
         return Response.redirect(`${frontendOrigin}/dashboard?linkedin_connected=true&context=welcome_guide`, 302);
     } else {
         // Default redirect for other flows
         return Response.redirect(`${frontendOrigin}/dashboard/accounts?linkedin_connected=true`, 302);
     }


  } catch (err) {
    console.error('Edge Function: Unexpected error during callback processing:', err);
     return Response.redirect(`${frontendOrigin}/dashboard/accounts?error=internal_error`, 302);
    //return Response.redirect(`${frontendOrigin}/dashboard/accounts?error=oauth_token_exchange_failed&details=${tokenData.error?.code || tokenResponse.status}`, 302);
  }

  console.warn('Edge Function: Accessed without expected callback parameters.');
  return new Response('Not Found', { status: 404 });
}});