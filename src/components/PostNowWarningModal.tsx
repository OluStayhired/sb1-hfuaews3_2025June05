import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BskyAgent } from '@atproto/api';

interface SocialAccount {
    id: string;
    social_channel: string;
    handle: string;
    email: string;
    access_token?: string | null;
    refresh_token?: string | null;
    app_password?: string | null;
    activated: boolean;
    error_message?: string | null;
}

// PostData interface including user_id, schedule_status, sent_post
interface PostData {
    id: string;
    user_id: string;
    campaign_name: string;
    full_content: string; // Using full_content as per DB/posting needs
    social_channel: string;
    user_handle: string;
    user_display_name: string | null;
    avatar_url?: string | null;
    content_date: string;
    content_time: string;
    timezone?: string | null;
    schedule_status: boolean;
    sent_post: boolean;
    posted_at?: string | null;
    social_post_id?: string | null;
    error_message?: string | null;
}


interface PostNowWarningModalProps {
  isOpen: boolean;
  onClose: (postedSuccessfully?: boolean) => void;
  message: string; // Confirmation message
  postContent?: string; // Post content preview (optional)
  userHandle?: string; // User handle preview (optional)
  postId: string; // ID of the post to act on
  socialChannel: string; // Channel to post to
}

export function PostNowWarningModal({ 
  isOpen, 
  onClose, 
  message,
  postContent,
  userHandle,
  postId,
  socialChannel,
}: PostNowWarningModalProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const VITE_LINKEDIN_POSTER_URL = import.meta.env.VITE_LINKEDIN_POSTER_URL;
  const VITE_TWITTER_POSTER_URL = import.meta.env.VITE_TWITTER_POSTER_URL;

// Helper to fetch post details
const fetchPostDetails = useCallback(async (id: string): Promise<PostData | null> => {
    try {
        const { data, error } = await supabase
            .from('user_post_schedule')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching post details:', error);
            return null;
        }
        return data as PostData;
    } catch (err) {
        console.error('Unexpected error fetching post details:', err);
        return null;
    }
}, []);

// Helper to update post status in DB
const updatePostStatus = useCallback(async (id: string, status: {
    schedule_status: boolean;
    sent_post: boolean;
    posted_at?: string | null;
    social_post_id?: string | null;
    error_message?: string | null;
}) => {
    try {
        console.log(`Updating DB status for post ID: ${id} with status:`, status);
        const { error: updateError } = await supabase
            .from('user_post_schedule')
            .update(status)
            .eq('id', id);

        if (updateError) {
            console.error(`Error updating post status in database for post ID ${id}:`, updateError);
        } else {
            console.log(`Successfully updated post status in database for post ID ${id}`);
        }
    } catch (err) {
         console.error(`Unexpected error during DB update for post ID ${id}:`, err);
    }
}, []);

// Posting to LinkedIn via Edge Function
const handlePostOnLinkedIn = useCallback(async (id: string): Promise<boolean> => {
    console.log('handlePostOnLinkedIn: Triggering Edge Function for postId:', id);
    setIsPosting(true);
    setError(null);

    if (!VITE_LINKEDIN_POSTER_URL) {
        console.error('handlePostOnLinkedIn: LinkedIn poster Edge Function URL not configured.');
        setError('LinkedIn posting service is not configured.');
        setIsPosting(false);
        return false;
    }

    try {
        const response = await fetch(VITE_LINKEDIN_POSTER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: id }),
        });

        console.log('handlePostOnLinkedIn: Edge Function response status:', response.status);
        const responseBody = await response.json().catch(() => null);
        console.log('handlePostOnLinkedIn: Edge Function response body:', responseBody);

        if (!response.ok) {
            console.error('handlePostOnLinkedIn: Edge Function reported an error:', response.status, responseBody || response.statusText);
            const errorMessage = responseBody?.error || responseBody?.message || response.statusText || 'Failed to post to LinkedIn.';
            setError(`Posting failed: ${errorMessage}`);
            return false;
        }

        console.log('handlePostOnLinkedIn: Edge Function indicates success/handled.');
        return true;

    } catch (err) {
        console.error('handlePostOnLinkedIn: Network or unexpected error calling Edge Function:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to posting service.');
        return false;
    } finally {
        setIsPosting(false);
    }
}, [VITE_LINKEDIN_POSTER_URL]);

// Posting to Twitter via Edge Function
const handlePostOnTwitter = useCallback(async (id: string): Promise<boolean> => {
    console.log('handlePostOnTwitter: Triggering Edge Function for postId:', id);
    setIsPosting(true);
    setError(null);

    if (!VITE_TWITTER_POSTER_URL) {
        console.error('handlePostOnTwitter: Twitter poster Edge Function URL not configured.');
        setError('Twitter posting service is not configured.');
        setIsPosting(false);
        return false;
    }

    try {
        const response = await fetch(VITE_TWITTER_POSTER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: id }),
        });

        console.log('handlePostOnTwitter: Edge Function response status:', response.status);
        let responseBody = null;
        try {
            responseBody = await response.json();
            console.log('handlePostOnTwitter: Edge Function response body:', responseBody);
        } catch (jsonParseError) {
            console.error('handlePostOnTwitter: Failed to parse Edge Function response body as JSON:', jsonParseError);
            setError('Received unexpected response from posting service.');
            return false;
        }

        if (!response.ok) {
            console.error('handlePostOnTwitter: Edge Function reported an error:', response.status, responseBody || response.statusText);
            const errorMessage = responseBody?.error || responseBody?.message || response.statusText || 'Failed to post to Twitter.';
            setError(`Posting failed: ${errorMessage}`);
            return false;
        }

        console.log('handlePostOnTwitter: Edge Function indicates success/handled.');
        return true;

    } catch (err) {
        console.error('handlePostOnTwitter: Network or unexpected error calling Edge Function:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to posting service.');
        return false;
    } finally {
        setIsPosting(false);
    }
}, [VITE_TWITTER_POSTER_URL]);

// Posting to Bluesky directly
const handlePostOnBluesky = useCallback(async (id: string): Promise<boolean> => {
    console.log('handlePostOnBluesky: Attempting frontend post for postId:', id);
    setIsPosting(true);
    setError(null);

    const post = await fetchPostDetails(id);
    if (!post) {
        setError('Could not fetch post details for Bluesky.');
        setIsPosting(false);
        return false;
    }

    if (!post.full_content || !post.user_handle || !post.user_id) { // Ensure user_id is available
        setError("Missing post content, user handle, or user ID for Bluesky.");
        setIsPosting(false);
        return false;
    }

    try {
         const { data: account, error: accountError } = await supabase
            .from('social_channels')
            .select('handle, app_password')
            .eq('user_id', post.user_id) // Use user_id from post data
            .eq('social_channel', 'Bluesky')
            .eq('handle', post.user_handle) // Match by handle
            .single();

          if (accountError || !account || !account.app_password) {
             console.error('handlePostOnBluesky: Error fetching Bluesky account or missing app password:', accountError);
            setError('Could not find connected Bluesky account or missing password.');
            return false;
          }

        const agent = new BskyAgent({ service: 'https://bsky.social' });
        await agent.login({
            identifier: account.handle,
            password: account.app_password,
        });

        console.log('handlePostOnBluesky: Posting to Bluesky...');
        const postResult = await agent.post({ text: post.full_content });
        console.log('handlePostOnBluesky: Bluesky API post result:', postResult);

        await updatePostStatus(id, {
            schedule_status: false,
            sent_post: true,
            posted_at: new Date().toISOString(),
            social_post_id: postResult.uri,
            error_message: null,
        });

        return true;

    } catch (err) {
        console.error('handlePostOnBluesky: Error during Bluesky post API call:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to post to Bluesky';
        setError(errorMessage);

         await updatePostStatus(id, {
             schedule_status: false,
             sent_post: false,
             posted_at: null,
             social_post_id: null,
             error_message: `Bluesky post failed: ${errorMessage}`,
         });

        return false;
    } finally {
        setIsPosting(false);
    }
}, [fetchPostDetails, updatePostStatus]);

// Main dispatcher function triggered by the button
const handlePostNow = useCallback(async () => {
     if (!postId || !socialChannel) {
         console.error("handlePostNow: postId or socialChannel prop is missing.");
         setError("Internal error: Missing post information.");
         return;
     }

    setError(null);
    setSuccess(false);

    let postSuccessful = false;

    try {
        switch (socialChannel) {
            case 'LinkedIn':
                console.log('handlePostNow: Dispatching to LinkedIn handler');
                postSuccessful = await handlePostOnLinkedIn(postId);
                break;
            case 'Twitter':
                console.log('handlePostNow: Dispatching to Twitter handler');
                postSuccessful = await handlePostOnTwitter(postId);
                break;
            case 'Bluesky':
                console.log('handlePostNow: Dispatching to Bluesky handler');
                postSuccessful = await handlePostOnBluesky(postId);
                break;
            default:
                console.error('handlePostNow: Unknown social channel:', socialChannel);
                setError(`Unknown social channel: ${socialChannel}`);
                break;
        }

        if (postSuccessful) {
            console.log('handlePostNow: Posting handler reported success.');
            setSuccess(true);
            setTimeout(() => {
                onClose(true);
            }, 2000);
        } else {
            console.log('handlePostNow: Posting handler reported failure.');
            setSuccess(false);
            onClose(false);
        }

    } catch (err) {
        console.error('handlePostNow: Unhandled error during dispatch:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred during posting.');
        setSuccess(false);
        onClose(false);
    }
}, [postId, socialChannel, handlePostOnLinkedIn, handlePostOnTwitter, handlePostOnBluesky, onClose]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start mb-6">
          <div className={`flex-shrink-0 rounded-full p-2 mr-3 ${success ? 'bg-green-50' : error ? 'bg-red-50' : 'bg-green-50'}`}>
            <Send className={`w-6 h-6 ${success ? 'text-green-500' : error ? 'text-red-500' : 'text-green-500'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Post
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              This post will be sent to your {socialChannel} account.
            </p>
          </div>
          <button
            onClick={() => onClose(false)}
            className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 transition-colors"
            disabled={isPosting}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="mb-6 text-center">
            <div className="mx-auto bg-green-100 rounded-full p-3 w-12 h-12 flex items-center justify-center mb-4">
              <Send className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-green-600 font-medium">Post sent successfully!</p>
            <p className="text-sm text-gray-500 mt-2">Your content has been posted to {socialChannel}.</p>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-gray-600">
              {message}
            </p>
            {postContent && (
              <p className="mt-2 text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-md">
                "{postContent.length > 100 ? postContent.substring(0, 100) + '...' : postContent}"
              </p>
            )}
            {error && (
              <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded-md">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium"
            disabled={isPosting}
          >
            Cancel
          </button>
          {!success && (
            <button
              onClick={handlePostNow}
              disabled={isPosting}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors flex items-center space-x-2"
            >
              {isPosting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Now</span>
                </>
              )}
            </button>
          )}
        </div>
        
      </div>
    </div>
  );
}