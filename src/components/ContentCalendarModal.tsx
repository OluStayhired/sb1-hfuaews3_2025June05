import React, { useState } from 'react';
import { Calendar, Lightbulb, X, Sparkles, Copy, Loader2, PlusCircle } from 'lucide-react';
import { generateListPost, generateHookPost, generateHookPostV2, generateHookPostV3} from '../lib/gemini';
import { generateLinkedInHookPostV3 } from '../lib/geminiLinkedIn';
import { generateTwitterHookPostV3 } from '../lib/geminiTwitter';
import { generateBlueskyHookPostV3 } from '../lib/geminiBluesky';
import { useNavigate, Navigate } from 'react-router-dom';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { TooltipHelp } from '../utils/TooltipHelp';
import { TooltipExtended } from '../utils/TooltipExtended';
import { useHooks } from '/src/context/HooksContext';



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
  const { hooksData, isHooksLoading, hooksError } = useHooks();
  const [copySuccessMap, setCopySuccessMap] = useState<{ [key: string]: boolean }>({});
  const [rewritingItemId, setRewritingItemId] = useState<string | null>(null);
  const navigate = useNavigate();
  //const [hooksData, setHooksData] = useState<string[]>([]);
  //const [isHooksLoading, setIsHooksLoading] = useState(false); // New loading state for hooks
  //const [hooksError, setHooksError] = useState<string | null>(null); // New error state for hooks
  const [loadingCharLength, setLoadingCharLength] = useState<number | null>(null);
  const [loadingProcess, setLoadingProcess] = useState<string | null>(null); 

  const [loadingLinkedIn, setLoadingLinkedIn] = useState(false);

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

const handleHookPostV2 = async (item: ContentItem, char_length: string) => {

  //console.log('itemid: ', item.id)
  //console.log('char_length: ', char_length)

  const uniqueKey = `${item.id}_${char_length}`;
  setLoadingProcess(uniqueKey);

  //console.log('loadingProcess:  ', loadingProcess)
  //console.log('uniqueKey:  ', uniqueKey)
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const improvedContent = await generateHookPostV2(
      hooksData,
      item.theme,
      item.topic,
      item.target_audience || '', // Add target_audience to interface if not present
      item.content,
      char_length
    );

    //console.log('executing the Hook Posts Here')

    if (improvedContent.error) throw new Error(improvedContent.error)
      else {
        onRewriteContent(improvedContent.text);
      }

  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here
  } finally {
    //setRewritingItemId(null);
    //setLoadingCharLength(null);
    //setLoadingLinkedIn(false)
    setLoadingProcess(null);
  }
};    


const handleHookPostV3 = async (item: ContentItem, char_length: string) => {

  //console.log('itemid: ', item.id)
  //console.log('char_length: ', char_length)

  const uniqueKey = `${item.id}_${char_length}`;
  setLoadingProcess(uniqueKey);

  //console.log('loadingProcess:  ', loadingProcess)
  //console.log('uniqueKey:  ', uniqueKey)
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const improvedContent = await generateHookPostV3(
      //hooksData,
      item.theme,
      item.topic,
      item.target_audience || '', // Add target_audience to interface if not present
      item.content,
      char_length
    );

    //console.log('executing the Hook Posts Here')

    if (improvedContent.error) throw new Error(improvedContent.error)
      else {
        onRewriteContent(improvedContent.text);
      }

  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here
  } finally {
    setLoadingProcess(null);
  }
};   


const handleLinkedInHookPostV3 = async (item: ContentItem, char_length: string) => {

  const uniqueKey = `${item.id}_${char_length}`;
  setLoadingProcess(uniqueKey);

  //console.log('loadingProcess:  ', loadingProcess)
  //console.log('uniqueKey:  ', uniqueKey)
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    
  const improvedContent = await generateLinkedInHookPostV3(  
      //hooksData,
      item.theme,
      item.topic,
      item.target_audience || '', // Add target_audience to interface if not present
      item.content,
      char_length
    );

    if (improvedContent.error) throw new Error(improvedContent.error)
      else {
        onRewriteContent(improvedContent.text);
      }

  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here
  } finally {
    setLoadingProcess(null);
  }
};   


const handleTwitterHookPostV3 = async (item: ContentItem, char_length: string) => {

  const uniqueKey = `${item.id}_${char_length}`;
  setLoadingProcess(uniqueKey);

  //console.log('loadingProcess:  ', loadingProcess)
  //console.log('uniqueKey:  ', uniqueKey)
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    
  const improvedContent = await generateTwitterHookPostV3(  
      //hooksData,
      item.theme,
      item.topic,
      item.target_audience || '', // Add target_audience to interface if not present
      item.content,
      char_length
    );

    if (improvedContent.error) throw new Error(improvedContent.error)
      else {
        onRewriteContent(improvedContent.text);
      }

  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here
  } finally {
    setLoadingProcess(null);
  }
};    

const handleBlueskyHookPostV3 = async (item: ContentItem, char_length: string) => {

  const uniqueKey = `${item.id}_${char_length}`;
  setLoadingProcess(uniqueKey);

  //console.log('loadingProcess:  ', loadingProcess)
  //console.log('uniqueKey:  ', uniqueKey)
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    
  const improvedContent = await generateBlueskyHookPostV3(  
      //hooksData,
      item.theme,
      item.topic,
      item.target_audience || '', // Add target_audience to interface if not present
      item.content,
      char_length
    );

    if (improvedContent.error) throw new Error(improvedContent.error)
      else {
        onRewriteContent(improvedContent.text);
      }

  } catch (err) {
    console.error('Error improving content:', err);
    // Could add error state/toast here
  } finally {
    setLoadingProcess(null);
  }
};      
 

  const handleCreateCampaign = () => {
    navigate('/dashboard/campaign');
    onClose();
  };

  return (
    <div className="fixed top-0 right-0 h-screen overflow-y-auto w-2/5 bg-white shadow-lg border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
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

        <p className="text-gray-400 font-normal text-sm mb-6 mt-2 rounded-md bg-gray-50 p-2 inline-block">
          💡 Use ideas from active content campaigns to generate highly engaging posts. Click any of the social media button to enrich each idea and make it post-ready. 
          </p>

        <div className="space-y-6 flex-grow scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">

          {contentItems.length === 0 ? (
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
              <div key={item.id} className="space-y-4 p-2 rounded-md mb-6 pb-4 border-b border-gray-100 border last:border-b-0 hover:border hover:border-blue-100">
                <div className="flex p-2 items-center space-x-2 rounded-lg bg-gradient-to-r from-blue-50 to-white  rounded-lg">
                  
                      <Lightbulb className="h-3.5 w-3.5 text-blue-500" />
                  
                  <p className="text-sm font-medium text-gray-900">{item.theme || 'N/A'}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <p className="text-xs text-gray-900">{item.topic || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 p-2 rounded-md relative">

                      <div className="absolute top-0 right-0 pr-2 pt-2">
                        {/* Copy Button for individual content */}
                        <TooltipHelp  text = "Copy">
                            <button
                                onClick={() => handleCopyToClipboard(item.content, item.id)}
                                className="p-1 space-x-2 text-xs bg-blue-50 text-blue-300 rounded-lg hover:bg-blue-100 hover:text-blue-500 transition-colors flex items-center space-x-2"
                            >
                                {copySuccessMap[item.id] ? (
                                  <span className="text-green-500">Copied!</span>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                          
                                          </>
                                          )}
                                  </button>
                        </TooltipHelp>

                      </div>
                  <h3 className="text-sm font-medium text-blue-500">Post Idea 💡</h3>
                  <p className="text-xs text-gray-500">{truncatedContent(item.content || '', 150)}</p>
                </div>


                <div className="flex items-center justify-end mt-1 space-x-2 z-10000000"> 
                  
                  {/* Added space-x-2 for gap between buttons */}

                  

    {/*------------------- Start all the social media buttons --------------------*/}

            <TooltipHelp  text="⚡Rewrite for LinkedIn">
              <button
                
                onClick={() => {
                    //console.log('Clicked LinkedIn. item.id:', item.id, 'char_length:', '700');
                    handleLinkedInHookPostV3(item, '1000')}}
                disabled={loadingProcess === `${item.id}_1000`|| isHooksLoading || hooksError !== null}
               
                className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md"
              >
                
                {loadingProcess === `${item.id}_1000` ? (
                <>
                {
                
                }
                  <Loader2 className="w-3 h-3 animate-spin" />
                  
                </>  
                ) : (
              <>
                <img src={LinkedInLogo} className="w-3 h-3" />
                </>
                 )}
                <span className="text-xs">LinkedIn</span>
              </button>
             </TooltipHelp>


            <TooltipHelp  text = "⚡Rewrite for Bluesky">
              <button
                //onClick={() => handleHookPostV3(item, '300')}
                onClick={() => handleBlueskyHookPostV3(item, '300')}
                disabled={loadingProcess === `${item.id}_300`|| isHooksLoading || hooksError !== null} 
                className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md"
              >
                
                
                {loadingProcess === `${item.id}_300` ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  
                  </>
                ) : (

                <img src={BlueskyLogo} className="w-3 h-3" />
                
                 )}
                <span className="text-xs">Bluesky</span>
              </button>
             </TooltipHelp>

            <TooltipHelp  text = "⚡Rewrite for X">
              <button
                //onClick={() => handleHookPostV3(item, '280')}
                onClick={() =>handleTwitterHookPostV3(item, '280')}
                disabled={loadingProcess === `${item.id}_280`|| isHooksLoading || hooksError !== null}
                className="p-1 bg-gradient-to-r from-blue-50 to-white border border-blue-100 text-gray-900 hover:border-blue-300 transition-all group duration-200 flex items-center space-x-1 rounded-md"
              >
                
                {loadingProcess === `${item.id}_280` ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  
                  </>
                ) : (
                <img src={XLogo} className="w-3 h-3" />
                
                 )}
                <span className="text-xs">Twitter</span>
              </button>
             </TooltipHelp> 

            {/*------------------- End all the social media buttons ------------------------*/}

                  
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default ContentCalendarModal;