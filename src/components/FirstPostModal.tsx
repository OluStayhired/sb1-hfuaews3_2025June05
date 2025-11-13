// src/components/FirstPostModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Loader2, FileEdit, Clock, Lightbulb, ArrowRight, Sparkles, Send, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { TooltipHelp } from '../utils/TooltipHelp';

interface FirstPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (content: string) => void;
  onToggleShowPost?: (postId: string, showPost: boolean) => void;
}

export function FirstPostModal({ isOpen, onClose, onEdit, onToggleShowPost }: FirstPostModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstPost, setFirstPost] = useState<{
    id: string;
    first_post: string;
    theme: string;
    topic: string;
    social_channel: string;
    show_post: boolean;
    created_at: string;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFirstPost = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id && !session?.user?.email) {
          setError("You need to be logged in to view your first post");
          return;
        }

        // Query the first_post_idea table for the current user
        const { data, error: fetchError } = await supabase
          .from('first_post_idea')
          .select('id, first_post, theme, topic, social_channel, show_post, created_at')
          .eq(session.user.id ? 'user_id' : 'email', session.user.id || session.user.email)
          .eq('show_post', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') { // No rows found . . 
            setFirstPost(null);
          } else {
            console.error('Error fetching first post:', fetchError);
            setError('Failed to load your first post');
          }
          return;
        }

        setFirstPost(data);
      } catch (err) {
        console.error('Error in fetchFirstPost:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchFirstPost();
    }
  }, [isOpen]);

  const handleEdit = () => {
    if (firstPost?.first_post && onEdit) {
      onEdit(firstPost.first_post);
    }
    onClose();
  };

  const handleToggleShowPost = async () => {
    if (!firstPost?.id) return;
    
    try {
      const { error } = await supabase
        .from('first_post_idea')
        .update({ show_post: false })
        .eq('id', firstPost.id);
        
      if (error) throw error;
      
      if (onToggleShowPost) {
        onToggleShowPost(firstPost.id, false);
      }
      
      onClose();
    } catch (err) {
      console.error('Error updating show_post status:', err);
      setError('Failed to update post visibility');
    }
  };

  const getSocialLogo = (channel?: string) => {
    switch (channel) {
      case 'Bluesky':
        return BlueskyLogo;
      case 'LinkedIn':
        return LinkedInLogo;
      case 'Twitter':
        return XLogo;
      default:
        return LinkedInLogo; // Default logo
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
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
        fixed top-0 right-0 h-screen w-2/5 bg-white shadow-lg border-r border-gray-200 z-50
        transform transition-transform duration-1000 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      {/*Ending the part for the changes*/}
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 items-center bg-gray-100 rounded-full">
              <Send className="h-5 w-5 text-gray-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Your First Post</h2>
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
        ) : !firstPost ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
              <FileEdit className="w-12 h-12 font-light text-blue-500" />
            </div>
            <p className="text-gray-600 mb-3 mt-4">You didn't create a first post 😔</p>
            <p className="text-gray-400 mb-4 text-sm">Create a post to get started</p>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="bg-white p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="flex items-start space-x-3 mb-3">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-blue-500" />
                  </div>
                  {firstPost.social_channel && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                      <img
                        src={getSocialLogo(firstPost.social_channel)}
                        alt={firstPost.social_channel}
                        className="w-3.5 h-3.5"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    First Post
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    <span>{formatDate(firstPost.created_at)}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600 whitespace-pre-wrap">
                  {firstPost.first_post}
                </p>
              </div>
              
              {/* Theme and Topic */}
              <div className="mt-4 space-y-2">
                {firstPost.theme && (
                  <div className="flex items-start">
                    <span className="text-xs font-medium text-gray-500 mr-2">Theme:</span>
                    <span className="text-xs text-gray-700">{firstPost.theme}</span>
                  </div>
                )}
                {firstPost.topic && (
                  <div className="flex items-start">
                    <span className="text-xs font-medium text-gray-500 mr-2">Topic:</span>
                    <span className="text-xs text-gray-700">{firstPost.topic}</span>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end mt-4 space-x-2">
                <TooltipHelp text="Edit this post">
                  <button 
                    onClick={handleEdit}
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center">
                    <FileEdit className="w-3.5 h-3.5 mr-1" />
                    <span>Edit</span>
                  </button>
                </TooltipHelp>
                
                <TooltipHelp text="Hide this post">
                  <button 
                    onClick={handleToggleShowPost}
                    className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center">
                    <X className="w-3.5 h-3.5 mr-1" />
                    <span>Hide</span>
                  </button>
                </TooltipHelp>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer with action button */}
        <div className="pt-4 border-t border-gray-200 mt-4">
          <button
            onClick={() => {
              navigate('/dashboard/compose');
              onClose();
            }}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            <span>Create New Post</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default FirstPostModal;
