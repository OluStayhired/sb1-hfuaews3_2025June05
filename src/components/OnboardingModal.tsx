// src/components/OnboardingModal.tsx
import React, { useState, useEffect } from 'react';
import { X, CheckCircle,CheckCircle2, Loader2, ArrowRight, Rocket, BellOff } from 'lucide-react'; // Import Loader2 and ArrowRight
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { TooltipHelp } from '../utils/TooltipHelp';
import { TooltipExtended } from '../utils/TooltipExtended';
import { UpgradePlanModal } from './UpgradePlanModal'
import { useProductTier } from '../hooks/useProductTierHook'

// Define the onboarding steps with a key that maps to internal progress states
const onboardingSteps = [
  { key: 'accountCreated', title: 'Add Account', description: 'Connect your first social media account to start scheduling posts.', path: '/dashboard/accounts' },
  { key: 'campaignCreated', title: 'Create Campaign', description: 'Create your first content campaign to generate ideas.', path: '/dashboard/campaign' },
  { key: 'campaignScheduled', title: 'Schedule Campaign', description: 'Schedule a post from your campaign to go live.', path: '/dashboard/calendars' },
  { key: 'postSent', title: 'Send Post', description: 'Send a scheduled post to your social media audience.', path: '/dashboard/schedule' },
  { key: 'fiveDayStreakAchieved', title: '5-Day Streak', description: 'Keep posting consistently to achieve your streak!', path: '/dashboard/userdashboard' },
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressStates, setProgressStates] = useState({
    accountCreated: false,
    campaignCreated: false,
    campaignScheduled: false,
    postSent: false,
    fiveDayStreakAchieved: false,
  });
  const navigate = useNavigate();

   // Check Limits Based on Product Tier
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCheckingLimits, setIsCheckingLimits] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

// function to determine email for use in the component
  const fetchUserIdAndEmail = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userEmail = session.user.email;
      const userId = session.user.id;
      setCurrentUserEmail(userEmail);
      setCurrentUserId(userId);
    } else {
      console.warn('No user found in session.');
      setCurrentUserEmail(null);
      setCurrentUserId(null);
    }
  } catch (error) {
    console.error('Error fetching user session:', error);
    setCurrentUserEmail(null);
    setCurrentUserId(null);
  }
};  

useEffect(() => {
  fetchUserIdAndEmail();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    fetchUserIdAndEmail();
  });

  return () => {
    subscription?.unsubscribe();
  };
}, []); 
  
  useEffect(() => {
    const fetchOnboardingProgress = async () => {
      if (!user?.email) {
        setIsLoading(false);
        setError('User email not found. Please log in.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const email = user.email;

        // --- Step 1: Check for Social Account Creation ---
        const { data: socialAccounts, error: socialAccountsError } = await supabase
          .from('social_channels')
          .select('id')
          .eq('email', email)
          .eq('activated', true);
        const isAccountCreated = !socialAccountsError && (socialAccounts?.length || 0) > 0;

        // --- Step 2: Check for Campaign Creation ---
        const { data: campaigns, error: campaignsError } = await supabase
          .from('calendar_questions')
          .select('calendar_name')
          .eq('email', email)
          .eq('deleted', false);
        const isCampaignCreated = !campaignsError && (campaigns?.length || 0) > 0;

        // --- Step 3: Check for Scheduled Campaign (any scheduled post) ---
        const { data: scheduledPosts, error: scheduledPostsError } = await supabase
          .from('user_post_schedule')
          .select('id')
          .eq('user_email', email)
          .eq('schedule_status', true);
        const isCampaignScheduled = !scheduledPostsError && (scheduledPosts?.length || 0) > 0;

        // --- Step 4: Check for Sent Scheduled Post (any sent post) ---
        const { data: sentPosts, error: sentPostsError } = await supabase
          .from('user_post_schedule')
          .select('id')
          .eq('user_email', email)
          .eq('sent_post', true);
        const isPostSent = !sentPostsError && (sentPosts?.length || 0) > 0;

        // --- Step 5: Check for 5-Day Streak (Simplified for self-containment) ---
        const isFiveDayStreakAchieved = !sentPostsError && (sentPosts?.length || 0) >= 5;


        setProgressStates({
          accountCreated: isAccountCreated,
          campaignCreated: isCampaignCreated,
          campaignScheduled: isCampaignScheduled,
          postSent: isPostSent,
          fiveDayStreakAchieved: isFiveDayStreakAchieved,
        });

      } catch (err: any) {
        console.error('Error fetching onboarding progress:', err);
        setError('Failed to load onboarding progress.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchOnboardingProgress();
    }
  }, [isOpen, user?.email]);

//------------------ Start Upgrade Modal and Limits Checks Here --------------------------//
//========================================================================================//  
  
//---- NEW Hook to Capture all Account Type Paramenters -----//
    const {
    isLoading: isProductLoading, //changed from isLoading
    error: errorProduct, //changed from error
    userPreferences,
    productTierDetails,
    isFreePlan,
    isEarlyAdopter, // New variable
    isTrialUser,
    isPaidPlan,
    canCreateMoreCampaigns,
    canAddMoreSocialAccounts,
    isTrialExpiringSoon,
    daysUntilTrialExpires,
    showFirstTrialWarning,
    showSecondTrialWarning,
    showFinalTrialWarning,
    max_calendar,
    max_social_accounts,
    remainingCampaigns,
    remainingSocialAccounts,
  } = useProductTier(supabase, currentUserEmail);  
  

// Define specific limits
const MAX_FREE_CAMPAIGNS = max_calendar;
const MAX_FREE_ACCOUNTS = max_social_accounts;
const FREE_TRIAL_DAYS =   daysUntilTrialExpires
type ActionType = 'createCampaign' | 'addAccount' | 'freeTrialEnded';


//----------- Start Check Limits Function -------------------- //
// This refined function checks limits specific to the requested action

  const checkActionLimits = async (action: ActionType): Promise<boolean> => {
    setIsCheckingLimits(true);
    setUserMessage('');
    setModalMessage(''); // Clear previous modal message
    setIsUpgradeModalOpen(false);

    //console.log(`[checkActionLimits] Action requested: ${action}`);

    try {
        const { data: userPreferences, error: supabaseError } = await supabase
            .from('user_preferences')
            .select('account_type, total_campaign, social_accounts, user_tenure') // <-- SELECTING 'total_campaign' and 'social_accounts'
            .eq('user_id', currentUserId)
            .single();

        if (supabaseError || !userPreferences) {
            console.error("[checkActionLimits] Error fetching user preferences:", supabaseError?.message || "No data returned.");
            setUserMessage('Could not retrieve account details. Please try again.');
            return false;
        }
        const limitedAccountTypes = ['Free Plan', 'Early Adopter']; // Define the types that have this limit
         switch (action) {
            case 'createCampaign':
            // Correct variable name for campaign-related checks
              const isLimitedCampaignAccountType = limitedAccountTypes.includes(userPreferences.account_type);
              const hasExceededCampaigns = remainingCampaigns <= 0 ;       
              if (isLimitedCampaignAccountType && hasExceededCampaigns) {
        setModalMessage(`You have reached your limit of ${MAX_FREE_CAMPAIGNS} campaigns for your ${userPreferences.account_type} plan. Upgrade to create more!`);
        setIsUpgradeModalOpen(true);
        //console.log("[checkActionLimits] Limit exceeded for createCampaign. Returning false.");
        return false;
      }
      break;
          case 'addAccount':
            // Correct variable name for addAccount-related checks
            const isLimitedAccountAccountType = limitedAccountTypes.includes(userPreferences.account_type);
            const hasExceededAccounts = (userPreferences.social_accounts || 0) >= MAX_FREE_ACCOUNTS;
              if (isLimitedAccountAccountType && hasExceededAccounts) {
                setModalMessage(`You have reached your limit of ${MAX_FREE_ACCOUNTS} connected accounts for your ${userPreferences.account_type}. Upgrade to connect more!`);
                setIsUpgradeModalOpen(true);

                //console.log("[checkActionLimits] Limit exceeded for addAccount. Returning false.");

              return false;

            }
      break;
            case 'freeTrialEnded':
              // Correct variable name for addAccount-related checks
              const isLimitedFreeTrialAccountType = limitedAccountTypes.includes(userPreferences.account_type);
              if (isLimitedFreeTrialAccountType && (daysUntilTrialExpires <= 0)) {
                  
                setModalMessage(`Your Free Trial on SoSavvy has ended for your ${userPreferences.account_type}. Upgrade your account to Pro Plan to continue creating posts!`);
                setIsUpgradeModalOpen(true);
                //console.log("[checkActionLimits] Limit exceeded for freeTrials. Returning false.");
          
                return false;
              }
        break;             
        
        default:
                console.warn(`[checkActionLimits] Unknown action type for limit check: ${action}`);
                return false; // Or throw error
        }

        return true;

    } catch (e: any) {
        console.error("[checkActionLimits] Unhandled error during limit check:", e.message);
        setUserMessage('An unexpected error occurred during limit check. Please try again.');
        return false;
    } finally {
        setIsCheckingLimits(false);
    }
};

//------------- End Check Limits Function -------------------- //  
  
 // handle UpgradeModal Open
  const handleOpenUpgradeModal = () => {
    setIsUpgradeModalOpen(true);
  };

  // Function to close the modal
  const handleCloseUpgradeModal = () => {
    setIsUpgradeModalOpen(false);
  };

//------------------ End Upgrade Modal and Limits Checks Here --------------------------//
//========================================================================================//

const handleOpenActiveStep = async () => {
       //----------- Start Checking Limits Here --------------// 
     if (isLoading || isCheckingLimits) {
          return; // Already busy with something
        }

      //console.log("Starting limit check...");
      const canProceed =  await checkActionLimits('freeTrialEnded');

      if (!canProceed) {
            //setIsUpgradeModalOpen(true);
            //console.log("Limit check failed. Modal should be open. Returning.");

            return; // This return is crucial and should prevent anything below from running
            
        } else {

        //console.log("Limit check passed. Proceeding with campaign creation logic.");
        setUserMessage('');
        navigate(activeStep.path);
      }
       
       //-------------- End Checking Limits Here --------------- //
      
    }  

  const completedCount = Object.values(progressStates).filter(Boolean).length;
  const totalSteps = onboardingSteps.length;
  const activeStepIndex = onboardingSteps.findIndex(step => !progressStates[step.key]);
  const activeStep = activeStepIndex !== -1 ? onboardingSteps[activeStepIndex] : null;


   // NEW: handleCloseOnboardingForever function
  const handleCloseOnboardingForever = async () => {
    if (!currentUserId) {
      console.error('User ID not available. Cannot update onboarding status.');
      setError('User not identified. Please log in again.');
      return;
    }

    try {
      setIsLoading(true); // Show loading state for the button
      setError(null); // Clear any previous errors

      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({
          on_boarding_active: false, // Set the column to FALSE
          updated_at: new Date().toISOString(), // Update timestamp
        })
        .eq('user_id', currentUserId); // Target the current user

      if (updateError) {
        console.error('Error updating on_boarding_active:', updateError);
        setError('Failed to dismiss onboarding. Please try again.');
      } else {
        //console.log(`Onboarding dismissed forever for user: ${currentUserId}`);
        // Close the modal after successful update
        onClose();
      }
    } catch (err: any) {
      console.error('Unhandled error in handleCloseOnboardingForever:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 relative shadow-lg">
        {/* Header */}
        <div className=" space-x-2 flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Onboarding Progress</h2>
               <button
                //onClick={onClose} // Assuming onClose handles both closing and dismissing
                 onClick={handleCloseOnboardingForever}
                className="flex justify-center items-center text-xs bg-gray-50 text-gray-500 hover:bg-gray-100 font py-2 px-4 rounded-md"
                >
                 <BellOff className="mr-2 w-3 h-3 text-gray-500"/>
                   
              Dismiss Onboarding
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="mt-4 text-gray-600">Loading your progress...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        ) : (
          <>
            {/* Horizontal Progress Bar */}
            <div className="flex items-center justify-between mb-8 px-4">
              {onboardingSteps.map((step, index) => {
                const isCompleted = progressStates[step.key];
                const isActive = index === activeStepIndex;

                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center flex-shrink-0">
                      {/* Step Circle */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 transition-colors duration-300
                          ${isCompleted ? 'bg-green-100' : isActive ? 'border-8 border-blue-100 bg-blue-500 shadow-lg shadow-color-blue' : 'bg-gray-300'}`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-green-700" />
                        ) : (
                        <p className={`font-medium text-center whitespace-nowrap transition-colors duration-300
                        ${isCompleted ? 'text-green-700' : isActive ? 'text-white' : 'text-white'}`}
                      >
                             {index + 1 }
                        </p>
                        
                        )}
                      </div>
                      {/* Step Label */}
                      <p className={`mt-2 text-xs font-medium text-center whitespace-nowrap transition-colors duration-300
                        ${isCompleted ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-gray-500'}`}
                      >
                        {step.title}
                      </p>
                    </div>
                    {/* Connecting Line */}
                    {index < onboardingSteps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 transition-colors duration-300
                          ${isCompleted ? 'bg-green-500' : (isActive || index < activeStepIndex) ? 'bg-blue-500' : 'bg-gray-300'}`}
                      ></div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Current Step Details & CTA */}
            {activeStep && (
            <div className="text-center items-center space-y-4 p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-lg hover:border-blue-300 transition-all group shadow-sm">

              {/*<div className="text-center items-center space-y-4 p-4">*/}
                  <h3 className="text-2xl font-bold text-blue-800">{activeStep.title} 🎉</h3>
                <p className="text-gray-600 text-lg">
                  {activeStep.description}
                </p>
                
                {/* CTA Button */}
                <button
                  onClick={handleOpenActiveStep}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg transform hover:scale-105"
                >
                  <span>Go to {activeStep.title}</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            )}

            {/* All Steps Completed Message */}
            {completedCount === totalSteps && (
              <div className="text-center space-y-4 p-4 bg-green-50 rounded-lg border border-green-100 shadow-sm">
                <h3 className="text-2xl font-bold text-green-800">Congratulations!</h3>
                <p className="text-green-700 text-lg">You've completed all onboarding steps. You're all set!</p>
                <button
                  onClick={onClose}
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg transform hover:scale-105"
                >
                  <span>Start Using SoSavvy</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            )}        

            {/* Progress Summary */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                You've completed {completedCount} of {totalSteps} steps.
              </p>
            </div>
          </>
        )}
      </div>

       <UpgradePlanModal 
        isOpen={isUpgradeModalOpen} 
        onClose={handleCloseUpgradeModal} 
        message={modalMessage} 
      />
    </div>
  );
}
