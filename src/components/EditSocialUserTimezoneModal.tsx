import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Search, Check, Globe, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EditSocialUserTimezoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTimeZone: string;
  onSave: (timezone: string) => Promise<void>;
  userHandle: string;
  social_channel: string; 
  user_display_name: string; 
  avatar_url?: string; // Optional: URL to the user's avatar image
}

// List of common timezones with friendly names
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Time' },
  { value: 'Asia/Shanghai', label: 'China Time' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney Time' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time' },
];

// Get all available timezones from Intl API
const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone').map(tz => ({
  value: tz,
  label: tz.replace(/_/g, ' ').replace(/\//g, ' / ')
}));

export function EditSocialUserTimezoneModal({
  isOpen,
  onClose,
  selectedTimeZone,
  onSave,
  userHandle,
  user_display_name,
  avatar_url,
  social_channel,
}: EditSocialUserTimezoneModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTimeZone, setNewTimeZone] = useState(selectedTimeZone);
  const [filteredTimezones, setFilteredTimezones] = useState(COMMON_TIMEZONES);
  const [showAllTimezones, setShowAllTimezones] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [socialChannelId, setSocialChannelId] = useState<string | null>(null);

  // Fetch current user email on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setCurrentUserEmail(session.user.email);
          
          // Fetch the social channel ID for this specific handle
          if (userHandle) {
            const { data, error } = await supabase
              .from('social_channels')
              .select('id')
              .eq('email', session.user.email)
              .eq('handle', userHandle)
              .single();
              
            if (error) {
              console.error('Error fetching social channel ID:', error);
            } else if (data) {
              setSocialChannelId(data.id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen, userHandle]);

  // Update current time based on selected timezone
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: newTimeZone,
          timeZoneName: 'short'
        };
        setCurrentTime(new Intl.DateTimeFormat('en-US', options).format(now));
      } catch (err) {
        console.error('Error formatting time:', err);
        setCurrentTime('Invalid timezone');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [newTimeZone]);

  // Filter timezones based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTimezones(showAllTimezones ? ALL_TIMEZONES : COMMON_TIMEZONES);
      return;
    }

    const query = searchQuery.toLowerCase();
    const timezoneList = showAllTimezones ? ALL_TIMEZONES : COMMON_TIMEZONES;
    
    const filtered = timezoneList.filter(tz => 
      tz.label.toLowerCase().includes(query) || 
      tz.value.toLowerCase().includes(query)
    );
    
    setFilteredTimezones(filtered);
  }, [searchQuery, showAllTimezones]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewTimeZone(selectedTimeZone);
      setError(null);
    }
  }, [isOpen, selectedTimeZone]);

  const handleSaveTimezone = async () => {
    if (!newTimeZone || !currentUserEmail || !userHandle) {
      setError('Missing required information to save timezone');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Update timezone specifically for this social channel
      const { error: updateError } = await supabase
        .from('social_channels')
        .update({
          timezone: newTimeZone,
          updated_at: new Date().toISOString()
        })
        .match({
          email: currentUserEmail,
          handle: userHandle
        });
        
      if (updateError) throw updateError;
      
      // Call the onSave callback
      await onSave(newTimeZone);
      
      // Close the modal after successful save
      onClose();
    } catch (err) {
      console.error('Error saving timezone for social account:', err);
      setError('Failed to save timezone. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimezoneSelect = (timezone: string) => {
    setNewTimeZone(timezone);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md flex flex-col" style={{ maxHeight: '80vh' }}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 rounded-full p-2">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Change Timezone</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            Set new timezone for <span className="font-medium"> {social_channel} </span> account: <span className="font-medium">{user_display_name}</span>
          </div>
          
          {/* Current time display */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">Current Time:</span>
            </div>
            <span className="text-sm text-blue-700">{currentTime}</span>
          </div>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search timezones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">
              {filteredTimezones.length} timezones found
            </span>
            <button
              onClick={() => setShowAllTimezones(!showAllTimezones)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              {showAllTimezones ? 'Show common timezones' : 'Show all timezones'}
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-grow" style={{ maxHeight: '300px' }}>
          {filteredTimezones.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No timezones found matching "{searchQuery}"
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTimezones.map((timezone) => (
                <button
                  key={timezone.value}
                  onClick={() => handleTimezoneSelect(timezone.value)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between ${
                    newTimeZone === timezone.value ? 'bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{timezone.label}</p>
                    <p className="text-xs text-gray-500">{timezone.value}</p>
                  </div>
                  {newTimeZone === timezone.value && (
                    <Check className="w-5 h-5 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {error && (
          <div className="px-4 py-3 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveTimezone}
            disabled={isSaving || newTimeZone === selectedTimeZone}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Timezone</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
