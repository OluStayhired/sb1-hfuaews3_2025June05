import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js'; // Ensure you have this import for SupabaseClient
import { differenceInDays, addDays } from 'date-fns'; // For date calculations

// 1. Define Interfaces for your Supabase tables
// These interfaces ensure type safety when working with your data.

/**
 * Interface for the `user_preferences` table.
 */
interface UserPreferences {
  created_at: string;
  updated_at: string;
  email: string;
  user_id: string;
  timezone: string | null;
  welcome_guide: boolean | null;
  target_audience: string | null;
  problem: string | null;
  company_website: string | null;
  product_tier: string | null; // This will be the 'tier' name (e.g., 'Standard', 'Premium')
  calendar_days: number | null; // Default campaign duration
  account_type: string | null; // e.g., 'Free Plan', 'Early Adopter', 'Paid Plan' - maps to product_tier.account_type
  user_tenure: number | null; // Days since user creation or plan start
  total_campaign: number | null; // Total campaigns created by the user
  social_accounts: number | null; // Total social accounts connected by the user
  stripe_customer_id: string | null;
}

/**
 * Interface for the `product_tier` table.
 */
interface ProductTier {
  id: number;
  created_at: string;
  tier: string; // e.g., 'Standard', 'Premium' - matches user_preferences.product_tier
  campaign_days: number | null; // Max days allowed for a single campaign
  pricing: number | null;
  free_trial_days: number | null; // Total days in free trial
  account_type: string | null; // e.g., 'Free Plan', 'Early Adopter', 'Paid Plan' - matches user_preferences.account_type
  max_calendar: number | null; // Max total campaigns allowed
  max_social_accounts: number | null; // Max total social accounts allowed
  max_accounts_per_channel: number | null; // Max accounts per social channel (if applicable)
  first_free_trial_warning: number | null; // Days before end of trial for first warning
  second_free_trial_warning: number | null; // Days before end of trial for second warning
  final_free_trial_days: number | null; // Days before end of trial for final warning (e.g., 1 day)
}

/**
 * Interface for the combined product tier information and calculated thresholds.
 * This is what the hook will return, making it easy to consume.
 */
interface UserProductTierInfo {
  isLoading: boolean;
  error: string | null;
  // Raw user preferences
  userPreferences: UserPreferences | null;
  // Matched product tier details
  productTierDetails: ProductTier | null;
  // Derived status flags
  isFreePlan: boolean;
  isEarlyAdopter: boolean; // New flag for early adopters
  isTrialUser: boolean;
  isPaidPlan: boolean;
  // Feature access thresholds
  canCreateMoreCampaigns: boolean;
  canAddMoreSocialAccounts: boolean;
  // Trial-specific information
  isTrialExpiringSoon: boolean;
  daysUntilTrialExpires: number | null;
  showFirstTrialWarning: boolean;
  showSecondTrialWarning: boolean;
  showFinalTrialWarning: boolean;
  // Remaining allowances
  max_calendar: number | null;
  max_social_accounts: number | null;
  remainingCampaigns: number | null;
  remainingSocialAccounts: number | null;
}

// 2. Create the reusable custom React Hook
/**
 * Custom React Hook to fetch and expose a user's product tier information
 * and calculated feature access thresholds.
 *
 * @param supabase The Supabase client instance.
 * @param userEmail The email of the currently authenticated user.
 * @returns An object containing the user's product tier info and feature access flags.
 */
export function useProductTier(supabase: SupabaseClient, userEmail: string | null): UserProductTierInfo {
  const [userProductTierInfo, setUserProductTierInfo] = useState<UserProductTierInfo>({
    isLoading: true,
    error: null,
    userPreferences: null,
    productTierDetails: null,
    isFreePlan: false,
    isEarlyAdopter: false, // Initialize new flag
    isTrialUser: false,
    isPaidPlan: false,
    canCreateMoreCampaigns: false,
    canAddMoreSocialAccounts: false,
    isTrialExpiringSoon: false,
    daysUntilTrialExpires: null,
    showFirstTrialWarning: false,
    showSecondTrialWarning: false,
    showFinalTrialWarning: false,
    max_calendar: null,
    max_social_accounts: null,
    remainingCampaigns: null,
    remainingSocialAccounts: null,
  });

  // Memoize the data fetching logic to prevent unnecessary re-runs
  const fetchData = useCallback(async () => {
    if (!userEmail) {
      setUserProductTierInfo(prev => ({ ...prev, isLoading: false, error: 'User email is missing.' }));
      return;
    }

    setUserProductTierInfo(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Fetch user preferences
      const { data: userPrefs, error: userPrefsError } = await supabase
        .from<UserPreferences>('user_preferences')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (userPrefsError) {
        console.error('Error fetching user preferences:', userPrefsError);
        setUserProductTierInfo(prev => ({ ...prev, isLoading: false, error: userPrefsError.message }));
        return;
      }

      if (!userPrefs) {
        // User preferences not found, set default or handle as error
        setUserProductTierInfo(prev => ({ ...prev, isLoading: false, error: 'User preferences not found.' }));
        return;
      }

      // 2. Fetch product tier details based on user's account_type
      const { data: productTier, error: productTierError } = await supabase
        .from<ProductTier>('product_tier')
        .select('*')
        .eq('account_type', userPrefs.account_type) // Match by account_type
        .single();

      if (productTierError) {
        console.error('Error fetching product tier details:', productTierError);
        setUserProductTierInfo(prev => ({ ...prev, isLoading: false, error: productTierError.message }));
        return;
      }

      if (!productTier) {
        // Product tier details not found for the user's account type
        setUserProductTierInfo(prev => ({ ...prev, isLoading: false, error: 'Product tier details not found for this account type.' }));
        return;
      }

      // 3. Calculate derived values and thresholds
      const isFreePlan = userPrefs.account_type === 'Free Plan';
      const isEarlyAdopter = userPrefs.account_type === 'Early Adopter'; // Set new flag
      const isPaidPlan = !isFreePlan && !isEarlyAdopter; // Paid plan if neither free nor early adopter

      let isTrialUser = false;
      let daysUntilTrialExpires: number | null = null;
      let showFirstTrialWarning = false;
      let showSecondTrialWarning = false;
      let showFinalTrialWarning = false;

      // Check if the user is on a free plan OR an early adopter plan and has tenure data for trial calculation
      if ((isFreePlan || isEarlyAdopter) && typeof userPrefs.user_tenure === 'number' && typeof productTier.free_trial_days === 'number') {
        // Assuming `user_tenure` is the number of days *since the start of their current plan/trial*.
        // Therefore, `daysUntilTrialExpires` = `free_trial_days` - `user_tenure`.
        daysUntilTrialExpires = productTier.free_trial_days - userPrefs.user_tenure;
        isTrialUser = daysUntilTrialExpires > 0;

        if (isTrialUser) {
          if (typeof productTier.first_free_trial_warning === 'number' && daysUntilTrialExpires <= productTier.first_free_trial_warning) {
            showFirstTrialWarning = true;
          }
          if (typeof productTier.second_free_trial_warning === 'number' && daysUntilTrialExpires <= productTier.second_free_trial_warning) {
            showSecondTrialWarning = true;
          }
          if (typeof productTier.final_free_trial_days === 'number' && daysUntilTrialExpires <= productTier.final_free_trial_days) {
            showFinalTrialWarning = true;
          }
        } else if (daysUntilTrialExpires <= 0) {
            // Trial has ended
            isTrialUser = false;
            daysUntilTrialExpires = 0;
        }
      }


      const remainingCampaigns = typeof productTier.max_calendar === 'number' && typeof userPrefs.total_campaign === 'number'
        ? Math.max(0, productTier.max_calendar - userPrefs.total_campaign)
        : null;

      const remainingSocialAccounts = typeof productTier.max_social_accounts === 'number' && typeof userPrefs.social_accounts === 'number'
        ? Math.max(0, productTier.max_social_accounts - userPrefs.social_accounts)
        : null;

      const canCreateMoreCampaigns = remainingCampaigns === null || remainingCampaigns > 0;
      const canAddMoreSocialAccounts = remainingSocialAccounts === null || remainingSocialAccounts > 0;
      const isTrialExpiringSoon = showFirstTrialWarning || showSecondTrialWarning || showFinalTrialWarning;


      // 4. Update state with all calculated information
      setUserProductTierInfo({
        isLoading: false,
        error: null,
        userPreferences: userPrefs,
        productTierDetails: productTier,
        isFreePlan,
        isEarlyAdopter, // Assign new flag
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
      });

    } catch (err: any) {
      console.error('Unexpected error in useProductTier hook:', err);
      setUserProductTierInfo(prev => ({ ...prev, isLoading: false, error: err.message || 'An unexpected error occurred.' }));
    }
  }, [supabase, userEmail]); // Re-run if supabase client or userEmail changes

  // Fetch data on component mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Depend on fetchData to ensure it runs when needed

  return userProductTierInfo;
}