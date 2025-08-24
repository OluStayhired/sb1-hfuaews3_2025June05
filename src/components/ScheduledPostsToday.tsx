// src/components/ScheduledPostsToday.tsx
import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, Clock, Send, FileEdit, Trash2, PlusCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { formatInTimeZone } from 'date-fns-tz';

interface ScheduledPostsTodayProps {
  isOpen: boolean;
  onClose: () => void;
  onEditPost?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
}

interface ScheduledPost {
  id: string;
  full_content: string;
  content_date: string;
  content_time: string;
  user_handle: string;
  user_display_name: string;
  social_channel: string;
  avatar_url: string | null;
  schedule_status: boolean;
  sent_post: boolean;
  draft_status: boolean;
  timezone?: string;
}

export function ScheduledPostsToday({ isOpen, onClose, onEditPost, onDeletePost }: ScheduledPostsTodayProps) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserTimezone = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        const { data, error } = await supabase
          .from('user_preferences')
          .select('timezone')
          .eq('email', session.user.email)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user timezone:', error);
          return;
        }

        if (data?.timezone) {
          setUserTimezone(data.timezone);
        }
      } catch (err) {
        console.error('Error fetching user timezone preference:', err);
      }
    };

    fetchUserTimezone();
  }, []);

 useEffect(() => {
    const fetchTodaysPosts = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        const today = new Date();
        const formattedDate = format(today, 'yyyy-MM-dd');

        const { data, error } = await supabase
          .from('user_post_schedule')
          .select(`
            id,
            full_content,
            content_date,
            content_time,
            user_handle,
            user_display_name,
            social_channel,
            schedule_status,
            sent_post,
            draft_status
          `)
          .eq('user_email', session.user.email)
          .eq('content_date', formattedDate)
          .order('content_time', { ascending: true });

        if (error) throw error;

        // After fetching posts, fetch avatar URLs and timezones
        const postsWithAvatars = await Promise.all(
          (data || []).map(async (post) => {
            const { data: channelData, error: channelError } = await supabase
              .from('social_channels')
              .select('avatar_url, timezone')
              .eq('handle', post.user_handle)
              .eq('social_channel', post.social_channel)
              .single();

            if (channelError) {
              console.error(`Error fetching channel data for ${post.user_handle} on ${post.social_channel}:`, channelError);
              return {
                ...post,
                avatar_url: null, // Provide a default value
                timezone: userTimezone, // Provide a default value
              };
            }

            return {
              ...post,
              avatar_url: channelData?.avatar_url || null,
              timezone: channelData?.timezone || userTimezone,
            };
          })
        );

        setPosts(postsWithAvatars as ScheduledPost[]);
      } catch (err) {
        console.error('Error fetching today\'s posts:', err);
        setError('Failed to load scheduled posts');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchTodaysPosts();
    }
  }, [isOpen, userTimezone]);

   const handleViewSchedule = () => {
    navigate('/dashboard/schedule');
    onClose();
  };



  const formatPostTime = (time: string, timezone: string) => {
    try {
      const today = new Date();
      const datePart = format(today, 'yyyy-MM-dd');
      const combinedDateTime = `${datePart}T${time}`;
      
      return formatInTimeZone(
        parseISO(combinedDateTime), 
        timezone || userTimezone, 
        'h:mm a'
      );
    } catch (error) {
      console.error('Error formatting post time:', error);
      return time.substring(0, 5);
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

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleCreatePost = () => {
    navigate('/dashboard/compose');
    onClose();
  };

   const handleSchedulePost = () => {
    navigate('/dashboard/schedule');
    onClose();
  };

  if (!isOpen) return null;

  return (
    //<div className="fixed top-0 right-0 h-screen w-80 bg-white shadow-lg border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
    <>
    {/* Overlay for the rest of the screen */}
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40"
      onClick={onClose} // Clicking outside closes the panel
    ></div>

   {/* The actual side panel content */}
    <div
      className={`
        fixed top-0 right-0 h-screen w-80 bg-white shadow-lg border-r border-gray-200 z-50
        transform transition-transform duration-1000 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      {/*Ending the part for the changes*/}
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
              <div className="p-2 items-center bg-blue-50 rounded-full">
                  <Calendar className="h-5 w-5 text-blue-500" />
              </div>
            <h2 className="text-lg font-semibold text-gray-900">Today's Posts</h2>
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
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
                  <Calendar className="w-12 h-12 font-light text-blue-500" />
                </div>
                <p className="text-gray-600 mb-3 mt-4">No posts scheduled for today 😔</p>
                <p className="text-gray-400 mb-4 text-sm">Create a post to get started</p>
                <button
                  onClick={handleSchedulePost}
                  className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  <span>Schedule Post</span>
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  You have {posts.length} post{posts.length !== 1 ? 's' : ''} scheduled for today
                </p>
                
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    className={`bg-white p-3 rounded-lg border ${
                      post.sent_post 
                        ? 'border-green-200 bg-green-50' 
                        : post.draft_status 
                          ? 'hover:border hover:border-red-200 bg-red-50'
                          : 'hover:border-blue-200 hover:shadow-sm'
                    } transition-all`}
                  >
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
                          <span>{formatPostTime(post.content_time, post.timezone || userTimezone)}</span>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                          post.sent_post 
                            ? 'bg-green-100 text-green-800' 
                            : post.draft_status 
                              ? 'bg-red-50 text-red-500'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {post.sent_post 
                            ? 'Posted' 
                            : post.draft_status 
                              ? 'Disabled' 
                              : 'Scheduled'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-100">
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">
                        {truncateText(post.full_content)}
                      </p>
                    </div>
                    
                    {!post.sent_post && (
                      <div className="flex justify-end mt-3 space-x-2">
                        {onEditPost && (
                          <button 
                            onClick={() => onEditPost(post.id)}
                            className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center">
                            <FileEdit className="w-3.5 h-3.5 mr-1" />
                            <span>Edit</span>
                          </button>
                        )}
                        {/*
                        {!post.sent_post && (
                          <button 
                            className="px-3 py-1.5 text-xs bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center">
                            <Send className="w-3.5 h-3.5 mr-1" />
                            <span>Post Now</span>
                          </button>
                        )}
                        */}
                        
                        {onDeletePost && (
                          <button 
                            onClick={() => onDeletePost(post.id)}
                            className="px-3 py-1.5 text-xs bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors flex items-center">
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {posts.length > 0 && (
        <div className="pt-4 border-t border-gray-200 mt-4">
            <button
              onClick={handleViewSchedule}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>View Posts</span>
            </button>
          </div>
          )}
        
      </div>
    </div>
    </>
  );
}

export default ScheduledPostsToday;
