// src/components/PromptDailyIdeas.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, Search, Copy, PlusCircle, ArrowLeft, ArrowRight, Check, Lightbulb, Calendar, Briefcase} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TooltipHelp } from '../utils/TooltipHelp';
import { useNavigate } from 'react-router-dom';
import { checkConnectedSocials } from '../utils/checkConnectedSocial';

// NEW: Interface for ConnectedSocials
interface ConnectedSocials {
  bluesky: boolean;
  linkedin: boolean;
  twitter: boolean;
}

// [definition] - Interface for a single prompt item from the 'prompt_daily' table
interface PromptItem {
  id: string;
  prompt_text: string;
  day_of_week: string;
  prompt_category: string;
  business_type: string;
}

interface PromptDailyIdeasProps {
  onUsePrompt: (promptContent: string) => void; // Callback to copy prompt_text to ComposePost.tsx
}

export function PromptDailyIdeas({ onUsePrompt }: PromptDailyIdeasProps) {
  const [allPrompts, setAllPrompts] = useState<PromptItem[]>([]);
  const [displayedPrompts, setDisplayedPrompts] = useState<PromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [copySuccessMap, setCopySuccessMap] = useState<{ [key: string]: boolean }>({});
  const [usePromptSuccessIndex, setUsePromptSuccessIndex] = useState<number | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState('All Businesses'); // NEW: State for business_type filter
  const navigate = useNavigate();
   // NEW: State to store connected social accounts
  const [connectedSocials, setConnectedSocials] = useState<ConnectedSocials | null>(null);

  const promptsPerPage = 50;

  // NEW: Memoize unique business types for the dropdown filter
  const uniqueBusinessTypes = useMemo(() => {
    const types = new Set(allPrompts.map(p => p.business_type).filter(Boolean));
    return ['All Businesses', ...Array.from(types).sort()];
  }, [allPrompts]);

  const fetchPrompts = useCallback(async () => {
    try {
      setIsLoading(true);
      // [definition] - Query all columns from the 'prompt_daily' table
      const { data, error: fetchError } = await supabase
        .from('prompt_daily')
        .select('id, prompt_text, day_of_week, prompt_category, business_type')
        .eq('business_type','Accountant');
      if (fetchError) {
        throw fetchError;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const fetchedPrompts: PromptItem[] = data
          .map(record => ({
            id: String(record.id), // Ensure ID is a string
            prompt_text: record.prompt_text,
            day_of_week: record.day_of_week,
            prompt_category: record.prompt_category,
            business_type: record.business_type,
          }))
          .filter(item => item.prompt_text && item.prompt_text.trim().length > 0); // Ensure main prompt content exists
        setAllPrompts(fetchedPrompts);
      } else {
        setAllPrompts([]);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error fetching prompts:', err);
      setError('Failed to load prompts. ' + err.message);
      setAllPrompts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let filtered = allPrompts;

    // NEW: Apply business_type filter
    if (selectedBusinessType !== 'All Businesses') {
      filtered = filtered.filter(prompt => prompt.business_type === selectedBusinessType);
    }

    // [requirement] - Apply free text search across relevant fields
    if (searchQuery.trim()) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(prompt =>
        prompt.prompt_text.toLowerCase().includes(lowerCaseQuery) ||
        (prompt.day_of_week && prompt.day_of_week.toLowerCase().includes(lowerCaseQuery)) ||
        (prompt.prompt_category && prompt.prompt_category.toLowerCase().includes(lowerCaseQuery)) ||
        (prompt.business_type && prompt.business_type.toLowerCase().includes(lowerCaseQuery))
      );
    }

    const startIndex = (currentPage - 1) * promptsPerPage;
    const endIndex = startIndex + promptsPerPage;
    setDisplayedPrompts(filtered.slice(startIndex, endIndex));

    // Reset page to 1 if filters change and current page is out of bounds
    const totalFilteredPromptsAfterFilters = filtered.length;
    const newTotalPages = Math.ceil(totalFilteredPromptsAfterFilters / promptsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    } else if (newTotalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }

  }, [allPrompts, searchQuery, selectedBusinessType, currentPage, promptsPerPage]);

  useEffect(() => {
    fetchPrompts();
    setSearchQuery('');
    setCurrentPage(1);
    setUsePromptSuccessIndex(null);
    setSelectedBusinessType('All Businesses'); // Reset business_type filter on mount
  }, [fetchPrompts]);

  const handleCopyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccessMap(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => setCopySuccessMap(prev => ({ ...prev, [itemId]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

 // NEW: Fetch connected social accounts on mount
  useEffect(() => {
    const fetchConnected = async () => {
      const socials = await checkConnectedSocials();
      setConnectedSocials(socials);
    };
    fetchConnected();
  }, []); // Run once on mount
  
  // [requirement] - Similar button to "copy template" in HookIdeas
  const handleUsePromptClick = (promptContent: string, index: number) => {
    onUsePrompt(promptContent); // Pass the prompt_text to the parent component
    setUsePromptSuccessIndex(index); // Set success feedback for this prompt
    setTimeout(() => {
      setUsePromptSuccessIndex(null); // Clear feedback
      // Optionally, navigate to ComposePost.tsx here if onUsePrompt doesn't handle it
      // navigate('/dashboard/compose');
    }, 500);
  };

     // NEW: Function to determine the tooltip for the "Copy Template" button
  const getCopyTemplateTooltip = () => {
    if (!connectedSocials || (!connectedSocials.bluesky && !connectedSocials.linkedin && !connectedSocials.twitter)) {
      return "⚡connect account";
    }
    return "⚡send to draft";
  };

  const handlePageChange = (newPage: number) => {
    const totalFilteredPrompts = searchQuery.trim()
      ? allPrompts.filter(prompt => prompt.prompt_text.toLowerCase().includes(searchQuery.toLowerCase())).length
      : allPrompts.length;
    const totalPages = Math.ceil(totalFilteredPrompts / promptsPerPage);

    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // NEW: Handle business_type filter change
  const handleBusinessTypeFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBusinessType(e.target.value);
    setCurrentPage(1); // Reset to first page on new filter
  };

  const totalFilteredPrompts = searchQuery.trim()
    ? allPrompts.filter(prompt => prompt.prompt_text.toLowerCase().includes(searchQuery.toLowerCase())).length
    : allPrompts.length;
  const totalPages = Math.ceil(totalFilteredPrompts / promptsPerPage);

   // NEW: Determine if the "Copy Template" button should be disabled
  const isCopyTemplateDisabled = !connectedSocials || (!connectedSocials.bluesky && !connectedSocials.linkedin && !connectedSocials.twitter);
  
  return (
    <div className="bg-gray-50 hover:bg-customGray-75 rounded-lg z-50 h-full break-words">
      <div className="p-4 h-full rounded-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 items-center bg-gray-200 rounded-full">
              <Lightbulb className="h-4 w-4 text-gray-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-500">Post Templates ({totalFilteredPrompts})</h3>
          </div>
        </div>
      <p className="text-gray-500 hover:text-gray-600 hover:bg-gray-200 font-normal text-sm mb-6 mt-2 rounded-md p-2 inline-block"> 
        Grow inbound inquiries on LinkedIn with these custom built prompts. Generate posts that build trust and book more client appointments.
        </p>

        {/* [requirement] - Free text search similar to HookIdeas */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search prompts..."
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

        {/* [requirement] - Dropdown for business_type column */}
        <div className="mb-4">
          <label htmlFor="businessTypeFilter" className="sr-only">Filter by Business Type</label>
          <select
            id="businessTypeFilter"
            value={selectedBusinessType}
            onChange={handleBusinessTypeFilter}
            className="w-full text-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700"
          >
            {uniqueBusinessTypes.map(type => (
              <option key={type} value={type}>
                {type}
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
            {displayedPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
                  <Lightbulb className="w-12 h-12 font-light text-blue-500" />
                </div>
                <p className="text-gray-600 mb-3 mt-4">No prompt ideas available 😔</p>
                <p className="text-gray-400 mb-4 text-sm">Try adjusting your filters or search query.</p>
              </div>
            ) : (

<div className="grid grid-cols-2 gap-2">
            {
              displayedPrompts.map((promptItem, index) => (
                <div key={promptItem.id} className="bg-white px-3 pt-3 pb-12 rounded-lg  hover:shadow-sm transition-all relative">
                  
              <div className="space-y-2 mt-6">   
              {promptItem.day_of_week && (
                  <span className={`mb-3 relative text-sm top-2 px-1 py-0.5 font-medium rounded-md 
                    ${
                        promptItem.day_of_week === 'Monday' 
                            ? 'bg-blue-50 text-blue-700' //border-blue-100'
                            : promptItem.day_of_week === 'Tuesday'
                            ? 'bg-red-50 text-red-700' //border-red-200'
                            : promptItem.day_of_week === 'Wednesday'
                            ? 'bg-yellow-50 text-yellow-700' //border-yellow-200'
                            : promptItem.day_of_week === 'Thursday'
                            ? 'bg-purple-50 text-purple-700' //border-purple-200'
                            : promptItem.day_of_week === 'Friday'
                            ? 'bg-green-50 text-green-700' //border-green-200'
                            : 'bg-gray-50 text-gray-700' //border-gray-200' // Default/Fallback for Saturday/Sunday or unknown
                      }
                    `}>
                      {promptItem.day_of_week}
                    </span>
                  )}
                  
                  {/* [requirement] - Show prompt_category and day_of_week */}
                  {promptItem.prompt_category && (
                    <p className="mb-3 relative text-sm top-2 px-1 py-0.5 font-normal border-b border-gray-200 text-gray-800">
                      {promptItem.prompt_category}
                    </p>
                  )}

                </div>
                  
                  
                  {/* [requirement] - Display prompt_text */}
                  <p className="mt-5 p-2 text-xs bg-gray-50 rounded-md text-gray-600 overflow-wrap break-words">{promptItem.prompt_text}</p>

                  <div className="absolute space-x-2 top-2 right-4 flex space-x-1">
                    
                       <p className="flex justify-center items-center text-xs text-green-600 px-1 py-0.5 bg-green-50 rounded-md">
                         <Briefcase className="w-3 h-3 mr-1" />
                         {promptItem.business_type}</p>

                    
                      <button
                        onClick={() => handleCopyToClipboard(promptItem.prompt_text, promptItem.id)}
                        className="p-1 space-x-2 text-xs bg-blue-50 text-blue-300 rounded-lg hover:bg-blue-100 hover:text-blue-500 transition-colors flex items-center justify-center"
                      >
                        {copySuccessMap[promptItem.id] ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    
                  </div>

                  <div className="absolute bottom-2 right-2 flex mt-3 space-x-2 z-10">
                    {/* [requirement] - Similar button to "copy template" in HookIdeas */}
                    <TooltipHelp text={usePromptSuccessIndex === index ? "Prompt Used!" : getCopyTemplateTooltip()}>
                      <button
                        disabled={isCopyTemplateDisabled}
                        onClick={() => handleUsePromptClick(promptItem.prompt_text, index)}
                        className={`p-1.5 text-xs rounded-lg transition-colors flex items-center justify-center ${
                          usePromptSuccessIndex === index
                            ? 'bg-green-500 text-white'
                              : isCopyTemplateDisabled // NEW: Apply disabled styling
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        {usePromptSuccessIndex === index ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <>
                            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                            <span>Use Prompt</span>
                          </>
                        )}
                      </button>
                    </TooltipHelp>
                  </div>
                </div>
              ))

            } {/* added a new end*/}
          </div> /*added a new close div*/
      
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
  );
}

export default PromptDailyIdeas;
