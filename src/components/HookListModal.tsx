// src/components/HookListModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, Search, Copy, PlusCircle, ArrowLeft, ArrowRight, Check, Sparkles, BookText, XCircle } from 'lucide-react';
import { ArrowLeftSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TooltipHelp } from '../utils/TooltipHelp';
import { generateKillerHook } from '../lib/gemini';
import { TooltipExtended } from '../utils/TooltipExtended';


// NEW: Interface for a single hook item
interface HookItem {
  hooks: string; // The main hook content
  example_hook: string; // The example usage
  hook_category: string; // The category of the hook
}

interface HookListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseHook: (hookContent: string) => void;
  currentComposeContent: string;
  onRewriteHook: (revisedHook: string) => void;
}

export function HookListModal({
  isOpen,
  onClose,
  onUseHook,
  currentComposeContent,
  onRewriteHook,
}: HookListModalProps) {
  // NEW: State to hold all fetched hooks as HookItem objects
  const [allHooks, setAllHooks] = useState<HookItem[]>([]);
  // NEW: State to hold hooks currently displayed after filtering/pagination
  const [displayedHooks, setDisplayedHooks] = useState<HookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [copySuccessMap, setCopySuccessMap] = useState<{ [key: string]: boolean }>({});
  const [useHookSuccessIndex, setUseHookSuccessIndex] = useState<number | null>(null);
  const [isGeneratingKillerHook, setIsGeneratingKillerHook] = useState<number | null>(null);
  // NEW: State for the selected category filter
  const [selectedCategory, setSelectedCategory] = useState('All');


  const hooksPerPage = 50;

  // NEW: Memoize unique categories for filter pills
  const uniqueCategories = useMemo(() => {
    const categories = new Set(allHooks.map(h => h.hook_category).filter(Boolean));
    return ['All', ...Array.from(categories).sort()];
  }, [allHooks]);

  // NEW: Function to determine if the "Generate Hook" button should be enabled
  const canProceedToGenerateHook = () => {
    return currentComposeContent.trim().length >= 50;
  };

  // NEW: Function to determine the tooltip message for the "Generate Hook" button
  const getGenerateHookTooltip = () => {
    if (currentComposeContent.trim().length < 50) {
      return "activate with 50 chars";
    }
    return "⚡create a hook";
  };

  const fetchHooks = useCallback(async () => {
    try {
      setIsLoading(true);
      // REFACTORING: Select all required columns: hooks, example_hook, hook_category
      const { data, error: fetchError } = await supabase
        .from('content_hooks')
        .select('hooks, example_hook, hook_category');

      if (fetchError) {
        throw fetchError;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        // Map the fetched data to the HookItem interface
        const fetchedHooks: HookItem[] = data
          .map(record => ({
            hooks: record.hooks,
            example_hook: record.example_hook,
            hook_category: record.hook_category,
          }))
          .filter(item => item.hooks && item.hooks.trim().length > 0); // Ensure main hook content exists
        setAllHooks(fetchedHooks);
      } else {
        setAllHooks([]);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error fetching hooks:', err);
      setError('Failed to load hooks. ' + err.message);
      setAllHooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let filtered = allHooks;

    // NEW: Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(hook => hook.hook_category === selectedCategory);
    }

    // Apply search filter (now searches across all fields)
    if (searchQuery.trim()) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(hook =>
        hook.hooks.toLowerCase().includes(lowerCaseQuery) ||
        (hook.example_hook && hook.example_hook.toLowerCase().includes(lowerCaseQuery)) ||
        (hook.hook_category && hook.hook_category.toLowerCase().includes(lowerCaseQuery))
      );
    }

    const startIndex = (currentPage - 1) * hooksPerPage;
    const endIndex = startIndex + hooksPerPage;
    setDisplayedHooks(filtered.slice(startIndex, endIndex));

    // NEW: Reset page to 1 if filters change and current page is out of bounds
    const totalFilteredHooksAfterFilters = filtered.length;
    const newTotalPages = Math.ceil(totalFilteredHooksAfterFilters / hooksPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    } else if (newTotalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }

  }, [allHooks, searchQuery, selectedCategory, currentPage, hooksPerPage]); // NEW: Add selectedCategory to dependencies

  useEffect(() => {
    if (isOpen) {
      fetchHooks();
      setSearchQuery('');
      setCurrentPage(1);
      setUseHookSuccessIndex(null);
      setIsGeneratingKillerHook(null);
      setSelectedCategory('All'); // NEW: Reset category filter on open
    }
  }, [isOpen, fetchHooks]);

  const handleCopyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccessMap(prev => ({ ...prev, [index]: true }));
      setTimeout(() => setCopySuccessMap(prev => ({ ...prev, [index]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // NEW: handleUseHookClick now receives HookItem
  const handleUseHookClick = (hookItem: HookItem, index: number) => {
    onUseHook(hookItem.hooks); // Pass the main hook content
    setUseHookSuccessIndex(index);
    setTimeout(() => {
      setUseHookSuccessIndex(null);
      onClose();
    }, 500);
  };

  // NEW: handleGenerateKillerHook now receives HookItem
  const handleGenerateKillerHook = async (hookItem: HookItem, index: number) => {
    setIsGeneratingKillerHook(index);
    try {
      // Call the Gemini API function with the current content and the main hook content
      const revisedHook = await generateKillerHook(currentComposeContent, hookItem.hooks);

      // Prepend the revised hook to the existing content in ComposePosts.tsx
      //onRewriteHook(revisedHook + '\n' + currentComposeContent);
      onRewriteHook(revisedHook +'\n\n');

       if (revisedHook.error) {
        console.error('Error rewriting hook:', revisedHook.error);
      } else {
        onRewriteHook(revisedHook.text);
        //onClose() was removed as per your request
      }

      //onClose(); // Close the modal after successful generation
      // don't close after successful re-write
      
    } catch (err: any) {
      console.error('Error generating killer hook:', err);
      setError('Failed to generate killer hook. ' + err.message);
    } finally {
      setIsGeneratingKillerHook(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    const totalFilteredHooks = searchQuery.trim()
      ? allHooks.filter(hook => hook.toLowerCase().includes(searchQuery.toLowerCase())).length
      : allHooks.length;
    const totalPages = Math.ceil(totalFilteredHooks / hooksPerPage);

    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleAddHook = () => {
    alert('Functionality to add a new hook is not yet implemented.');
  };

  if (!isOpen) return null;

  {/*
  const totalFilteredHooks = searchQuery.trim()
    ? allHooks.filter(hook => hook.toLowerCase().includes(searchQuery.toLowerCase())).length
    : allHooks.length;
  const totalPages = Math.ceil(totalFilteredHooks / hooksPerPage);
*/}
const totalFilteredHooks = searchQuery.trim()
  ? allHooks.filter(hook => hook.hooks.toLowerCase().includes(searchQuery.toLowerCase())).length
  : allHooks.length;
const totalPages = Math.ceil(totalFilteredHooks / hooksPerPage);
  
  return (
    <>
      {/* Overlay for the rest of the screen (adds dark overlay)
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>
       */}

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
                <BookText className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Hook Library ({totalFilteredHooks})</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search hooks..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full text-sm px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

          {/* NEW: Category Filter Dropdown */}
          <div className="mb-4">
            <label htmlFor="hookCategoryFilter" className="sr-only">Filter by Category</label>
            <select
              id="hookCategoryFilter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700"
            >
              {uniqueCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center flex-grow">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {displayedHooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
                    <BookText className="w-12 h-12 font-light text-blue-500" />
                  </div>
                  <p className="text-gray-600 mb-3 mt-4">No hooks available 😔</p>
                  <p className="text-gray-400 mb-4 text-sm">We're working to add more hooks . . .</p>
                  <button
                    onClick={onClose}
                    className="inline-flex text-sm items-center px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    <span>Close</span>
                  </button>
                </div>
              ) : (
                displayedHooks.map((hookItem, index) => ( // NEW: Use hookItem instead of hook
                  <div key={index} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all relative">
                    {/* NEW: Display hook_category */}
                    {hookItem.hook_category && (
                      <span className="mb-3 relative text-sm top-2 px-1 py-0.5 font-medium bg-gradient-to-r from-blue-50 to-white text-gray-800 rounded-md">
                        
                        {hookItem.hook_category}
                      </span>
                    )}
                    
                    {/* NEW: Adjust mt-5 to accommodate category pill */}
                    <p className="mt-5 p-1 text-xs bg-gray-50 rounded-md text-gray-600 whitespace-pre-wrap hover:bg-gray-100">{hookItem.hooks}</p>

                    {/* NEW: Display example_hook*/}
                    {hookItem.example_hook && (
                      <div className="mt-2 p-1 bg-gray-100 rounded-md">
                        {/*<p className="text-xs text-gray-600">Example: {hookItem.example_hook}</p>*/}
                        <p className="text-xs text-gray-400 italic">{hookItem.example_hook}</p>
                      </div>
                    )}

                    <div className="absolute top-2 right-4 flex space-x-1">
                      
                      {/* Copy Button 
                      <TooltipHelp text={copySuccessMap[index] ? "Copied!" : "⚡copy hook"}>
                        <button
                          onClick={() => handleCopyToClipboard(hookItem.hooks, index)} // NEW: Pass hookItem.hooks
                          className="p-1 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </TooltipHelp>
                      */}
                      
                      {/* New Copy Hook Button */}
                      {/*<TooltipHelp text={useHookSuccessIndex === index ? "Hook Sent!" : "⚡send hook"}>*/}
                        <button
                          onClick={() => handleUseHookClick(hookItem, index)} // NEW: Pass hookItem
                          className={`p-1 text-xs rounded-lg transition-colors flex items-center justify-center ${
                            useHookSuccessIndex === index
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          }`}
                        >
                          {useHookSuccessIndex === index ? (
                            <Check className="w-3 h-3" />
                          ) : (
                          <>
                            {/*<span>Use</span>*/}
                            <Copy className="w-3 h-3" />
                            
                          </>
                          )}
                        </button>
                      {/*</TooltipHelp>*/}
                    </div>


            {/* ------------- Start NEW: Generate Hook Button -------------- */}
                    <div className="flex justify-end mt-3 space-x-2 z-1000000">
                      {/* Generate Killer Hook Button */}
                      <TooltipHelp text={getGenerateHookTooltip()}> {/* NEW: Use dynamic tooltip */}
                        <button
                          onClick={() => handleGenerateKillerHook(hookItem, index)} // NEW: Pass hookItem
                          disabled={isGeneratingKillerHook === index || !canProceedToGenerateHook()} // NEW: Use canProceedToGenerateHook
                          className={`p-1.5 text-xs rounded-lg transition-colors flex items-center justify-center ${
                            isGeneratingKillerHook === index || !canProceedToGenerateHook()
                              ? 'bg-blue-300 text-white cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {isGeneratingKillerHook === index ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating...</span>
                            </>
                          ) : (
                            <>
                            <Sparkles className="mr-1 w-3.5 h-3.5" />
                            <span>Generate Hook</span>
                            </>
                          )}
                        </button>
                      </TooltipHelp>
                      </div>
      {/* ------------- Start NEW: Generate Hook Button -------------- */}                    

                    
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
