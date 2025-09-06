// src/components/SentPostModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ArrowRight, ArrowLeft, Trash2, Clock, Send, PlusCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { format, parseISO, addWeeks, addDays, isWithinInterval, differenceInDays, startOfWeek, endOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface SentPost {
  id: string;
  user_email: string;
  user_id: string;
  social_channel: string;
  user_handle: string;
  user_display_name: string;
  full_content: string;
  social_post_id: string | null;
  posted_at: string; // Use posted_at for sent posts
  avatar_url: string | null;
  error_message: string | null;
  post_status_detail: string | null;
}

interface SentPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditSentPost: (content: string, socialChannel: string, userHandle: string) => void;
  // No onContinueDraft as sent posts are typically not "continued" for editing in the same way
}

export function SentPostModal({ isOpen, onClose, onEditSentPost }: SentPostModalProps) {
  const [sentPosts, setSentPosts] = useState<{[key: string]: SentPost[]}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalSentCount, setTotalSentCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('All'); // NEW: State for channel filter
  const postsPerPage = 25; // Requirement: 25 posts per page
  const navigate = useNavigate();

  const fetchSentPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email || !session?.user?.id) {
        console.warn('No user session found to fetch sent posts.');
        setSentPosts({});
        setTotalSentCount(0);
        return;
      }

      const startIndex = (currentPage - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage - 1;

      // Query 1: Fetch sent posts with pagination and search
      let query = supabase
        .from('user_post_schedule')
        .select('*', { count: 'exact' }) // Request exact count for pagination
        .eq('user_email', session.user.email)
        .eq('sent_post', true) // Filter for sent posts
        //.order('posted_at', { ascending: false }) // Order by posted_at
        .order('posted_at', { ascending: false, nullsFirst: false })
        .order('content_date', { ascending: false })
        .order('content_time', { ascending: false })
        .range(startIndex, endIndex);

      // Apply search filter if query is not empty
      if (searchQuery.trim()) {
        query = query.or(`full_content.ilike.%${searchQuery.trim()}%,user_handle.ilike.%${searchQuery.trim()}%`);
      }

      // NEW: Apply social media channel filter
      if (selectedChannelFilter !== 'All') {
        query = query.eq('social_channel', selectedChannelFilter);
      }

      const { data: postsData, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setTotalSentCount(count || 0);

      if (!postsData || postsData.length === 0) {
        setSentPosts({});
        setError(null);
        setIsLoading(false);
        return;
      }

      // Extract unique user_id and social_channel pairs from posts
      const uniqueUserIds = Array.from(new Set(postsData.map(p => p.user_id)));
      const uniqueSocialChannels = Array.from(new Set(postsData.map(p => p.social_channel)));

      let socialChannelsData: any[] = [];
      if (uniqueUserIds.length > 0 && uniqueSocialChannels.length > 0) {
        // Query 2: Fetch social_channels data for the relevant accounts
        const { data: fetchedChannels, error: channelsError } = await supabase
          .from('social_channels')
          .select('user_id, social_channel, avatar_url, display_name, handle')
          .eq('email', session.user.email)
          .in('user_id', uniqueUserIds)
          .in('social_channel', uniqueSocialChannels);

        if (channelsError) {
          console.error('Error fetching social channels for sent posts:', channelsError);
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

      // Enrich sent posts with social channel details
      const enrichedPosts = postsData.map(post => {
        const lookupKey = `${post.user_id}_${post.social_channel}`;
        const channelInfo = socialChannelLookup.get(lookupKey);
        return {
          ...post,
          avatar_url: channelInfo?.avatar_url || post.avatar_url,
          user_display_name: channelInfo?.display_name || post.user_display_name,
          user_handle: channelInfo?.handle || post.user_handle
        };
      });

      // Group enriched posts by social channel
      const groupedPosts: { [key: string]: SentPost[] } = enrichedPosts.reduce((acc, post) => {
        const channel = post.social_channel;
        if (!acc[channel]) {
          acc[channel] = [];
        }
        acc[channel].push(post);
        return acc;
      }, {});

      setSentPosts(groupedPosts);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching sent posts:', err);
      setError('Failed to load sent posts');
      setSentPosts({});
      setTotalSentCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, postsPerPage, searchQuery, selectedChannelFilter]); // Dependencies for useCallback

  useEffect(() => {
    if (isOpen) {
      fetchSentPosts();
    }
  }, [isOpen, fetchSentPosts]); // Re-fetch when modal opens or fetchSentPosts changes

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= Math.ceil(totalSentCount / postsPerPage)) {
      setCurrentPage(newPage);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

    // NEW: Handle channel filter change
  const handleChannelFilterChange = (channel: string) => {
    setSelectedChannelFilter(channel);
    setCurrentPage(1); // Reset to first page on new filter
  };

  
  const handleDeleteSentPost = async (postId: string) => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      // This performs a hard delete from the database
      const { error } = await supabase
        .from('user_post_schedule')
        .delete()
        .eq('id', postId)
        .eq('user_email', session.user.email);

      if (error) throw error;

      // Re-fetch posts to update the list after deletion
      await fetchSentPosts();
    } catch (err) {
      console.error('Error deleting sent post:', err);
      setError('Failed to delete sent post');
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

  const handleViewPost = (post: SentPost) => {
    // For sent posts, you might navigate to the actual post on the social media platform
    // or show a read-only view of the post content.
    // For now, we'll just close the modal.
    console.log('Viewing sent post:', post.id, post.full_content);
    // Example: window.open(`https://${post.social_channel}.com/posts/${post.social_post_id}`, '_blank');
    onClose();
  };

 const handleEditSentPost = (content: string, socialChannel: string, userHandle: string) => {
    onEditSentPost(content, socialChannel, userHandle);
    onClose();
  };


  if (!isOpen) return null;

  const totalPages = Math.ceil(totalSentCount / postsPerPage);

  return (
    <>
      {/* Overlay for the rest of the screen */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* The actual side panel content */}
      <div
        className={`
          fixed top-0 right-0 h-screen w-80 bg-white shadow-lg border-r border-gray-200 z-50
          transform transition-transform duration-1000 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 items-center bg-blue-50 rounded-full">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Sent Posts ({totalSentCount})</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* NEW: Social Media Channel Filter Buttons */}
          <div className="flex justify-between mb-4 space-x-2">
            <button
              onClick={() => handleChannelFilterChange('All')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                selectedChannelFilter === 'All'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleChannelFilterChange('Bluesky')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                selectedChannelFilter === 'Bluesky'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bluesky
            </button>
            <button
              onClick={() => handleChannelFilterChange('LinkedIn')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                selectedChannelFilter === 'LinkedIn'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              LinkedIn
            </button>
            <button
              onClick={() => handleChannelFilterChange('Twitter')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                selectedChannelFilter === 'Twitter'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Twitter
            </button>
          </div>


          {/*-------------- End Social Media Sort Buttons -----------------------*/}

          {isLoading ? (
            <div className="flex items-center justify-center flex-grow">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>
          ) : (
            <div className="space-y-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {Object.entries(sentPosts).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
                    <Send className="w-12 h-12 font-light text-blue-500" />
                  </div>
                  <p className="text-gray-600 mb-3 mt-4">No sent posts found 😔</p>
                  <p className="text-gray-400 mb-4 text-sm">Start scheduling and sending posts!</p>
                  <button
                    onClick={() => {
                      navigate('/dashboard/compose'); // Example: navigate to compose page
                      onClose();
                    }}
                    className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    <span>Create New Post</span>
                  </button>
                </div>
              ) : (
                Object.entries(sentPosts).map(([channel, posts]) => (
                  <div key={channel} className="space-y-3">
                    <div className="flex items-center space-x-2 px-2 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-white">
                      <img src={getSocialLogo(channel)} alt={channel} className="w-4 h-4" />
                      <h3 className="text-sm font-medium text-blue-700">{channel}</h3>
                    </div>
                    
                    {posts.map(post => (
                      <div key={post.id} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all">
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
                              {/*<span>{formatDate(post.posted_at)}</span>*/}

                               <span>
                                {post.posted_at
                                    ? `${new Date(post.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${new Date(post.posted_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                                    
                                    : `${new Date(`${post.content_date}T${post.content_time}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${new Date(`${post.content_date}T${post.content_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
      </span>
                              
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-2 p-2 bg-gray-50 rounded-md">
                          <p className="text-xs text-gray-600 whitespace-pre-wrap">
                            {truncateText(post.full_content)}
                          </p>
                        </div>
                        
                        <div className="flex justify-end mt-3 space-x-2">
                          <button
                            //onClick={() => handleViewPost(post)}
                            onClick={() => handleEditSentPost(post.full_content, post.social_channel, post.user_handle)}
                            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            <span>Re-Write ✍️</span>
                          </button>

                          {/*
                          <button
                            onClick={() => handleDeleteSentPost(post.id)}
                            className="px-3 py-1.5 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors flex items-center"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            <span>Delete</span>
                          </button>
                          */}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
