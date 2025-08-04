import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateCalendar, generateCalendarWithRetry, generateCampaignName, generateTargetAudience } from '../lib/gemini';
import { useAuthStore } from '../auth';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Calendar, Target, Goal, Package2, X, Loader2, PartyPopper } from 'lucide-react';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, Megaphone, CalendarPlus, CheckCircle, Sparkles } from 'lucide-react';
import { ShowCalendarContent } from './ShowCalendarContent';
import { CreateCalendarProgressModal } from './CreateCalendarProgressModal';
import { addDays } from 'date-fns';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';
import { CompanyInsightsResponse } from '../lib/firecrawl';

//import { useDebounce } from '/src/hooks/useDebounce';

interface FormData {
  //email: string;
  calendarName: string;
  calendarDescription: string;
  targetAudience: string;
  selectedGoals: string[];
  coreServices: string;
  startDate: Date | null; 
}

interface CreateCalendarFormProps {
  onSuccess: (campaignName: string) => void;
  email?: string;
  onClose?: () => void; // Add this prop
  // NEW: Optional props for website-generated insights
  webProblem?: string;
  webAudience?: string;
}

export function CreateCalendarForm({ onSuccess, email,userHandle,userDisplayName, onClose, webProblem, webAudience }: CreateCalendarFormProps) {
  //const { user } = useAuthStore();
    const { user } = useAuth();
   // Use props if available, fallback to auth store
  const finalUserHandle = userHandle || user?.handle;
  const finalUserDisplayName = userDisplayName || user?.displayName || user?.handle;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    userHandle: finalUserHandle || '',
    userDisplayName: finalUserDisplayName || '',
    calendarName: '',
    calendarDescription: '',
    targetAudience: '',
    selectedGoals: [],
    coreServices: '',
    startDate: new Date(), 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  //check for Name Component Uniqueness
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isNameUnique, setIsNameUnique] = useState(true);
  // In CreateCalendarForm, add state to track successful creation
const [isCalendarCreated, setIsCalendarCreated] = useState(false);
const [createdCalendarName, setCreatedCalendarName] = useState('');
const [showProgressModal, setShowProgressModal] = useState(false);

  const [calendarDays, setCalendarDays] = useState<number>(14); 
  const [productTier, setProductTier] = useState<string>('free');  
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isGeneratingAudience, setIsGeneratingAudience] = useState(false);
  const [isGeneratingBrand, setIsGeneratingBrand] = useState(false);
  const [isGeneratingCommunity, setIsGeneratingCommunity] = useState(false);
  

// Modify the success handler in CreateCalendarForm
const handleSuccess = (campaignName: string) => {
  setCreatedCalendarName(campaignName);
  setIsCalendarCreated(true);
  // Don't close the form yet
  // onClose(); // Remove this
};

  useEffect(() => {
    async function fetchAndSetUserPreferences() {
      if (!user?.email || !user?.id) {
        console.warn("User email or ID not found, skipping user preferences fetch.");
        setFormData(prev => ({
            ...prev,
            targetAudience: webAudience || '',
            coreServices: webProblem || '',
        }));
        return;
      }

      const { data: productTierDataFromDb, error: productTierError } = await supabase
        .from('user_preferences')
        .select('calendar_days, product_tier, target_audience, problem')
        .eq('email', user.email)
        .eq('user_id', user.id)
        .single();

      if (productTierError) {
        console.error("Error fetching user preferences:", productTierError);
      }

      setFormData(prev => ({
        ...prev,
        targetAudience: webAudience !== undefined ? webAudience : (productTierDataFromDb?.target_audience || ''),
        coreServices: webProblem !== undefined ? webProblem : (productTierDataFromDb?.problem || ''),
      }));

      if (productTierDataFromDb) {
        setCalendarDays(productTierDataFromDb.calendar_days || 14);
        setProductTier(productTierDataFromDb.product_tier || 'Standard');
      }
    }

    fetchAndSetUserPreferences();
  }, [user?.id, user?.email, webProblem, webAudience]);

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setCurrentUserEmail(session.user.email);
        } else {
          console.warn('No user email found in session.');
          setCurrentUserEmail(null);
        }
      } catch (error) {
        console.error('Error fetching user session:', error);
        setCurrentUserEmail(null);
      }
    };

    fetchUserEmail();
        // Optionally, you can set up a listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
      } else {
        setCurrentUserEmail(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []); // Fetch email on component mount and listen for auth changes


  // Add this new component within CreateCalendarForm
const DateSelector = ({ 
  selectedDate, 
  onDateChange,
  onSelectToday 
}: { 
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  onSelectToday: () => void;
}) => {
  // Format date value safely
  const dateValue = selectedDate 
    ? selectedDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-2">
      <label className="block text-left text-sm font-medium text-gray-700">Campaign Start Date</label>
      
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative text-sm">
            <input
              type="date"
              value={dateValue}
              onChange={(e) => {
                const newDate = e.target.value ? new Date(e.target.value) : new Date();
                onDateChange(newDate);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pl-10"
            />
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <TooltipHelp text="⚡Reset Start Date" className="mx-auto">
        <button
          type="button"
          onClick={onSelectToday}
          className="px-4 py-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Start Today</span>
        </button>
      </TooltipHelp>
      </div>
    </div>
  );
};

const calculateContentDate = (startDate: Date, dayIndex: number) => {
  const contentDate = new Date(startDate);
  contentDate.setDate(contentDate.getDate() + dayIndex - 1); // -1 because day indices start at 1
  return contentDate.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
};
  
    
  const socialGoals = [
    'Brand Awareness',
    'Build Community',
    'Generate Inbound Leads',
    'Build Credibility',
    'Grow Followers'
  ];

// Local useDebounce function
function useDebounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        func(...args);
        timeoutRef.current = null;
      }, delay);
    }, [func, delay]);
  }  

// Add this helper function at the top of CreateCalendarForm.tsx
function cleanAndParseJSON(text: string): any {
  try {
    // Remove markdown code block syntax if present
    const cleanedText = text
      .replace(/```json\n?/g, '') // Remove opening code block
      .replace(/```\n?/g, '') // Remove closing code block
      .replace(/\\\[/g, '[') // Convert escaped opening brackets to regular brackets
      .replace(/\\\]/g, ']') // Convert escaped closing brackets to regular brackets
      .replace(/\[\s+/g, '[') // Remove whitespace after opening bracket
      .replace(/\s+\]/g, ']') // Remove whitespace before closing bracket
      .trim();

    // Try to parse the cleaned text
    //console.log('cleanedText:', cleanedText)
    return JSON.parse(cleanedText);
  } catch (err) {
    console.error('JSON parsing error:', err);
    throw new Error('Invalid calendar data format');
  }
}

const checkCalendarName = useCallback(
  useDebounce(async (name: string) => {
   
    if (!name.trim() || !currentUserEmail) return; // Use the state variable
 
    setIsCheckingName(true);
  
    
    try {
      const { data, error } = await supabase
        .from('calendar_questions')
        .select('calendar_name')
        //.eq('email', session.user.email)  // Check against email instead of user_handle
        .eq('email', currentUserEmail)
        .eq('calendar_name', name)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      const exists = !!data;
      setIsNameUnique(!exists);
      setNameError(exists ? 'A campaign with this name already exists' : null);
    } catch (err) {
      console.error('Error checking calendar name:', err);
      setNameError('Error checking calendar name');
    } finally {
      setIsCheckingName(false);
    }
  }, 300),
  [currentUserEmail]  // Empty dependency array since we're getting email from auth session
);
  
const handleGenerateCalendarName = async (campaign_theme: string) => {
    setIsGeneratingName(true);
    setError(null); // Clear any previous errors

    if (!formData.targetAudience || !formData.coreServices) {
        setError('Please provide your Target Audience and Problems You Solve before generating a campaign name.');
        setIsGeneratingName(false);
        return;
    }

    try {
        const response = await generateCampaignName(
            formData.targetAudience,
            formData.coreServices, // This is the 'problem'
            campaign_theme
        );

        if (response.error) {
            throw new Error(response.error);
        }

        // --- Start of suggested change ---
      const decoder = new TextDecoder('utf-8');
      let utf8String;

       // Ensure response.text is treated as a string for encoding
      if (typeof response.text === 'string') {
        utf8String = decoder.decode(new TextEncoder().encode(response.text));
      } else {
        // Fallback for non-string types, though generateCampaignName should return string
        utf8String = decoder.decode(response.text);
      }

      // Use the cleanAndParseJSON function for robust parsing
      const generatedData = cleanAndParseJSON(utf8String);
      // --- End of suggested change ---

      if (Array.isArray(generatedData) && generatedData.length > 0) {
    setFormData(prev => ({
        ...prev,
        calendarName: generatedData[0].title || '', // Access the first element of the array
        calendarDescription: generatedData[0].description || '' // Access the first element of the array
    }));
} else {
    // Handle cases where the data might not be in the expected array format
    // This could happen if cleanAndParseJSON returns an empty array or something else
    console.error("Generated data is not in the expected array format:", generatedData);
    setError("Failed to parse campaign name/description. Unexpected data format.");
}

    } catch (err: any) {
        console.error('Error generating campaign name/description:', err);
        setError(`Failed to generate campaign name/description: ${err.message || 'Unknown error'}`);
    } finally {
        setIsGeneratingName(false);
    }
};  

// ----------- Start create target audience enhancement ---------- //
  
const handleGenerateTargetAudience = async () => {
   if (!formData.targetAudience.trim()) return; 
  
  try {
    setIsGeneratingAudience(true);
    
    // Get the theme and topic from the selected calendar content
    const improvedAudience = await generateTargetAudience(formData.targetAudience);

    if (!improvedAudience.error) {
       //setContent(improvedAudience.text);

     setFormData(prev => ({
            ...prev,
            targetAudience: improvedAudience.text || ''          
        }))
      
    } else {
      console.error('Error improving audience:', improvedAudience.error);
      // Optionally show an error message to the user
    }
  } catch (err) {
    console.error('Error generating content:', err);
  } finally {
    setIsGeneratingAudience(false);
  }
};
  
// ----------- Start create target audience enhancement ---------- //  
  
  const handleGoalToggle = (goal: string) => {
    setFormData(prev => {
      const currentGoals = prev.selectedGoals;
      if (currentGoals.includes(goal)) {
        return {
          ...prev,
          selectedGoals: currentGoals.filter(g => g !== goal)
        };
      }
      if (currentGoals.length >= 3) {
        return prev;
      }
      return {
        ...prev,
        selectedGoals: [...currentGoals, goal]
      };
    });
  };

const getWeekday = (date: Date): string => {
  // Ensure we have a valid date
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided to getWeekday');
  }

  // Use Intl.DateTimeFormat for consistent formatting
  // 'en-US' locale ensures English day names
  // 'long' format gives full day names (Monday instead of Mon)
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'long',
    timeZone: 'UTC' // Use UTC to avoid timezone issues
  }).format(date);
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

     if (step === 1) {
        // Check if name is unique before proceeding
          if (!isNameUnique || nameError) {
            setError('Please choose a unique name for your campaign');
            return;
          }
      }
    
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError(null);
    setShowProgressModal(true);

   




    // End defining userEmail and userId
    

    try {
         // Start defining userEmail and userId

          // Get current user's session to access email and id
          const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          throw new Error('No authenticated user found in session.');
          }

  const userEmail = session.user.email;
  const userId = session.user.id;

  if (!userEmail) {
    throw new Error('User email not found in session.');
  }

  if (!userId) {
    throw new Error('User ID not found in session.');
  }

  // Now you have both userEmail and userId available to use
  ////console.log('User Email:', userEmail);
  ////console.log('User ID:', userId);

// --- START OF END_DATE FIXES ---

      // 1. Validate formData.startDate: Ensure it's a valid date string before parsing.
      const parsedStartDate = new Date(formData.startDate);    
      if (isNaN(parsedStartDate.getTime())) {
          console.error('Validation Error: Invalid start date from form data:', formData.startDate);
          setError('Please select a valid start date for your campaign.');
          setShowProgressModal(false);
          setLoading(false);
          return; // Stop submission if start date is invalid
      }

      // 2. Ensure calendarDays is a valid number:
      const safeCalendarDays = typeof calendarDays === 'number' && !isNaN(calendarDays) && calendarDays >= 1
                               ? calendarDays
                               : 14; // Default to 14 days if invalid or less than 1

      // 3. Calculate endDate using the validated startDate and safeCalendarDays
      const calculatedEndDate = addDays(parsedStartDate, (safeCalendarDays - 1));

      // 4. Validate the calculated endDate before converting to ISO string
      if (isNaN(calculatedEndDate.getTime())) {
          console.error('Logic Error: Calculated end date is invalid. Check startDate and calendarDays logic.');
          setError('Failed to calculate a valid end date for your campaign. Please try again.');
          setShowProgressModal(false);
          setLoading(false);
          return; // Stop submission if calculated end date is invalid
      }

     // 5. Format the valid endDate to ISO string
      const formattedEndDate = calculatedEndDate.toISOString();

      // --- END OF END_DATE FIXES ---
      
  const startDate = new Date(formData.startDate);

  const endDate = addDays(startDate, (calendarDays-1));    
      
  //const formattedEndDate = endDate.toISOString();
      
      // Save questions and answers to Supabase
      const { data: calendarData, error: calendarError } = await supabase
        .from('calendar_questions')
        .insert({
          //user_display_name: formData.userDisplayName,
          //user_handle: formData.userHandle,
          email: userEmail,
          user_id: userId,
          calendar_name: formData.calendarName,
          calendar_description: formData.calendarDescription,
          target_audience: formData.targetAudience,
          social_goals: formData.selectedGoals,
          core_services: formData.coreServices,
          created_at: new Date().toISOString(),
          start_date: formData.startDate,
          end_date: formattedEndDate
        })
        .select()
        .single();

      if (calendarError) throw calendarError;

      // Generate calendar content using Gemini
      const calendarInfo = JSON.stringify({
        name: formData.calendarName,
        description: formData.calendarDescription,
        audience: formData.targetAudience,
        goals: formData.selectedGoals,
        services: formData.coreServices
      });

      //const startDOW = {start_date: formData.startDate};
      const startDayOfWeekName = new Date(formData.startDate).toLocaleDateString('en-GB', { weekday: 'long' });
      const DayofWeek = { start_date: startDayOfWeekName };
      
      //const DayofWeek = {start_date: new Date(formData.startDate).toLocaleDateString('en-GB',{weekday: 'long'})};

      //const generatedCalendar = await generateCalendar(calendarInfo, DayofWeek.start_date, calendarDays);

      const generatedCalendar = await generateCalendarWithRetry(calendarInfo, DayofWeek.start_date, calendarDays);

      if (generatedCalendar.error) throw new Error(generatedCalendar.error);

      //console.log('generated content:', generatedCalendar.text )

// Force UTF-8 encoding
        const decoder = new TextDecoder('utf-8');
        let utf8String;

        //Check if generatedCalendar.text is a string or a buffer.
        if(typeof generatedCalendar.text === 'string'){
             utf8String = decoder.decode(new TextEncoder().encode(generatedCalendar.text));
        } else {
             utf8String = decoder.decode(generatedCalendar.text);
        }


      
      // Parse the JSON response
      //const calendarGeminiResult = JSON.parse(utf8String);
      const calendarGeminiResult = cleanAndParseJSON(utf8String)

       // Validate the structure
      //if (!Array.isArray(calendarGeminiResult) || calendarGeminiResult.length !== 30) {
        //throw new Error('Invalid calendar data format');
      //}

      if (!Array.isArray(calendarGeminiResult) || calendarGeminiResult.length !== calendarDays) {
        throw new Error('Invalid calendar data format');
      }

      // Add this code before the database insertion:

      const updatedCalendarContent = calendarGeminiResult.map((day) => ({
      ...day
        }));


      // Save generated calendar to Supabase
     // Insert each day's content
    const { error: contentError } = await supabase
      .from('content_calendar')
      .insert(
        //calendarGeminiResult.map(day => ({
      updatedCalendarContent.map(day => ({
          email: userEmail,
          user_id: userId,
          calendar_name: formData.calendarName,
          description: formData.calendarDescription,
          user_display_name: formData.userDisplayName,
          user_handle: formData.userHandle,
          day: day.day,
          day_of_week: day.day_of_week,
          theme: day.theme,
          topic: day.topic,
          content: day.content,
          call_to_action: day.call_to_action,
          notes: day.notes,
          created_at: new Date().toISOString(),
          content_date: calculateContentDate(formData.startDate, day.day)
        }))
      );

      if (contentError) throw contentError;

      //onSuccess?.();
      // After successful content creation:
    
      // 1. First deactivate all existing calendars for this user
        const { error: deactivateError } = await supabase
          .from('calendar_questions')
          .update({ active: false })
          .eq('email', userEmail);

        if (deactivateError) throw deactivateError;

      // 2. Then activate the newly created calendar
        const { error: activateError } = await supabase
          .from('calendar_questions')
          .update({ active: true })
          .eq('calendar_name', formData.calendarName)
          //.eq('user_handle', formData.userHandle);
          .eq('email', userEmail);

        if (activateError) throw activateError;

    // If everything succeeds, turn off progress bar & call onSuccess

      setShowProgressModal(false);
      
      onSuccess(formData.calendarName);
    } catch (err) {
  console.error('Error creating calendar:', err);
  let errorMessage = 'Failed to create calendar. Please try again.';
  
  if (err.message.includes('Invalid calendar data format')) {
    errorMessage = 'The generated calendar data was not in the correct format. Please try again.';
  } else if (err.message.includes('JSON')) {
    errorMessage = 'There was an error processing the calendar data. Please try again.';
  }
  setShowProgressModal(false);
  setError(errorMessage);
} finally {
  setLoading(false);
}
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          //<div className="space-y-6">
          
          <div className="space-y-0 max-w-xl mx-auto">
            
            <div className="text-left">
              <div className="flex space-x-3 items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center space-x-2">Calendar Name</label>

                <TooltipExtended text="⚡ Auto-Generate a content campaign name and description">
                <button
                    type="button"
                    onClick={() => handleGenerateCalendarName("Growing My Social Media Followers")} // Call the new function
                    disabled={isGeneratingName || !formData.targetAudience || !formData.coreServices} // Disable when generating or missing data
                    className="p-1 space-x-1 text-center flex bg-blue-100 rounded-md items-center text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                    {isGeneratingName ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Sparkles className="w-3 h-3" />
                    )}
                  
                  {/*<p className="text-sm">click here </p>*/}
                  
                </button>
                
              </TooltipExtended>
      
              </div>
              

              {/*Start New Validated Calendar Name Check*/} 
              <div className="relative mb-3">
                <input
                  type="text"
                  value={formData.calendarName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData(prev => ({ ...prev, calendarName: newName }));
                    checkCalendarName(newName);
                  }}
                  className={`w-full text-sm px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      nameError ? 'border-red-300' : isNameUnique ? 'border-green-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter a name for your calendar"
                  required
                  />
                  {isCheckingName && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      </div>
                  )}
                </div>
                {nameError && (
                  <p className="mt-1 text-sm text-red-500">{nameError}</p>
                )}

              {/*End New Validated Calendar Name Check*/}
            </div>
            
            <div className="text-left">
              {/*<label className="block text-sm font-medium text-gray-700 mb-2">Calendar Description</label>*/}
              <div className="flex space-x-3 items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center space-x-2">Calendar Description</label>
              
              </div>
              
              <textarea
                value={formData.calendarDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, calendarDescription: e.target.value }))}
                className="mb-3 text-sm w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={1}
                placeholder="Describe the purpose of this content calendar"
                required
              />
            </div>

          {/* New date selector component */}
              <DateSelector
                selectedDate={formData.startDate}
                  onDateChange={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                  onSelectToday={() => setFormData(prev => ({ ...prev, startDate: new Date() }))}
              />

            
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 max-w-xl mx-auto h-full">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <span>Who is your ideal target audience?</span>
                  
                  <TooltipExtended text="⚡Generate additional insights about your target audience">
                <button
                    type="button"
                    onClick={handleGenerateTargetAudience} // Call the new function
                    //disabled={!isGeneratingName || !formData.targetAudience || !formData.coreServices} // Disable when generating or missing data
                    className="p-1 space-x-1 text-center flex bg-blue-100 rounded-md items-center text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                    {isGeneratingAudience ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <Sparkles className="w-3 h-3" />
                    )}
                  
                  {/*<p className="text-sm">click here </p>*/}
                  
                </button>
                
              </TooltipExtended>
                </div>

                
                
              </label>
              <textarea
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                className="w-full text-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={6}
                placeholder="Describe your target audience in detail..."
                required
              />
            </div>

            <div className="h-full">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                <div className="flex items-center space-x-2">
                  <Goal className="w-5 h-5 text-blue-500" />
                  <span>Select 3 social media goals that are most important to you</span>
                </div>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {socialGoals.map(goal => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => handleGoalToggle(goal)}
                    className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                      formData.selectedGoals.includes(goal)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={!formData.selectedGoals.includes(goal) && formData.selectedGoals.length >= 3}
                  >
                    <CheckCircle2 
                      className={`w-5 h-5 ${
                        formData.selectedGoals.includes(goal) ? 'text-blue-500' : 'text-gray-300'
                      }`} 
                    />
                    <span className="text-sm">{goal}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Selected: {formData.selectedGoals.length}/3
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 max-w-xl mx-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Package2 className="w-5 h-5 text-blue-500" />
                  <span>What core services or products do you offer, and what makes them stand out?</span>
                </div>
              </label>
              <textarea
                value={formData.coreServices}
                onChange={(e) => setFormData(prev => ({ ...prev, coreServices: e.target.value }))}
                className="w-full text-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Describe your core offerings and their unique value propositions..."
                required
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                  <h4 className="justify-center text-center font-medium text-gray-700 mb-2">Review Your Settings</h4>
                </div>
              <div className="space-y-2 text-sm text-gray-500">
                <p className="text-sm text-left"><strong>Calendar Name:</strong> {formData.calendarName}</p>
                <p className="text-sm text-left"><strong>Target Audience:</strong> {formData.targetAudience}</p>
                <p className="text-sm text-left"><strong>Selected Goals:</strong> {formData.selectedGoals.join(', ')}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (    
    <div className="w-full h-full mx-auto bg-white rounded-xl px-6 relative min-h-screen "> 
    
    <CreateCalendarProgressModal
      isOpen={showProgressModal}
      onClose={() => setShowProgressModal(false)}
      isLoading={loading}
      campaignName={formData.calendarName}
        />

      {/* Progress Indicator */}
      <div className="mb-8 max-w-xl mx-auto mt-12">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= stepNumber ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {stepNumber}
              </div>
              {stepNumber < 3 && (
                <div className={`w-24 h-1 ${
                  step > stepNumber ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">

          <TooltipExtended text="⚡Share a start date for your content calendar">
          <span className="text-xs text-gray-500">Basic Info</span>
          </TooltipExtended>

          
          <TooltipExtended text="⚡Learn more about your audience and set your goals">
            <span className="text-xs text-gray-500">Target & Goals</span>
          </TooltipExtended>

          <TooltipExtended text="⚡Review your answers and Generate your calendar">
            <span className="text-xs text-gray-500">Services & Review</span>
          </TooltipExtended>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {!isCalendarCreated ? (
      
        renderStep()

       ) : (
      
      <ShowCalendarContent
        calendarName={createdCalendarName}
        userEmail={currentUserEmail}
        onBackToList={() => {
          setIsCalendarCreated(false);
          onClose();
        }}
      />
       )}

        <div className="flex justify-between pt-6 max-w-xl mx-auto h-full">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
          )}
     

{step === 3 ? (
  <TooltipExtended text="⚡ Create 2 weeks of content that's ready to GO!">
    <button
      type="submit"
      disabled={loading || (step === 2 && formData.selectedGoals.length !== 3)}
      className="ml-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center space-x-2"
    >
      <span>{step === 3 ? 'Create Calendar' : 'Next'}</span>
    </button>
  </TooltipExtended>
) : (
//<TooltipExtended text="⚡ You're almost done! Let's review your answers">
  <button
    type="submit"
    disabled={loading || (step === 2 && formData.selectedGoals.length !== 3)}
    className="ml-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center space-x-2"
  >
    <span>{step === 3 ? 'Create Calendar' : 'Next'}</span>
  </button>
 // </TooltipExtended>
)}
        </div>
      </form>
     
    </div>
  );
}