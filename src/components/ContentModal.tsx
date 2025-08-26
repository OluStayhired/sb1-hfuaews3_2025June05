import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Sparkles, List, ListOrdered } from 'lucide-react';
import { generateListPost } from '../lib/gemini';

interface ContentModalProps {
  content: {
    id: string;
    theme: string;
    topic: string;
    content: string;
    call_to_action: string;
    target_audience?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedContent: any) => Promise<void>;
  setOptimisticContent: React.Dispatch<React.SetStateAction<any[]>>;
  isUpdating?: boolean;
}

// Helper function to calculate first line length
const calculateFirstLineLength = (text: string): number => {
  const firstLine = text.split('\n')[0];
  return firstLine.length;
};

export function ContentModal({ 
  content, 
  isOpen, 
  onClose, 
  onSave, 
  setOptimisticContent,
  isUpdating = false 
}: ContentModalProps) {
  const [editedContent, setEditedContent] = useState(content);
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [firstLineLength, setFirstLineLength] = useState(() => calculateFirstLineLength(content.content));

  const MAX_FIRST_LINE = 40;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditedContent(content);
      setFirstLineLength(calculateFirstLineLength(content.content));
    }
  }, [isOpen, content]);

  // Text formatting helpers
  const insertBulletList = () => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const text = editedContent.content;
    const beforeCursor = text.substring(0, cursorPos);
    const afterCursor = text.substring(cursorPos);
    
    const bulletPoint = beforeCursor.endsWith('\n') || beforeCursor === '' 
      ? '• ' 
      : '\n• ';
      
    const newContent = beforeCursor + bulletPoint + afterCursor;
    
    setEditedContent({
      ...editedContent,
      content: newContent
    });
  };

  const insertNumberedList = () => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const text = editedContent.content;
    const beforeCursor = text.substring(0, cursorPos);
    const afterCursor = text.substring(cursorPos);
    
    const existingLines = beforeCursor.split('\n');
    const numberedLines = existingLines.filter(line => /^\d+\./.test(line));
    const nextNumber = numberedLines.length + 1;
    
    const numberedItem = beforeCursor.endsWith('\n') || beforeCursor === ''
      ? `${nextNumber}. `
      : `\n${nextNumber}. `;
      
    const newContent = beforeCursor + numberedItem + afterCursor;
    
    setEditedContent({
      ...editedContent,
      content: newContent
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    setEditedContent({
      ...editedContent,
      content: newContent
    });

    setFirstLineLength(calculateFirstLineLength(newContent));

    setOptimisticContent(prev => 
      prev.map(content => 
        content.id === editedContent.id 
          ? {...content, content: newContent}
          : content
      )
    );
  };

  const getFirstLineColor = (length: number) => {
    if (length <= 35) return 'bg-green-500';
    if (length > 35 && length <= MAX_FIRST_LINE) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const FirstLineProgress = () => {
    const percentage = Math.min((firstLineLength / MAX_FIRST_LINE) * 100, 100);
    const color = getFirstLineColor(firstLineLength);

    return (
      <div className="relative h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
        <div 
          className={`absolute left-0 top-0 h-full transition-all duration-200 ${color}`}
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute right-0 -top-4 text-xs text-gray-500">
          {firstLineLength}/{MAX_FIRST_LINE} first line
        </div>
      </div>
    );
  };

  const handleImproveAIContent = async () => {
    setIsImproving(true);
    try {
      const improvedContent = await generateListPost(
        editedContent.theme,
        editedContent.topic,
        editedContent.target_audience || '',
        editedContent.content,
        editedContent.call_to_action
      );

      if (!improvedContent.error) {
        setEditedContent({
          ...editedContent,
          content: improvedContent.text,
        });
      }
    } catch (err) {
      console.error('Error improving content:', err);
    } finally {
      setIsImproving(false);
    }
  };

  const handleSave = async () => {
    setOptimisticContent(prev => 
      prev.map(content => 
        content.id === editedContent.id ? editedContent : content
      )
    );
    
    try {
      await onSave(editedContent);
      onClose();
    } catch (err) {
      console.error('Error saving content:', err);
      setOptimisticContent(prev => 
        prev.map(content => 
          content.id === editedContent.id ? content : content
        )
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Edit Content</h3>
          <button onClick={onClose} className="p-2 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/*
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <input
              type="text"
              value={editedContent.theme}
              onChange={(e) => setEditedContent({...editedContent, theme: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <input
              type="text"
              value={editedContent.topic}
              onChange={(e) => setEditedContent({...editedContent, topic: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
*/}
          <div className="text-left">
            <label className="block text-left text-sm font-medium text-gray-700 mb-1">Write better posts . . .</label>
            <div className="relative">
              <div className={`relative ${isUpdating ? 'opacity-50' : ''}`}>
                <div className="flex items-center space-x-2 mb-2 p-1 bg-white rounded-lg">
                  <button
                    type="button"
                    onClick={insertBulletList}
                    className="p-1.5 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded transition-colors tooltip"
                    title="Add bullet list"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={insertNumberedList}
                    className="p-1.5 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded transition-colors tooltip"
                    title="Add numbered list"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={editedContent.content}
                  onChange={handleContentChange}
                  className={`w-full text-gray-500 text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                    firstLineLength > 40 ? 'border-red-300' : ''
                  }`}
                  rows="10"
                />
                <FirstLineProgress />
                {firstLineLength <= MAX_FIRST_LINE ? (
                  <p className="text-xs text-green-500">
                    First line readability tracker
                  </p>
                ) : (
                  <p className="text-xs text-red-500">
                    First line should be under {MAX_FIRST_LINE} characters for better readability
                  </p>
                )}

                {isUpdating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  </div>
                )}
              </div>

              <button
                onClick={handleImproveAIContent}
                disabled={isImproving}
                className="absolute right-2 top-2 p-1 flex items-center space-x-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 rounded-md transition duration-200"
              >

                <span className="flex items-center space-x-1">
                  
                  <span>
                    {isImproving ? (
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-blue-500"/>
                    )}
                  </span>
                  
                  <span className="text-xs text-blue-500">make it better</span>
                </span>
              </button>
            </div>

            <div className="flex justify-end mt-1">
              <span className={`text-xs ${
                editedContent.content.length > 300 ? 'text-red-500' : 'text-gray-500'
              }`}>
                {editedContent.content.length}/300 chars
              </span>
            </div>
          </div>
          
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-50 rounded-md text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
