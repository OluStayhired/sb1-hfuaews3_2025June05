// src/pages/BlogManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { BlogListPanel } from '../components/BlogListPanel';
import { BlogPageReadEdit } from '../components/BlogPageReadEdit';
import { AddBlogPage } from '../components/AddBlogPage'; // Import the new component
import { PlusCircle, BookText, X } from 'lucide-react'; // Icons for buttons

type BlogManagementMode = 'view_edit' | 'add_new';

export function BlogManagementPage() {
  const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
  const [isBlogListPanelOpen, setIsBlogListPanelOpen] = useState(false);
  const [mode, setMode] = useState<BlogManagementMode>('view_edit'); // Default mode

  // Effect to open the panel if no blog is selected and we are in view_edit mode
  //useEffect(() => {
    //if (selectedBlogId === null && !isBlogListPanelOpen && mode === 'view_edit') {
      //setIsBlogListPanelOpen(true);
    //}
  //}, [selectedBlogId, isBlogListPanelOpen, mode]);

  const handleSelectBlog = (blogId: number | null) => {
    setSelectedBlogId(blogId);
    setIsBlogListPanelOpen(false); // Close panel after selecting a blog
    setMode('view_edit'); // Ensure we are in view/edit mode
  };

  const handleOpenBlogListPanel = () => {
    setIsBlogListPanelOpen(true);
    setMode('view_edit'); // Ensure we are in view/edit mode when opening the list
  };

  const handleCreateNewBlog = () => {
    setSelectedBlogId(null); // Clear any selected blog when creating new
    setIsBlogListPanelOpen(false); // Close panel if open
    setMode('add_new'); // Switch to add new mode
  };

  const handleNewBlogAdded = (newBlogId: number) => {
    // After a new blog is added, switch to view/edit mode and select the new blog
    setSelectedBlogId(newBlogId);
    setMode('view_edit');
    setIsBlogListPanelOpen(false); // Ensure panel is closed
  };

  const handleCancelAddBlog = () => {
    // If user cancels adding a new blog, go back to view/edit mode
    setMode('view_edit');
    // Optionally, open the list panel if no blog was previously selected
    //if (selectedBlogId === null) {
      //setIsBlogListPanelOpen(true);
    //}
  };

  return (
    <div className="flex h-screen">
      {/* Main content area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-end space-x-4 mb-4">
          {mode === 'view_edit' && (
            <button
              onClick={handleCreateNewBlog}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create New Blog</span>
            </button>
          )}
          {mode === 'add_new' && (
            <button
              onClick={handleCancelAddBlog}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors flex items-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>Cancel Add Blog</span>
            </button>
          )}
          <button
            onClick={handleOpenBlogListPanel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
          >
            <BookText className="w-5 h-5" />
            <span>Open Blog List</span>
          </button>
        </div>

        {mode === 'add_new' ? (
          <AddBlogPage onSuccess={handleNewBlogAdded} onCancel={handleCancelAddBlog} />
        ) : (
          <BlogPageReadEdit
            blogId={selectedBlogId}
            onOpenBlogListPanel={handleOpenBlogListPanel}
            isBlogListPanelOpen={isBlogListPanelOpen}
            onCreateNewBlog={handleCreateNewBlog} 
          />
        )}
      </div>

      {/* Side panel for BlogListPanel */}
      <BlogListPanel
        isOpen={isBlogListPanelOpen}
        onClose={() => setIsBlogListPanelOpen(false)}
        onSelectBlog={handleSelectBlog}
        selectedBlogId={selectedBlogId}
      />
    </div>
  );
}
