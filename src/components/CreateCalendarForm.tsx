import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { generateCalendar, generateCalendarWithRetry } from '../lib/gemini';
import { useAuthStore } from '../auth';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Calendar, Target, Goal, Package2, X, Loader2 } from 'lucide-react';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, Megaphone, CalendarPlus, CheckCircle } from 'lucide-react';
import { ShowCalendarContent } from './ShowCalendarContent';
import { CreateCalendarProgressModal } from './CreateCalendarProgressModal';
import { addDays } from 'date-fns';

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
  // Add user info from auth store
  email?: string;
  //userDisplayName?: string;
  onClose?: () => void; // Add this prop
}

export function CreateCalendarForm({ onSuccess, email,userHandle,userDisplayName, onClose }: CreateCalendarFormProps) {
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

// Modify the success handler in CreateCalendarForm
const handleSuccess = (campaignName: string) => {
  setCreatedCalendarName(campaignName);
  setIsCalendarCreated(true);
  // Don't close the form yet
  // onClose(); // Remove this
};

  useEffect(() => {
    async function fetchAndSetUserPreferences() {
 
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
      
      if (!userEmail || !userId) {
        return;
      }

      const { data: productTierDataFromDb, error: productTierError } = await supabase
        .from('user_preferences')
        .select('calendar_days, product_tier, target_audience, problem')
        .eq('email', userEmail)
        .eq('user_id', userId)
        .single();

      if (productTierError) {
        console.error("Error fetching user preferences:", productTierError);
        return;
      }

      if (productTierDataFromDb) {
        setFormData(prev => ({
          ...prev,
          targetAudience: productTierDataFromDb.target_audience || '',
          coreServices: productTierDataFromDb.problem || '',
        }));

        setCalendarDays(productTierDataFromDb.calendar_days || 14);
        setProductTier(productTierDataFromDb.product_tier || 'Standard');
      }
    }

    fetchAndSetUserPreferences();
  }, []);


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
          <div className="relative">
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
        
        <button
          type="button"
          onClick={onSelectToday}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Start Today</span>
        </button>
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
    console.log('cleanedText:', cleanedText)
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
    
    {/* == No Need To Set One-Off Session User Check for EMail in the component 
    try {
      // Get current user's session to access email
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        throw new Error('No authenticated user found');
      }
     */}
    
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
  console.log('User Email:', userEmail);
  console.log('User ID:', userId);

 //determine the calendar_days value 
// Retrieve the selected calendar from the user_preferences table
      {/*      
    const { data: productTier, error: productTierError } = await supabase
      .from('user_preferences')
      .select('calendar_days, product_tier')
      .eq('email', userEmail)
      .eq('user_id', userId)
      .single();

  const calendar_days = productTier.calendar_days;
      */}
      
  const startDate = new Date(formData.startDate);
      
  //const endDate = addDays(startDate, (30-1));

  const endDate = addDays(startDate, (calendarDays-1));    
      
  const formattedEndDate = endDate.toISOString();
      
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

      console.log('generated content:', generatedCalendar.text )

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
      {/*const updatedCalendarContent = calendarGeminiResult.map((day) => {
      const contentDate = new Date(calculateContentDate(formData.startDate, day.day));
        return {
          ...day,
          day_of_week: getWeekday(contentDate)
        };
      });*/}

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
          
          <div className="space-y-0">
            
            <div className="text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">Calendar Name</label>
             


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
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Calendar Description</label>
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
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <span>Who is your ideal target audience?</span>
                </div>
              </label>
              <textarea
                value={formData.targetAudience}
                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                className="w-full text-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Describe your target audience in detail..."
                required
              />
            </div>

            <div>
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
          <div className="space-y-6">
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
              <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                  <h4 className="text-left justify-center font-medium text-gray-700 mb-2">Review Your Settings</h4>
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
    <div className="max-w-2xl mx-auto bg-white rounded-xl p-6 relative">
          <button
          onClick={() => onClose?.()}
          className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          title="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
      </button>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-50 rounded-full p-2">
              <CalendarPlus className="w-6 h-6 text-blue-500" />
            </div>
        <h2 className="text-xl font-semibold">Create Campaign</h2>
      </div>

      {/* Add the close button 
      
        <button
          onClick={() => onClose?.()}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          title="Close"
        >
          <X className="w-5 h-5 text-gray-500" />
      </button>

      */}
      
  </div>
    
    <CreateCalendarProgressModal
      isOpen={showProgressModal}
      onClose={() => setShowProgressModal(false)}
      isLoading={loading}
      campaignName={formData.calendarName}
        />

      {/* Progress Indicator */}
      <div className="mb-8">
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
          <span className="text-xs text-gray-500">Basic Info</span>
          <span className="text-xs text-gray-500">Target & Goals</span>
          <span className="text-xs text-gray-500">Services & Review</span>
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

        <div className="flex justify-between pt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={loading || (step === 2 && formData.selectedGoals.length !== 3)}
            className="ml-auto px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center space-x-2"
          >
          
              <span>{step === 3 ? 'Create Calendar' : 'Next'}</span>
        
          </button>
        </div>
      </form>
     
    </div>
  );
}