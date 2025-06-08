// src/pages/SettingsPage.tsx (Renamed file)
import React, { useState, useEffect } from 'react';
// Removed X import as it's no longer needed for closing
import { Save, Settings, User, Globe, Target, AlertCircle, CreditCard, Puzzle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
// Assuming you're using React Router or similar for navigation
// import { useNavigate } from 'react-router-dom'; // Example if using react-router-dom

interface UserPreferences {
  email: string;
  timezone: string;
  target_audience: string | null;
  problems: string | null;
  company_website: string | null;
}

// Renamed the component from SettingsModal to SettingsPage
export function SettingsPage() {
  // const navigate = useNavigate(); // Initialize navigate if you need to redirect programmatically

  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    email: '',
    timezone: '',
    target_audience: '',
    old_target_audience: '', // Add a state to store original value for comparison if needed
    problems: '',
    company_website: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          });
        } else {
          // No preferences found, use defaults
          setUserPreferences({
            email: session.user.email,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            target_audience: '',
            problem: '',
            company_website: '',
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

  // Removed the modal overlay and fixed positioning
  // This div now represents the main content area of your page
  return (
    //<div className="w-full p-2 lg:p-2"> {/* Added container for max-width, center, padding */}
    <div className="w-full mx-auto">
      {/*<div className="bg-white rounded-xl shadow-lg w-full max-w-4xl mx-auto p-6 md:p-8"> {/* Adjusted max-width for page content */}
      
      <div className="bg-white w-full mx-auto p-6 md:p-8">
        {/* Header - Removed X close button */}
        <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Settings className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 ml-3">Account Settings</h2>
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
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
                    className="w-full text-sm px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white  text-gray-900"
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
                      className="flex-1 px-3 py-2 border border-gray-300  rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white  text-gray-900 "
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Section */}
            <div className="max-w-4xl mx-auto p-2 md:p-4">
              <h3 className="text-md font-medium text-gray-700  mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-blue-500 " />
                Billing
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-gray-700  font-medium">Standard Plan</p>
                  <p className="text-sm text-gray-500">Basic features</p>
                </div>
                <span className="text-sm text-gray-500">Pricing Soon</span>
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