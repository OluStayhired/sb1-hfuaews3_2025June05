// src/pages/SettingsPage.tsx (Renamed file)
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
// Removed X import as it's no longer needed for closing
import { Save, Settings, User, Globe, Target, AlertCircle, CreditCard, Puzzle, Loader2, PlusCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext'; // Import useAuth to get the current user
import { TooltipHelp } from '../utils/TooltipHelp';
import { TooltipExtended } from '../utils/TooltipExtended';
import { format } from 'date-fns';
import { useProductTier } from '../hooks/useProductTierHook';

// Define interfaces for subscription details
    interface UserSubscriptionDetails {
      id: string;
      status: string;
      current_period_start: number; // Unix timestamp
      current_period_end: number;   // Unix timestamp
      price_id: string;
      price_unit_amount: number;
      price_currency: string;
      price_interval: string;
      cancel_at_period_end: boolean;
    }


// Define interfaces for Stripe price details
interface StripePriceDetails {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string; interval_count: number } | null;
  nickname: string | null;
}

// import { useNavigate } from 'react-router-dom'; // Example if using react-router-dom

interface UserPreferences {
  email: string;
  timezone: string;
  target_audience: string | null;
  problems: string | null;
  company_website: string | null;
  account_type: string | null;
  user_tenure: string | null;
}

// Renamed the component from SettingsModal to SettingsPage
export function SettingsPage() {
  // const navigate = useNavigate(); // Initialize navigate if you need to redirect programmatically

  const { user } = useAuth();

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    email: '',
    timezone: '',
    target_audience: '',
    old_target_audience: '', // Add a state to store original value for comparison if needed
    problems: '',
    company_website: '',
    account_type: '',
    user_tenure: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  // NEW: State for Stripe price details
  const [monthlyPriceDetails, setMonthlyPriceDetails] = useState<StripePriceDetails | null>(null);
  const [yearlyPriceDetails, setYearlyPriceDetails] = useState<StripePriceDetails | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);

   // NEW: State for user's active subscription details
  const [userSubscription, setUserSubscription] = useState<UserSubscriptionDetails | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  
  const navigate = useNavigate();
   // Access the authenticated user


// NEW: Environment variable for the customer portal session Edge Function URL
  const VITE_CUSTOMER_PORTAL_SESSION_URL = import.meta.env.VITE_CUSTOMER_PORTAL_SESSION_URL;
  const VITE_GET_STRIPE_PRICES_URL = import.meta.env.VITE_GET_STRIPE_PRICES_URL;
  const VITE_GET_USER_SUBSCRIPTION_DETAILS_URL = import.meta.env.VITE_GET_USER_SUBSCRIPTION_DETAILS_URL;

   const handleUpgradePlan = () => {
    navigate('/dashboard/pricing');
  };


// --- START FIX ---
// Call fetchUserIdAndEmail when the component mounts or when the `user` object from AuthContext changes
  useEffect(() => {
    const fetchUserAndSetState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUserEmail(session.user.email);
          setCurrentUserId(session.user.id);
        } else {
          console.warn('No user found in session for SettingsPage.');
          setCurrentUserEmail(null);
          setCurrentUserId(null);
        }
      } catch (error) {
        console.error('Error fetching user session in SettingsPage:', error);
        setCurrentUserEmail(null);
        setCurrentUserId(null);
      }
    };

    fetchUserAndSetState();
  }, [user]); // Add 'user' as a dependency so it re-runs if the auth state changes
// --- END FIX ---
  

//---- NEW Hook to Capture all Account Type Paramenters -----//
    const {
    isLoading: isProductLoading, //changed from isLoading
    error: errorProduct, //changed from error
    //userPreferences,
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
    //on_boarding_active,
    max_calendar,
    max_social_accounts,
    remainingCampaigns,
    remainingSocialAccounts,
  } = useProductTier(supabase, currentUserEmail);  


  const free_user_days = daysUntilTrialExpires;
  
  // Removed isOpen prop and its effect dependency
  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user's session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) {
          // If no authenticated user, you might want to redirect to login
          // navigate('/login'); // Example redirection
          throw new Error('No authenticated user found');
        }

        // Fetch user preferences
        const { data, error: fetchError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
          throw fetchError;
        }

        if (data) {
          setUserPreferences({
            email: data.email || session.user.email,
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            target_audience: data.target_audience || '',
            problem: data.problem || '',
            company_website: data.company_website || '',
            account_type: data.account_type || '',
            user_tenure: data.user_tenure || '',
          });
        } else {
          // No preferences found, use defaults
          setUserPreferences({
            email: session.user.email,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            target_audience: '',
            problem: '',
            company_website: '',
            account_type: 'Free Plan',
          });
        }
      } catch (err: any) {
        console.error('Error fetching user preferences:', err.message);
        setError(`Failed to load user preferences: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    // Removed isOpen from dependency array; runs once on mount
    fetchUserPreferences();
  }, []); // Empty dependency array means it runs once on mount


  // NEW: Fetch Stripe price details only for Pro Plan users
useEffect(() => {
  const fetchStripePrices = async () => {
    // --- NEW CONDITION ADDED HERE ---
    // Only proceed if userPreferences exists and account_type is 'Pro Plan'
    {/* if (!userPreferences || userPreferences.account_type !== 'Pro Plan') {
      console.log('Not fetching Stripe prices: User is not on a "Pro Plan".');
      setMonthlyPriceDetails(null); // Clear previous price details if condition not met
      setYearlyPriceDetails(null);
      setPriceLoading(false);
      setPriceError(null); // Clear any previous errors
      return; // Exit early if the condition is not met
    }
    // --- END NEW CONDITION ---
    */}

    if (!VITE_GET_STRIPE_PRICES_URL) {
      setPriceError('Stripe prices URL is not configured.');
      setPriceLoading(false);
      return;
    }

    try {
      setPriceLoading(true);
      setPriceError(null);

      const response = await fetch(VITE_GET_STRIPE_PRICES_URL);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prices.');
      }

      const { prices } = await response.json();
      const monthly = prices.find((p: StripePriceDetails) => p.recurring?.interval === 'month');
      const yearly = prices.find((p: StripePriceDetails) => p.recurring?.interval === 'year');

      setMonthlyPriceDetails(monthly || null);
      setYearlyPriceDetails(yearly || null);

    } catch (err: any) {
      console.error('Error fetching Stripe prices:', err);
      setPriceError(err.message || 'Failed to load pricing details.');
    } finally {
      setPriceLoading(false);
    }
  };

  fetchStripePrices();
}, [VITE_GET_STRIPE_PRICES_URL, userPreferences]); 


  // NEW: Fetch user's subscription details
      useEffect(() => {
        const fetchSubscriptionDetails = async () => {
          if (!user?.id) { // Only fetch if user is logged in
            setSubscriptionLoading(false);
            return;
          }

// Only proceed if userPreferences exists and account_type is 'Pro Plan'
    if (!userPreferences || userPreferences.account_type !== 'Pro Plan') {
      //console.log('Not fetching Stripe prices: User is not on a "Pro Plan".');
      setUserSubscription(null); // Clear previous price details if condition not met
      setSubscriptionLoading(false);
      setSubscriptionError(null); // Clear any previous errors
      return; // Exit early if the condition is not met
    }
          
          if (!VITE_GET_USER_SUBSCRIPTION_DETAILS_URL) {
            setSubscriptionError('Subscription details URL is not configured.');
            setSubscriptionLoading(false);
            return;
          }

          try {
            setSubscriptionLoading(true);
            setSubscriptionError(null);

            const response = await fetch(VITE_GET_USER_SUBSCRIPTION_DETAILS_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ user_id: user.id }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to fetch subscription details.');
            }

            const { subscription } = await response.json();
            setUserSubscription(subscription || null);

          } catch (err: any) {
            console.error('Error fetching subscription details:', err);
            setSubscriptionError(err.message || 'Failed to load subscription details.');
          } finally {
            setSubscriptionLoading(false);
          }
        };

        fetchSubscriptionDetails();
      }, [user?.id, VITE_GET_USER_SUBSCRIPTION_DETAILS_URL, userPreferences]);
  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserPreferences(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email || !session?.user?.id) {
        throw new Error('No authenticated user found');
      }

      // Update user preferences
      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          email: session.user.email,
          user_id: session.user.id,
          target_audience: userPreferences.target_audience,
          problem: userPreferences.problem,
          company_website: userPreferences.company_website,
          account_type: userPreferences.account_type,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'email'
        });

      if (upsertError) throw upsertError;

      setSuccessMessage('Settings saved successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

    } catch (err: any) {
      console.error('Error saving user preferences:', err.message);
      setError(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

// NEW: handleManageStripeSubscription function
  const handleManageStripeSubscription = async () => {
    if (!user?.id) { // Ensure user is logged in and has an ID
      setError('User not authenticated. Cannot manage subscription.');
      return;
    }
    if (!VITE_CUSTOMER_PORTAL_SESSION_URL) {
      setError('Stripe Customer Portal URL is not configured. Please contact support.');
      return;
    }

    setIsSaving(true); // Set loading state for the button
    setError(null); // Clear previous errors

    try {
      const response = await fetch(VITE_CUSTOMER_PORTAL_SESSION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id, // Pass the authenticated user's ID
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer portal session.');
      }

      const { url } = await response.json();
      if (url) {
        // Redirect the user to the Stripe Customer Portal
        window.location.href = url;
      } else {
        throw new Error('Stripe Customer Portal URL not received.');
      }
    } catch (err: any) {
      console.error('Error creating customer portal session:', err);
      setError(err.message || 'An unexpected error occurred while trying to manage your subscription.');
    } finally {
      setIsSaving(false); // Clear loading state
    }
  };
  
  // Removed the modal overlay and fixed positioning
  // This div now represents the main content area of your page
  return (
    <div className="w-full mx-auto">
      <div className="bg-white w-full mx-auto p-4">
        <div className="flex items-center space-x-2 mb-8"> 
            <div className="p-2 bg-blue-50 rounded-md"> 
               <Settings className="w-5 h-5 text-blue-500"/> 
            </div>
        
              <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
        </div>
      

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
      
            {/* User Information Section */}
        <div className="max-w-4xl mx-auto p-2 md:p-4">
              <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-500" />
                Account
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={userPreferences.email}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300  rounded-md text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Your account email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={userPreferences.timezone}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Change timezone in the Calendar view</p>
                </div>
              </div>
            </div>


           {/* Billing Section - Enhanced */}
<div className="max-w-4xl mx-auto p-2 md:p-4">
    <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
        <CreditCard className="w-5 h-5 mr-2 text-blue-500 " />
        Billing
    </h3>

    {/* Main content box with gradient border */}
    <div className="p-4 flex flex-col bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-lg hover:border-blue-300 transition-all group">

        {/* TOP ROW: Account Type/Features (left) and Button (right) */}
        <div className="flex items-start justify-between w-full">
            {/* Left side (top): Account Type and Plan Features */}
            <div className="pr-4"> {/* Added pr-4 for spacing from the button */}
                <span className="p-2 text-blue-600 bg-blue-100 rounded-lg font-bold">{userPreferences.account_type} 🚀</span>

              {userPreferences.account_type === "Free Plan" && 
                 <span className="p-2 ml-4 font-semibold text-sm bg-red-500 text-white rounded-lg animate-pulse">{daysUntilTrialExpires} Trial Days Left </span>}
                  
                <p className="text-sm text-gray-500 mt-2">
                    {userPreferences.account_type === "Pro Plan" && <><br/><strong>Full Premium Features</strong> | 20 Campaigns | 8 Social Accounts | Unlimited AI Rewrites 🔥 </>}
                    {userPreferences.account_type === "Free Plan" && <><br/> <strong>Get Pro Plan</strong> | 20 Campaigns | 8 Social Accounts | Unlimited AI Rewrites 👉 </>}
                    {userPreferences.account_type === "Early Adopter" && <><br/> <strong> Get Pro Plan</strong> | 20 Campaigns | 8 Social Accounts | Unlimited AI Rewrites 👉 </>}
                    {!["Pro Plan", "Free Plan", "Early Adopter"].includes(userPreferences.account_type) && "Unknown Plan Features"}
                </p>
            </div>

            {/* Right side (top): Button */}
            <span className="text-sm text-gray-500 flex-shrink-0"> {/* flex-shrink-0 prevents button from being squashed */}
                {userPreferences.account_type === "Pro Plan" ? (
                    <TooltipExtended text="⚡Download Receipts, Update Payment or Cancel Subscription">
                        <button
                            onClick={handleManageStripeSubscription}
                            disabled={isSaving}
                            className="px-4 py-2 items-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex space-x-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Manage Subscription</span>
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-4 h-4 mr-2 text-white"/>
                                    Manage Subscription
                                </>
                            )}
                        </button>
                    </TooltipExtended>
                ) : (
                    <TooltipExtended text="⚡Learn more about the Pro Plan. Get Started for $25/mo">
                        <button
                            onClick={handleUpgradePlan}
                            disabled={isSaving}
                            className="px-4 py-2 items-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex space-x-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Loading...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-1 text-white"/>
                                    Upgrade Plan
                                </>
                            )}
                        </button>
                    </TooltipExtended>
                )}
            </span>

          
        </div>

        {/* BOTTOM ROW: Price Display Section (aligned left, below top content) */}

        {/* ------------- Start Add specific information about subscription from Stripe --------------- */}

 {/* NEW: Display fetched Stripe prices and subscription details */}
      <span className="mt-4 text-blue-500 text-sm">Current Subscription</span>
                    {subscriptionLoading ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : subscriptionError ? (
                      <span className="text-red-500 text-xs">{subscriptionError}</span>
                    ) : userSubscription ? (
                      <div className=" text-sm text-gray-500 text-left">
                        {/*<span className="text-blue-500 text-sm">Current Subscription</span>*/}
                        <p>
                          Status: <span className="font-semibold capitalize">{userSubscription.status}</span>
                        </p>
                        <p>
                          Plan: <span className="font-semibold">
                            ${(userSubscription.price_unit_amount / 100).toFixed(2)}/{userSubscription.price_interval}
                          </span>
                        </p>
                        <p>
                          Next Renewal:{' '}
                          <span className="font-semibold">
                            {format(new Date(userSubscription.current_period_end * 1000), 'MMM d, yyyy')}
                          </span>
                        </p>
                        {userSubscription.cancel_at_period_end && (
                          <p className="text-red-500 text-xs">Cancels at period end</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No active subscription.</span>
                    )}


      {/*--------------- Send Add specific information about subscription from Stripe -------------------*/}

      
        {/* Only render this div if there's actual price content to show */}
        {(priceLoading || priceError || monthlyPriceDetails || yearlyPriceDetails) && (
            <div className="mt-4 w-full"> {/* mt-4 for vertical space, w-full ensures it spans across */}

              <span className="text-blue-500 text-sm">Yearly & Monthly Prices</span>
              
                <span>
                    {priceLoading ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : priceError ? (
                        <span className="text-red-500 text-xs">{priceError}</span>
                    ) : (
                        <div className="text-sm text-gray-500 text-left"> {/* Explicitly text-left */}
                            {monthlyPriceDetails && (
                                <p>
                                    
                                    <span className="font-semibold">
                                        ${(monthlyPriceDetails.unit_amount / 100).toFixed(0)}/{monthlyPriceDetails.recurring?.interval} 
                                      <span className="font-normal"> per user</span>
                                    </span>
                                </p>
                            )}
                            {yearlyPriceDetails && (
                                <p>
                                   
                                    <span className="font-semibold">
                                        ${(yearlyPriceDetails.unit_amount / 100).toFixed(0)}/{yearlyPriceDetails.recurring?.interval}  
                                      <span className="font-normal"> per user</span>
                                    </span>
                                </p>
                            )}
                        </div>
                    )}
                </span>
            </div>
        )}
    </div>
</div> 
            

            {/* Target Audience Section */}
            <div className="max-w-4xl mx-auto p-2 md:p-4">
              <h3 className="text-md font-medium text-gray-700 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-500" />
                Business
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="target_audience" className="block text-sm font-medium text-gray-600 mb-1">
                    Target Audience
                  </label>
                  <textarea
                    id="target_audience"
                    name="target_audience"
                    value={userPreferences.target_audience || ''}
                    onChange={handleInputChange}
                    placeholder="Describe your ideal target audience"
                    className="w-full px-3 text-sm py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="problems" className="block text-sm font-medium text-gray-600 mb-1">
                    Problems You Solve
                  </label>
                  <textarea
                    id="problems"
                    name="problems"
                    value={userPreferences.problem || ''}
                    onChange={handleInputChange}
                    placeholder="What problems does your business solve for your customers?"
                    className="w-full px-3 text-sm py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white  text-gray-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label htmlFor="company_website" className="block text-sm font-medium text-gray-600 mb-1">
                    Company Website
                  </label>
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 text-gray-400  mr-2" />
                    <input
                      type="url"
                      id="company_website"
                      name="company_website"
                      value={userPreferences.company_website || ''}
                      onChange={handleInputChange}
                      placeholder="https://example.com"
                      className="flex-1 px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white  text-gray-500 "
                    />
                  </div>
                </div>
              </div>
            </div>

          

            {/* Integrations Section */}
            <div className="max-w-4xl mx-auto p-2 md:p-4">
              <h3 className="text-md font-medium text-gray-700  mb-4 flex items-center">
                <Puzzle className="w-5 h-5 mr-2 text-blue-500 " />
                Integrations
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-gray-700  font-medium">Connect with other tools</p>
                  <p className="text-sm text-gray-500">Zapier, Slack, Google Sheets and more</p>
                </div>
                <span className="text-sm text-gray-500">Coming Soon</span>
              </div>
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200  text-green-700 px-4 py-3 rounded-md">
                {successMessage}
              </div>
            )}

            {/* Action Buttons - Removed "Cancel" button */}
            <div className="flex justify-end pt-4 border-t border-gray-200 max-w-4xl mx-auto p-2 md:p-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500  text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center space-x-2 transition-colors duration-200"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
   
  );
}

export default SettingsPage;