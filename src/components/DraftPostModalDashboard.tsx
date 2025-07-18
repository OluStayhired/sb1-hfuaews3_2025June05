// src/components/DraftPostModalDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ArrowRight, ArrowLeft, Trash2, Clock, FileEdit, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { format } from 'date-fns';
import { useNavigate, Navigate } from 'react-router-dom';

interface DraftPost {
  id: string;
  user_email: string;
  user_id: string;
  social_channel: string;
  user_handle: string;
  user_display_name: string;
  full_content: string;
  social_post_id: string | null;
  created_at: string;
  avatar_url: string | null;
}

interface DraftPostModalDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueDraft: (content: string, socialChannel: string, userHandle: string) => void; // Modified line
}

export function DraftPostModalDashboard({ isOpen, onClose, onContinueDraft }: DraftPostModalDashboardProps) {
  const [draftPosts, setDraftPosts] = useState<{[key: string]: DraftPost[]}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalDraftCount, setTotalDraftCount] = useState(0); // New state variable
  const navigate = useNavigate();

  {/*
  useEffect(() => {
    const fetchDraftPosts = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        const { data, error } = await supabase
          .from('user_post_draft')
          .select('*')
          .eq('user_email', session.user.email)
          .eq('draft_status', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Group drafts by social channel
        const groupedDrafts: {[key: string]: DraftPost[]} = data.reduce((acc, post) => {
          const channel = post.social_channel;
          if (!acc[channel]) {
            acc[channel] = [];
          }
          acc[channel].push(post);
          return acc;
        }, {});

        setDraftPosts(groupedDrafts);

        // Calculate total draft count
        let count = 0;
        for (const channel in groupedDrafts) {
          count += groupedDrafts[channel].length;
        }
        setTotalDraftCount(count);
        
      } catch (err) {
        console.error('Error fetching draft posts:', err);
        setError('Failed to load draft posts');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchDraftPosts();
    }
  }, [isOpen]);
*/}

  {/* 
   const fetchDraftPosts = useCallback(async () => {
        try {
            setIsLoading(true); // Set loading state when fetching
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) {
                console.warn('No user session found to fetch drafts.');
                setDraftPosts({}); // Clear drafts if no session
                setTotalDraftCount(0);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('user_post_draft')
                .select('*')
                .eq('user_email', session.user.email)
                .eq('draft_status', true)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const groupedDrafts: {[key: string]: DraftPost[]} = data.reduce((acc, post) => {
                const channel = post.social_channel;
                if (!acc[channel]) {
                    acc[channel] = [];
                }
                acc[channel].push(post);
                return acc;
            }, {});

            setDraftPosts(groupedDrafts);

            let count = 0;
            for (const channel in groupedDrafts) {
                count += groupedDrafts[channel].length;
            }
            setTotalDraftCount(count);
            setError(null); // Clear any previous errors on successful fetch
        } catch (err) {
            console.error('Error fetching draft posts:', err);
            setError('Failed to load draft posts');
            setDraftPosts({}); // Clear drafts on error
            setTotalDraftCount(0);
        } finally {
            setIsLoading(false); // Reset loading state regardless of success or failure
        }
    }, []);
*/}

  const fetchDraftPosts = useCallback(async () => {
        try {
            setIsLoading(true); // Set loading state when fetching
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email || !session?.user?.id) {
                console.warn('No user session found to fetch drafts.');
                setDraftPosts({}); // Clear drafts if no session
                setTotalDraftCount(0);
                return;
            }

            // Query 1: Fetch draft posts
            const { data: draftsData, error: fetchError } = await supabase
                .from('user_post_draft')
                .select('*') // Select all columns from user_post_draft
                .eq('user_email', session.user.email)
                .eq('draft_status', true)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            if (!draftsData || draftsData.length === 0) {
                setDraftPosts({});
                setTotalDraftCount(0);
                setError(null);
                setIsLoading(false);
                return;
            }

            // Extract unique user_id and social_channel pairs from drafts
            const uniqueUserIds = Array.from(new Set(draftsData.map(d => d.user_id)));
            const uniqueSocialChannels = Array.from(new Set(draftsData.map(d => d.social_channel)));

            let socialChannelsData: any[] = [];
            if (uniqueUserIds.length > 0 && uniqueSocialChannels.length > 0) {
                // Query 2: Fetch social_channels data for the relevant accounts
                const { data: fetchedChannels, error: channelsError } = await supabase
                    .from('social_channels')
                    .select('user_id, social_channel, avatar_url, display_name, handle') // Select necessary fields
                    .eq('email', session.user.email) // Filter by user's email for security
                    .in('user_id', uniqueUserIds)
                    .in('social_channel', uniqueSocialChannels);

                if (channelsError) {
                    console.error('Error fetching social channels:', channelsError);
                    // Log the error, but proceed, meaning some drafts might not get avatar/display_name
                }
                socialChannelsData = fetchedChannels || [];
            }

            // Create a lookup map for social channel details
            const socialChannelLookup = new Map<string, { avatar_url: string | null; display_name: string | null; handle: string | null }>();
            socialChannelsData.forEach(channel => {
                socialChannelLookup.set(`${channel.user_id}_${channel.social_channel}`, {
                    avatar_url: channel.avatar_url,
                    display_name: channel.display_name,
                    handle: channel.handle
                });
            });

            // Enrich draft posts with social channel details
            const enrichedDrafts = draftsData.map(draft => {
                const lookupKey = `${draft.user_id}_${draft.social_channel}`;
                const channelInfo = socialChannelLookup.get(lookupKey);
                return {
                    ...draft,
                    // Prioritize social_channels data if available, otherwise use draft's own data
                    avatar_url: channelInfo?.avatar_url || draft.avatar_url,
                    user_display_name: channelInfo?.display_name || draft.user_display_name,
                    user_handle: channelInfo?.handle || draft.user_handle // Ensure handle is also updated if needed
                };
            });

            // Group enriched drafts by social channel
            const groupedDrafts: { [key: string]: DraftPost[] } = enrichedDrafts.reduce((acc, post) => {
                const channel = post.social_channel;
                if (!acc[channel]) {
                    acc[channel] = [];
                }
                acc[channel].push(post);
                return acc;
            }, {});

            setDraftPosts(groupedDrafts);

            let count = 0;
            for (const channel in groupedDrafts) {
                count += groupedDrafts[channel].length;
            }
            setTotalDraftCount(count);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching draft posts:', err);
            setError('Failed to load draft posts');
            setDraftPosts({});
            setTotalDraftCount(0);
        } finally {
            setIsLoading(false);
        }
    }, []);
  
      useEffect(() => {
        // Assuming `isOpen` is a prop or state that determines when the draft section is visible/active
        // If it's a state, ensure it's defined: const [isOpen, setIsOpen] = useState(false);
        if (isOpen) {
            fetchDraftPosts();
          }
        }, [isOpen, fetchDraftPosts]);

    const handleDeleteDraft = async (postId: string) => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      const { error } = await supabase
        .from('user_post_draft')
        .update({ draft_status: false })
        .eq('id', postId)
        .eq('user_email', session.user.email);

      if (error) throw error;

      // Update local state
      setDraftPosts(prev => {
        const updatedDrafts = { ...prev };
        for (const channel in updatedDrafts) {
          updatedDrafts[channel] = updatedDrafts[channel].filter(post => post.id !== postId);
        }
        return updatedDrafts;
      });
      await fetchDraftPosts();
    } catch (err) {
      console.error('Error deleting draft post:', err);
      setError('Failed to delete draft post');
    } finally {
      setIsLoading(false);
    }
  };


  const getSocialLogo = (channel: string) => {
    switch (channel) {
      case 'Bluesky':
        return BlueskyLogo;
      case 'LinkedIn':
        return LinkedInLogo;
      case 'Twitter':
        return XLogo;
      default:
        return BlueskyLogo;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

    const handleContinueDraft = (content: string, socialChannel: string, userHandle: string) => {
    onContinueDraft(content, socialChannel, userHandle);
    onClose();
  };

     const handleDraftPost = () => {
    navigate('/dashboard/compose');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-screen w-80 bg-white shadow-lg border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 items-center bg-yellow-50 rounded-full">
                <FileEdit className="h-5 w-5 text-yellow-500" />
            </div> 
            <h2 className="text-lg font-semibold text-gray-900">Saved Drafts ({totalDraftCount})</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center flex-grow">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>
        ) : (
          <div className="space-y-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {Object.entries(draftPosts).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
                <FileEdit className="w-12 h-12 font-light text-blue-500" />
                
                </div>
                  <p className="text-gray-600 mb-3 mt-4">You have no draft posts 😔 </p>
                  <p className="text-gray-400 mb-4 text-sm"> Start writing posts and saving them here </p>

                <button
                    onClick={handleDraftPost}
                    className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    <span>Create Draft</span>
                  </button>
              </div>
            ) : (
              Object.entries(draftPosts).map(([channel, posts]) => (
                <div key={channel} className="space-y-3">
                  {/*<div className="flex items-center space-x-2 px-2 py-1 bg-blue-50 rounded-lg">*/}
                   <div className="flex items-center space-x-2 px-2 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-white">
                    <img src={getSocialLogo(channel)} alt={channel} className="w-4 h-4" />
                    <h3 className="text-sm font-medium text-gray-700">{channel}</h3>
                  </div>
                  
                  {posts.map(post => (
                    <div key={post.id} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                      <div className="flex items-start space-x-3 mb-2">
                        <div className="relative flex-shrink-0">
                          <img
                            src={post.avatar_url || `https://ui-avatars.com/api/?name=${post.user_handle}`}
                            alt={post.user_handle}
                            className="w-10 h-10 rounded-full border border-gray-200"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                            <img
                              src={getSocialLogo(post.social_channel)}
                              alt={post.social_channel}
                              className="w-3.5 h-3.5"
                            />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {post.user_display_name || post.user_handle}
                          </p>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            <span>{formatDate(post.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 p-2 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">
                          {truncateText(post.full_content)}
                        </p>
                      </div>

                     
                      <div className="flex justify-end mt-3 space-x-2">
                       {/*
                        <button 
                          onClick={() => handleContinueDraft(post.full_content, post.social_channel, post.user_handle)}
                          className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center">
                          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                          <span>Continue</span>
                        </button>
                        */}

                        <button
                            onClick={() => {
                            onContinueDraft(post.full_content, post.social_channel, post.user_handle);
                            onClose(); // Close the modal after continuing the draft
                            }}
                            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            <span>Edit</span>
                       </button>
                      
                        <button 
                          onClick={() => handleDeleteDraft(post.id)}
                          className="px-3 py-1.5 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors flex items-center">
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>Delete</span>
                        </button>
                      </div>

                      
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

         {Object.entries(draftPosts).length > 0 && (
        <div className="pt-4 border-t border-gray-200 mt-4">
            <button
              onClick={handleDraftPost}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Create Drafts</span>
            </button>
          </div>
          )}
        
      </div>
    </div>
  );
}

export default DraftPostModalDashboard;
