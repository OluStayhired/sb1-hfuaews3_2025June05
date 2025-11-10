import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ThumbsUp, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Bug,
  Loader2,
  Star
} from 'lucide-react';

interface FeedbackPageProps {}

export function FeedbackPage({}: FeedbackPageProps) {
  // Form state
  const [formData, setFormData] = useState({
    featureType: '',
    appSection: '',
    socialChannel: '',
    problemSubject: '',
    problemDetail: ''
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Options for dropdowns
  const featureTypeOptions = ['Upgrade', 'Bug Fix', 'Enhancement', 'General'];
  const appSectionOptions = ['Dashboard', 'Drafts', 'Campaigns', 'Calendar', 'Schedule', 'General'];
  const socialChannelOptions = ['LinkedIn', 'Bluesky', 'Twitter', 'General'];

  // Fetch current user on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUserEmail(session.user.email);
          setCurrentUserId(session.user.id);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.featureType || !formData.appSection || !formData.socialChannel || !formData.problemSubject || !formData.problemDetail) {
      setError('Please fill in all fields');
      return;
    }

    // Validate problem detail length (minimum 25 characters as per DB constraint)
    if (formData.problemDetail.length < 25) {
      setError('Problem description must be at least 25 characters long');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Insert feedback into product_request table
      const { error: insertError } = await supabase
        .from('product_request')
        .insert({
          feature: formData.problemSubject,
          feature_type: formData.featureType,
          app_section: formData.appSection,
          social_channel: formData.socialChannel,
          more_info: formData.problemDetail,
          email: currentUserEmail,
          user_id: currentUserId,
        });

      if (insertError) throw insertError;

      // Show success message and reset form
      setSubmitSuccess(true);
      setFormData({
        featureType: '',
        appSection: '',
        socialChannel: '',
        problemSubject: '',
        problemDetail: ''
      });

      // Hide success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-8xl mx-auto">
        {/*Header Section Starts Here*/}
        <div className="flex items-center space-x-2 mb-8">
          <div className="p-2 bg-blue-50 rounded-full">
            <ThumbsUp className="w-5 h-5 text-blue-500"/>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Feedback</h2>
        </div>
        {/*End Header Section Here*/}

       
        {/*Start inside white background p-12 is height*/}
        <div className="bg-white rounded-lg p-12">
          {submitSuccess ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Feedback Submitted!</h3>
              <p className="text-gray-600 max-w-md">
                Thank you for your feedback. We appreciate your input and will review it shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-3xl">
              {/* Problem Type Section */}
              <div className="mb-8">
                <div className="flex items-center text-center space-x-2 mb-4">
                  <span className="rounded-full p-2 bg-blue-50">
                  <Bug className="w-5 h-5 text-blue-500"/>
                  </span>  
                  <h3 className="text-xl font-medium text-gray-900">Report Problem</h3>
                </div>

                <p className="text-blue-400 font-normal text-sm mb-6 mt-2 bg-blue-50 rounded-md p-2 inline-block border border-blue-100 hover:border-blue-200">
         👍 Please share your feedback, bugs and testimonials here. Your product feedback 
            <br/>will be used eventually be displayed as our roadmap. 
              </p>
        
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Feature Type */}
                  <div>
                    
                    <label htmlFor="featureType" className="block text-sm font-medium text-gray-700 mb-1">
                      Feature
                    </label>
                    
                        <select
                            id="featureType"
                            name="featureType"
                            value={formData.featureType}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            ${formData.featureType === '' ? 'text-gray-400' : 'text-gray-900'}`
                              }
                            required
                        >
                        <option value="" disabled className="text-gray-400">feature type</option>
                          {featureTypeOptions.map(option => (
                        <option key={option} value={option} className="text-gray-900">{option}</option>
                        ))}
                      </select>
                  </div>

                  {/* App Section */}
                  <div>
                    <label htmlFor="appSection" className="block text-sm font-medium text-gray-700 mb-1">
                      Section
                    </label>
                    <select
                      id="appSection"
                      name="appSection"
                      value={formData.appSection}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            ${formData.featureType === '' ? 'text-gray-400' : 'text-gray-900'}`
                              }
                      required
                    >
                      <option value="" disabled className="text-gray-400">affected section</option>
                      {appSectionOptions.map(option => (
                       <option key={option} value={option} className="text-gray-900">{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Social Channel */}
                  <div>
                    <label htmlFor="socialChannel" className="block text-sm font-medium text-gray-700 mb-1">
                      Channel
                    </label>
                    <select
                      id="socialChannel"
                      name="socialChannel"
                      value={formData.socialChannel}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                            ${formData.featureType === '' ? 'text-gray-400' : 'text-gray-900'}`
                              }
                      required
                    >
                      <option value="" disabled className="text-gray-400">social channel</option>
                      {socialChannelOptions.map(option => (
                       <option key={option} value={option} className="text-gray-900">{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Problem Details Section */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Details</h3>
                
                {/* Problem Subject */}
                <div className="mb-4">
                  <label htmlFor="problemSubject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="problemSubject"
                    name="problemSubject"
                    value={formData.problemSubject}
                    onChange={handleInputChange}
                    placeholder="Brief description of the issue or request"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Problem Description */}
                <div>
                  <label htmlFor="problemDetail" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="problemDetail"
                    name="problemDetail"
                    value={formData.problemDetail}
                    onChange={handleInputChange}
                    placeholder="Please provide detailed information about your feedback (minimum 25 characters)"
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    minLength={25}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.problemDetail.length}/25 characters minimum
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
        {/*End inside white background*/}
      </div>
    </div>
  );
}

export default FeedbackPage;
