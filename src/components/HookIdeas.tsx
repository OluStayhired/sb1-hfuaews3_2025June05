// src/components/HookIdeas.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, Search, Copy, PlusCircle, ArrowLeft, ArrowRight, Check, Sparkles, BookText, XCircle, BookOpenText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TooltipHelp } from '../utils/TooltipHelp';
import { generateKillerHook } from '../lib/gemini';
import { TooltipExtended } from '../utils/TooltipExtended';
import { checkConnectedSocials } from '../utils/checkConnectedSocial';



// NEW: Interface for ConnectedSocials
interface ConnectedSocials {
  bluesky: boolean;
  linkedin: boolean;
  twitter: boolean;
}

// NEW: Interface for a single hook item
interface HookItem {
  hooks: string; // The main hook content
  example_hook: string; // The example usage
  hook_category: string; // The category of the hook
}

interface HookIdeasProps { // Renamed interface
  onUseHook: (hookContent: string) => void;
  currentComposeContent: string;
  onRewriteHook: (revisedHook: string) => void;
}

export function HookIdeas({ // Renamed component
  onUseHook,
  currentComposeContent,
  onRewriteHook,
}: HookIdeasProps) { // Renamed props type
  const [allHooks, setAllHooks] = useState<HookItem[]>([]);
  const [displayedHooks, setDisplayedHooks] = useState<HookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [copySuccessMap, setCopySuccessMap] = useState<{ [key: string]: boolean }>({});
  const [useHookSuccessIndex, setUseHookSuccessIndex] = useState<number | null>(null);
  const [isGeneratingKillerHook, setIsGeneratingKillerHook] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  // NEW: State to store connected social accounts
  const [connectedSocials, setConnectedSocials] = useState<ConnectedSocials | null>(null);


  const hooksPerPage = 50;

  const socials = checkConnectedSocials();
 
  const uniqueCategories = useMemo(() => {
    const categories = new Set(allHooks.map(h => h.hook_category).filter(Boolean));
    return ['All', ...Array.from(categories).sort()];
  }, [allHooks]);

  const canProceedToGenerateHook = () => {
    return currentComposeContent.trim().length >= 50;
  };

  const getGenerateHookTooltip = () => {

   if (!connectedSocials || (!connectedSocials.bluesky && !connectedSocials.linkedin && !connectedSocials.twitter)) {
    // No social accounts connected,  show NoSocialModal
    
    return "⚡connect account"
    }
    else {
    
    if (currentComposeContent.trim().length < 50) {
      return "⚡activate AI with 50 chars";
    }
    return "⚡create a hook";
    }
  };

  
  const getGenerateCopyHookTooltip = () => {
     // Check for connected social accounts first
    const socials = checkConnectedSocials();
  
    if (!socials || (!socials.bluesky && !socials.linkedin && !socials.twitter)) {
    // No social accounts connected,  show NoSocialModal
    
    return "⚡add social account"
    }
    return "⚡copy template"
  }

  // NEW: Function to determine the tooltip for the "Copy Template" button
  const getCopyTemplateTooltip = () => {
    if (!connectedSocials || (!connectedSocials.bluesky && !connectedSocials.linkedin && !connectedSocials.twitter)) {
      return "⚡connect account";
    }
    return "⚡send to draft";
  };

  
  const fetchHooks = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('content_hooks')
        .select('id, hooks, example_hook, hook_category')
        .order('id')

      if (fetchError) {
        throw fetchError;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const fetchedHooks: HookItem[] = data
          .map(record => ({
            hooks: record.hooks,
            example_hook: record.example_hook,
            hook_category: record.hook_category,
          }))
          .filter(item => item.hooks && item.hooks.trim().length > 0);
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

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(hook => hook.hook_category === selectedCategory);
    }

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

    const totalFilteredHooksAfterFilters = filtered.length;
    const newTotalPages = Math.ceil(totalFilteredHooksAfterFilters / hooksPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    } else if (newTotalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }

  }, [allHooks, searchQuery, selectedCategory, currentPage, hooksPerPage]);

  useEffect(() => {
    // Fetch hooks when component mounts
    fetchHooks();
    setSearchQuery('');
    setCurrentPage(1);
    setUseHookSuccessIndex(null);
    setIsGeneratingKillerHook(null);
    setSelectedCategory('All');
  }, [fetchHooks]); // Only fetch on mount or if fetchHooks changes (unlikely)


  // NEW: Fetch connected social accounts on mount
  useEffect(() => {
    const fetchConnected = async () => {
      const socials = await checkConnectedSocials();
      setConnectedSocials(socials);
    };
    fetchConnected();
  }, []); // Run once on mount

  const handleCopyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccessMap(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => setCopySuccessMap(prev => ({ ...prev, [itemId]: false })), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  
  const handleUseHookClick = async(hookItem: HookItem, index: number) => {
    onUseHook(hookItem.hooks);
    setUseHookSuccessIndex(index);
    setTimeout(() => {
      setUseHookSuccessIndex(null);
      // No onClose() here as it's permanently open
    }, 500);
  };

  {/*
  const handleGenerateKillerHook = async (hookItem: HookItem, index: number) => {
    setIsGeneratingKillerHook(index);
    try {
      const revisedHook = await generateKillerHook(currentComposeContent, hookItem.hooks);

      if (revisedHook.error) {
        console.error('Error rewriting hook:', revisedHook.error);
      } else {
        onRewriteHook(revisedHook.text);
      }
    } catch (err: any) {
      console.error('Error generating killer hook:', err);
      setError('Failed to generate killer hook. ' + err.message);
    } finally {
      setIsGeneratingKillerHook(null);
    }
  };
*/}

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
      ? allHooks.filter(hook => hook.hooks.toLowerCase().includes(searchQuery.toLowerCase())).length
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

  const totalFilteredHooks = searchQuery.trim()
    ? allHooks.filter(hook => hook.hooks.toLowerCase().includes(searchQuery.toLowerCase())).length
    : allHooks.length;
  const totalPages = Math.ceil(totalFilteredHooks / hooksPerPage);

  // NEW: Determine if the "Copy Template" button should be disabled
  const isCopyTemplateDisabled = !connectedSocials || (!connectedSocials.bluesky && !connectedSocials.linkedin && !connectedSocials.twitter);


  return (
    // This div is now the main container for the HookIdeas component
    // Its width and height will be controlled by the parent (ComposePosts.tsx)
    <div
      //className="bg-gray-50 hover:bg-customGray-75 border-l border-gray-200 z-50 h-full break-words"
      className="bg-gray-50 hover:bg-customGray-75 rounded-lg z-50 h-full break-words"
    >
      <div className="p-4 h-full rounded-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 items-center bg-gray-200 rounded-full">
              <BookOpenText className="h-4 w-4 text-gray-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-500">Hook Templates ({totalFilteredHooks})</h3>
            
          </div>
          
          {/* No close button */}
        </div>
        <p className="text-gray-500 hover:text-gray-600 hover:bg-gray-200 font-normal text-sm mb-6 mt-2 rounded-md p-2 inline-block">
          Generate engagement and convert leads with 200 scroll stopping hooks from the top creators.
          </p>

        {/* Search Input */}
        <div className="relative mb-4 ">
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

        {/* Category Filter Dropdown */}
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
                  <BookOpenText className="w-12 h-12 font-light text-blue-500" />
                </div>
                <p className="text-gray-600 mb-3 mt-4">No hooks available 😔</p>
                <p className="text-gray-400 mb-4 text-sm">We're working to add more hooks . . .</p>
              </div>
            ) : (

            <div className="grid grid-cols-2 gap-2">
            {
              displayedHooks.map((hookItem, index) => (     
            
                /*<div key={index} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all relative">*/
      <div key={index} className="bg-white px-3 pt-3 pb-12 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all relative">
                  {hookItem.hook_category && (
                    <span className={`mb-3 relative text-sm top-2 px-1 py-2 font-semibold rounded-md
                    
                    ${hookItem.hook_category === 'Problem & Solutionx 💡' 
                      ? 'bg-gradient-to-r from-yellow-50 to-white text-yellow-600 ' 
                      : hookItem.hook_category === "'How-To' & Educationalx 🎓"
                      ? 'bg-gradient-to-r from-green-50 to-white text-green-800'   
                      : hookItem.hook_category === 'Attention & Intriguex 😲'
                      ? 'bg-gradient-to-r from-green-50 to-white text-green-600' 
                      : hookItem.hook_category === 'Audience-Specific & Targetedx 🎯'
                      ? 'bg-gradient-to-r from-red-50 to-white text-red-700' 
                      : hookItem.hook_category === 'Case Study & Frameworkx 🧪'
                      ? 'bg-gradient-to-r from-yellow-50 to-white text-yellow-800' 
                      : hookItem.hook_category === 'Controversial & Boldx 🥊'
                      ? 'bg-gradient-to-r from-red-50 to-white text-red-400' 
                      : hookItem.hook_category === 'List & Rankingx 📊'
                      ? 'bg-gradient-to-r from-purple-50 to-white text-purple-600' 
                      : hookItem.hook_category === 'Personal Story & Experiencex 🗣️'
                      ? 'bg-gradient-to-r from-green-50 to-white text-green-600' 
                      : hookItem.hook_category === 'Storytelling : New Realizationx 🤩'
                      ? 'bg-gradient-to-r from-blue-50 to-white text-blue-700' 
                      : hookItem.hook_category === "The 'Data & Evidence' Hookx 📈"
                      ? 'bg-gradient-to-r from-indigo-50 to-white text-indigo-600'                    
                      : 'bg-gradient-to-r from-gray-50 to-white text-gray-600'   
                    }`}>
                      {hookItem.hook_category}
                    </span>
                  )}
                  
                  <p className={`mt-5 bg-gray-50 p-1 text-xs font-normal rounded-md text-gray-600 overflow-wrap break-words
                   ${hookItem.hook_category === 'Problem & Solutionx 💡' 
                   ? 'hover:bg-gradient-to-r from-yellow-50 to-white hover:text-yellow-600 ' 
                   : hookItem.hook_category === "'How-To' & Educationalx 🎓"
                   ? 'hover:bg-gradient-to-r from-green-50 to-white hover:text-green-800'   
                   : hookItem.hook_category === 'Attention & Intriguex 😲'
                   ? 'hover:bg-gradient-to-r from-green-50 to-white hover:text-green-600' 
                   : hookItem.hook_category === 'Audience-Specific & Targetedx 🎯'
                   ? 'hover:bg-gradient-to-r from-red-50 to-white hover:text-red-700' 
                   : hookItem.hook_category === 'Case Study & Frameworkx 🧪'
                   ? 'hover:bg-gradient-to-r from-yellow-50 to-white hover:text-yellow-800' 
                   : hookItem.hook_category === 'Controversial & Boldx 🥊'
                   ? 'hover:bg-gradient-to-r from-red-50 to-white hover:text-red-400' 
                   : hookItem.hook_category === 'List & Rankingx 📊'
                   ? 'hover:bg-gradient-to-r from-purple-50 to-white hover:text-purple-600' 
                   : hookItem.hook_category === 'Personal Story & Experiencex 🗣️'
                   ? 'hover:bg-gradient-to-r from-green-50 to-white hover:text-green-600' 
                   : hookItem.hook_category === 'Storytelling : New Realizationx 🤩'
                   ? 'hover:bg-gradient-to-r from-blue-50 to-white hover:text-blue-700' 
                   : hookItem.hook_category === "The 'Data & Evidence' Hookx 📈"
                   ? 'hover:bg-gradient-to-r from-indigo-50 to-white hover:text-indigo-600'                    
                   : 'hover:bg-gradient-to-r from-blue-50 to-white hover:text-blue-500' 
                }`}>
                    
                    {hookItem.hooks}</p>

                  {hookItem.example_hook && (
                    <div className="mt-2 p-1 border-t border-gray-200">
                      <p className="text-xs text-gray-400 text-wrap break-words">{hookItem.example_hook}</p>
                    </div>
                  )}

                  <div className="absolute top-2 right-4 flex space-x-1">
                    
                        <button
                            onClick={() => handleCopyToClipboard(hookItem.hooks, hookItem.id)} // Assuming hookItem.id is unique
                            className="p-1 space-x-2 text-xs bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200 hover:text-gray-600 transition-colors flex items-center space-x-2"
                        >
                            {copySuccessMap[hookItem.id] ? ( // Use hookItem.id for map key
                                <span className="text-gray-600">Copied!</span>
                            ) : (
                          
                                <Copy className="w-3 h-3" />
                        
                            )}
                        </button>
                    
                  </div>
                  {/* <div className="flex justify-end mt-3 space-x-2 z-10">*/}
                <div className="absolute bottom-2 right-2 flex space-x-2 z-10">
                    <TooltipHelp text={getGenerateHookTooltip()}>
                      <button
                        onClick={() => handleGenerateKillerHook(hookItem, index)}
                        disabled={isGeneratingKillerHook === index || !canProceedToGenerateHook() || isCopyTemplateDisabled} // NEW: Use the disabled state}
                        className={`p-1.5 text-xs rounded-lg transition-colors flex items-center justify-center ${
                          isGeneratingKillerHook === index || !canProceedToGenerateHook() || isCopyTemplateDisabled
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

                     {/* NEW: Update disabled prop and TooltipHelp text */}
                    <TooltipHelp text={useHookSuccessIndex === index ? "Template Used!" : getCopyTemplateTooltip()}>
                      <button
                        onClick={() => handleUseHookClick(hookItem, index)}
                        disabled={isCopyTemplateDisabled} // NEW: Use the disabled state
                        className={`p-1.5 text-xs rounded-lg transition-colors flex items-center justify-center ${
                          useHookSuccessIndex === index
                            ? 'bg-green-500 text-white'
                            : isCopyTemplateDisabled // NEW: Apply disabled styling
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        {useHookSuccessIndex === index ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <>
                         <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                          <span>Copy Template</span>
                          </>
                        )}
                      </button>
                    </TooltipHelp>
                  </div>
                </div>
            
              ))

            } {/*added now*/}
            </div> 
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
