import React, { useState } from 'react';
import { Calendar, Lightbulb, X, Sparkles, Copy, Loader2, PlusCircle } from 'lucide-react';
import { generateListPost } from '../lib/gemini';
import { useNavigate, Navigate } from 'react-router-dom';

interface ContentItem {
  id: string; // Assuming each content item now has a unique ID for tracking
  theme: string;
  topic: string;
  content: string;
  target_audience?: string;
  call_to_action?: string;
}

interface ContentCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentItems: ContentItem[];
  content_date: string;
  onRewriteContent: (rewrittenContent: string) => void;
}

export function ContentCalendarModal({
  isOpen,
  onClose,
  contentItems,
  content_date,
  onRewriteContent
}: ContentCalendarModalProps) {
  const [copySuccessMap, setCopySuccessMap] = useState<{ [key: string]: boolean }>({});
  const [rewritingItemId, setRewritingItemId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const truncatedContent = (content: string, maxLength: number) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const handleCopyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccessMap(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => setCopySuccessMap(prev => ({ ...prev, [itemId]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleRewrite = async (item: ContentItem) => {
    setRewritingItemId(item.id);
    try {
      const rewrittenContent = await generateListPost(
        item.theme,
        item.topic,
        item.target_audience || '',
        item.content,
        item.call_to_action || ''
      );

      if (rewrittenContent.error) {
        console.error('Error rewriting content:', rewrittenContent.error);
      } else {
        onRewriteContent(rewrittenContent.text);
        // onClose() was removed as per your request
      }
    } catch (error) {
      console.error('Error during AI rewrite:', error);
    } finally {
      setRewritingItemId(null);
    }
  };

  const handleCreateCampaign = () => {
    navigate('/dashboard/campaign');
    onClose();
  };

  return (
    <div className="fixed top-0 right-0 h-screen w-80 bg-white shadow-lg border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
      <div className="p-4  h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 items-center bg-blue-50 rounded-full">
                <Lightbulb className="h-5 w-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Today's Ideas</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        
        {/*
        <div className="space-y-6 mb-6 pb-4 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ maxHeight: '80vh' }}> */}

        <div className="space-y-6 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">

          {contentItems.length === 0 ? (
      //<p className="text-sm text-gray-500">No content found for today.</p>
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
                <Lightbulb className="w-12 h-12 font-light text-blue-500" />
                
                </div>
                  <p className="text-gray-600 mb-3 mt-4">You have no content ideas today 😔 </p>
                  <p className="text-gray-400 mb-4 text-sm"> Start a new campaign to get daily post ideas </p>

                <button
                    onClick={handleCreateCampaign}
                    className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4 mr-1" />
                    <span>Create Campaign</span>
                  </button>
              </div>
      
          ) : (
            contentItems.map((item) => (
              <div key={item.id} className="space-y-4 p-2 hover:rounded-md mb-6 pb-4 border-b border-gray-100 last:border-b-0 hover:border hover:border-blue-100">
                <div className="flex p-2 items-center space-x-2 rounded-lg bg-gradient-to-r from-blue-50 to-white  rounded-lg">
                  
                      <Lightbulb className="h-3.5 w-3.5 text-blue-500" />
                  
                  <p className="text-sm font-medium text-gray-900">{item.theme || 'N/A'}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <p className="text-xs text-gray-900">{item.topic || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 p-2 rounded-md">
                  <h3 className="text-sm font-medium text-blue-500">Post Idea 💡</h3>
                  <p className="text-xs text-gray-500">{truncatedContent(item.content || '', 150)}</p>
                </div>
                <div className="flex justify-end mt-1 space-x-2"> {/* Added space-x-2 for gap between buttons */}
                  {/* Copy Button for individual content */}
                  <button
                    onClick={() => handleCopyToClipboard(item.content, item.id)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded-lg hover:bg-blue-50 hover:text-blue-500 transition-colors flex items-center space-x-2"
                  >
                    {copySuccessMap[item.id] ? (
                      <span className="text-green-500">Copied!</span>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {/* Rewrite Button */}
                  <button
                    onClick={() => handleRewrite(item)}
                    disabled={rewritingItemId === item.id}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                  >
                    {rewritingItemId === item.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Rewriting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Rewrite</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Global Copy All Button - adjusted styling for consistency if desired, or remove if not needed */}
        {/* If you want the "Copy All" button to persist at the bottom, keep this div 
        <div className="absolute bottom-4 left-4 flex space-x-2">
          <button
            onClick={() => {
              const allContent = contentItems.map(item => item.content).join('\n\n'); // Copy only content
              handleCopyToClipboard(allContent, 'all'); // Use a unique ID like 'all' for global copy
            }}
            className="flex items-center space-x-2 px-3 py-1 bg-gray-100 text-gray-500 rounded-full hover:bg-blue-50 hover:text-blue-500 transition-colors"
          >
            <Copy className="w-4 h-4" />
            <span>Copy All</span>
          </button>
          {copySuccessMap['all'] && ( // Check for 'all' ID success
            <span className="ml-2 text-xs text-green-500">Copied!</span>
          )}
        </div>
      */}
      
      </div>
    </div>
  );
}

export default ContentCalendarModal;