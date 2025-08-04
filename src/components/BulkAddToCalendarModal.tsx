// src/components/BulkAddToCalendarModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Calendar, Check, Loader2, Megaphone, AlertCircle, Sparkles, UserPlus, Edit2, PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { format, parse, addDays, isPast, startOfDay, isSameDay } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';

interface BulkAddToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarName: string; // New prop: the name of the calendar to fetch content from
  onScheduleSuccess: () => void; // Callback for successful scheduling
}

interface SocialChannel {
  id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  social_channel: string;
  twitter_verified: boolean;
  timezone: string;
}

// New interface for content from content_calendar
interface CalendarContentItem {
  id: string;
  content: string;
  content_date: string; // Date in 'yyyy-MM-dd' format
  day_of_week: string; // Full day name, e.g., 'Monday'
  theme: string;
  topic: string;
  call_to_action: string;
  notes: string;
  // Add other fields from content_calendar if needed
}

// New interface for schedule slots
interface ScheduleSlot {
  schedule_time: string;
  day_of_week: string;
  active_time: boolean;
  active_day: boolean;
}

export function BulkAddToCalendarModal({ isOpen, onClose, calendarName, onScheduleSuccess }: BulkAddToCalendarModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [socialChannels, setSocialChannels] = useState<SocialChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]); // e.g., ['Monday', 'Wednesday']
  const [selectedTime, setSelectedTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [daySelectionError, setDaySelectionError] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [calendarContent, setCalendarContent] = useState<CalendarContentItem[]>([]); // State for fetched calendar content
  const [max_length, setMaxLength] = useState(300);

  // NEW: State for content length validation errors
  const [contentLengthError, setContentLengthError] = useState<string | null>(null);


  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getSelectedChannelTimezone = () => {
    const activeChannel = socialChannels.find(channel => channel.id === selectedChannel);
    return activeChannel?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  //New UseEffect to include Premium Twitter
   useEffect(() => {
    if (selectedChannel) {
      const activeAccount = socialChannels.find(channel => channel.id === selectedChannel);
      if (activeAccount) {
        //console.log('Selected Social Channel:', activeAccount.social_channel); 
        switch (activeAccount.social_channel) {
          case 'Bluesky':
            setMaxLength(300);
            break;
          case 'Twitter':
                // Use activeAccount.twitter_verified directly here
                if (activeAccount.twitter_verified) {
                    setMaxLength(25000); // Premium Twitter limit
                } else {
                    setMaxLength(280); // Free Twitter limit
                }
            break;
          case 'LinkedIn':
            setMaxLength(3000);
            break;
          default:
            setMaxLength(300); // Default
        }
      }
    }
  }, [selectedChannel, socialChannels]);  

  const validateAndSetTime = (
    timeString: string,
    targetTimezone: string
  ) => {
    setTimeError(null);

    const nowUtc = new Date();
    const datePart = format(new Date(), 'yyyy-MM-dd');
    const combinedDateTimeString = `${datePart}T${timeString}:00`;

    let scheduledUtc: Date;
    try {
      scheduledUtc = zonedTimeToUtc(combinedDateTimeString, targetTimezone);
    } catch (e) {
      console.error("Failed to parse or convert scheduled time to UTC with timezone:", e);
      setTimeError("An error occurred with time parsing. Please try again.");
      return false;
    }

    if (scheduledUtc < nowUtc) {
      const scheduledTimeInTarget = utcToZonedTime(scheduledUtc, targetTimezone);
      const formattedTimeInTarget = format(scheduledTimeInTarget, 'HH:mm');
      const formattedDateInTarget = format(scheduledTimeInTarget, 'MMM d, yyyy');

      const timezoneDisplayName = targetTimezone.split('/').pop()?.replace(/_/g, ' ') || targetTimezone;

      setTimeError(
        `Cannot schedule for ${formattedTimeInTarget} on ${formattedDateInTarget} ` +
        `(in ${timezoneDisplayName}) as this time has already passed.`
      );
      //return false;
    }
    setSelectedTime(timeString);
    return true;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTime = e.target.value;
    const targetTimezone = getSelectedChannelTimezone();
    validateAndSetTime(newTime, targetTimezone);
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        // Fetch connected social channels
        const { data: channels, error: channelsError } = await supabase
          .from('social_channels')
          .select('*')
          .eq('email', session.user.email)
          .eq('activated', true);

        if (channelsError) throw channelsError;
        setSocialChannels(channels || []);

        // Fetch available time slots from user_schedule
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('user_schedule')
          .select('schedule_time, day_of_week, active_time, active_day')
          .eq('email', session.user.email)
          .eq('active_time', true)
          .eq('active_day', true);

        if (scheduleError) throw scheduleError;

        const uniqueTimes = Array.from(new Set(
          (scheduleData || []).map((slot: ScheduleSlot) => slot.schedule_time.substring(0, 5))
        )).sort();
        setAvailableTimeSlots(uniqueTimes);

        if (uniqueTimes.length > 0) {
          setSelectedTime(uniqueTimes[0]);
        } else {
          setSelectedTime('');
        }

        // Fetch content from content_calendar based on calendarName prop
        const { data: contentData, error: contentError } = await supabase
          .from('content_calendar')
          .select('*')
          .eq('calendar_name', calendarName)
          .eq('email', session.user.email)
          .order('content_date', { ascending: true });

        if (contentError) throw contentError;
        setCalendarContent(contentData || []);

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
      setSelectedChannel(null);
      setSelectedDays([]);
      setIsSuccess(false);
      setTimeError(null);
      setDaySelectionError(null);
      setContentLengthError(null);
    }
  }, [isOpen, calendarName]); // Add calendarName to dependencies

const handleSave = async () => {
// Clear previous errors
    setDaySelectionError(null);
    setContentLengthError(null);
    setTimeError(null);
    
    if (!selectedChannel) {
      setDaySelectionError('Please select a social account.');
      return;
    }
    if (selectedDays.length === 0) {
      setDaySelectionError('Please select at least one day.');
      return;
    }
    if (!selectedTime) {
      setDaySelectionError('Please select a time slot.');
      return;
    }
    //if (timeError) {
      //setDaySelectionError('Please fix the time error.');
      //return;
    //}
    if (calendarContent.length === 0) {
      setDaySelectionError('No content available for this calendar to schedule.');
      return;
    }


    // NEW: Content length validation
    const postsExceedingLimit: { date: string; time: string; length: number }[] = [];
    const today = startOfDay(new Date()); // Get today's date at midnight for comparison

    for (const contentItem of calendarContent) {
      const itemContentDate = parse(contentItem.content_date, 'yyyy-MM-dd', new Date());
      // Check if the post's content date is today or in the future
      const isFutureOrToday = !isPast(itemContentDate) || isSameDay(itemContentDate, today);

      if (contentItem.content.length > max_length && isFutureOrToday) {
        postsExceedingLimit.push({
          date: format(itemContentDate, 'MMM d, yyyy'),
          time: selectedTime, // The selected time applies to all posts
          length: contentItem.content.length,
        });
      }
    }

    if (postsExceedingLimit.length > 0) {
      const errorMessage = `These posts exceed the character limit (${max_length}) for the selected channel:\n` +
                           postsExceedingLimit.map(p => `- ${p.date} at ${p.time} (Length: ${p.length})`).join('\n');
      setContentLengthError(errorMessage);
      return; // Stop the save process
    }

    setIsSaving(true);
    setDaySelectionError(null);
    let allPostsSuccessful = true;
    const successfulPosts: string[] = [];
    const failedPosts: string[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error('No authenticated user');

      const selectedChannelObject = socialChannels.find(
        (channel) => channel.id === selectedChannel
      );

      if (!selectedChannelObject) throw new Error('Selected channel not found.');

      const formattedTimeForDatabase = format(parse(selectedTime, 'HH:mm', new Date()), 'HH:mm:ss');
      const targetTimezone = getSelectedChannelTimezone();
      const today = startOfDay(new Date()); // Get today's date at midnight

      for (const contentItem of calendarContent) {
        let itemDate = parse(contentItem.content_date, 'yyyy-MM-dd', new Date());
        let effectiveItemDate = new Date(itemDate); // Initialize effectiveItemDate

        // Calculate scheduledUtc for the current itemDate and selectedTime
        const combinedDateTimeString = `${format(effectiveItemDate, 'yyyy-MM-dd')}T${selectedTime}:00`;
        const scheduledUtc = zonedTimeToUtc(combinedDateTimeString, targetTimezone);

        // Check if the post is for today and the time has already passed
        if (isSameDay(effectiveItemDate, today) && isPast(scheduledUtc)) {
          console.warn(`Post for ${contentItem.content_date} has time in the past. Rescheduling to next day.`);
          effectiveItemDate = addDays(effectiveItemDate, 1); // Shift to the next day
        }

        const itemDayOfWeek = daysOfWeek[effectiveItemDate.getDay()]; // Use effectiveItemDate for day of week

        // Condition 1: Date not in past (excluding today, as handled above)
        if (isPast(effectiveItemDate) && !isSameDay(effectiveItemDate, today)) {
          console.warn(`Skipping post for ${contentItem.content_date}: Date is in the past (after adjustment).`);
          failedPosts.push(`${contentItem.content_date} (past date after adjustment)`);
          continue;
        }

        // Condition 2: Day of week matches selected days
        if (!selectedDays.includes(itemDayOfWeek)) {
          console.warn(`Skipping post for ${contentItem.content_date}: Day of week (${itemDayOfWeek}) not selected.`);
          failedPosts.push(`${contentItem.content_date} (day not selected)`);
          continue;
        }

        // If all conditions pass, schedule the post
        const newPost = {
          user_email: session.user.email,
          user_id: session.user.id,
          social_channel: selectedChannelObject.social_channel,
          user_handle: selectedChannelObject.handle,
          user_display_name: selectedChannelObject.display_name,
          calendar_name: calendarName, // Use the actual calendar name
          full_content: contentItem.content, // Use content from calendar item
          theme: contentItem.theme,
          topic: contentItem.topic,
          content_date: format(effectiveItemDate, 'yyyy-MM-dd'), // Use effectiveItemDate
          content_time: formattedTimeForDatabase,
          target_timezone: targetTimezone,
          created_at: new Date().toISOString(),
          schedule_status: true,
          sent_post: false,
        };

        const { error: insertError } = await supabase
          .from('user_post_schedule')
          .insert(newPost);

        if (insertError) {
          console.error(`Error scheduling post for ${contentItem.content_date}:`, insertError);
          allPostsSuccessful = false;
          failedPosts.push(`${contentItem.content_date} (${insertError.message})`);
        } else {
          successfulPosts.push(contentItem.content_date);
        }
      }

      if (allPostsSuccessful) {
        setIsSuccess(true);
        //onScheduleSuccess(); // Notify parent of success
      } else {
        setIsSuccess(false);
        setDaySelectionError(`Scheduled ${successfulPosts.length} posts. Failed to schedule ${failedPosts.length} posts: ${failedPosts.join(', ')}`);
      }

    } catch (err) {
      console.error('Error during bulk scheduling:', err);
      allPostsSuccessful = false;
      setDaySelectionError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setIsSaving(false);
      if (allPostsSuccessful) {
        setTimeout(() => onClose(), 2000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-5 z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '75vh' }}>
        <div className="bg-white rounded-xl w-full max-w-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Bulk Schedule Posts</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {isSuccess ? (
            <div className="flex items-center space-x-3 p-4">
              <div className="bg-green-100 rounded-full p-2">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-left text-gray-900">Posts Scheduled Successfully!</p>
                <p className="text-sm text-gray-500">Your posts have been added to the schedule.</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Calendar Name Display */}
              <div className="flex items-center space-x-2">
                <span className="bg-blue-50 rounded-full p-1 mb-2">
                  <Megaphone className="w-4 h-4 text-blue-500"/>
                </span>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="font-semibold">{calendarName}</span>
                </label>
              </div>
              <div className="text-sm text-gray-500 mb-4 text-left ml-8">
                {calendarContent.length} content ideas available in this campaign.
              </div>

              {/* Social Channels */}
              <div>
                <div className="flex space-x-2 items-center">
                  <span className="bg-blue-50 rounded-full p-1 mb-2">
                    <UserPlus className="w-4 h-4 text-blue-500"/>
                  </span>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose Account
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  {socialChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel.id)}
                      className={`flex items-center space-x-3 px-4 py-2 rounded-lg border transition-colors ${
                        selectedChannel === channel.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={channel.avatar_url || `https://ui-avatars.com/api/?name=${channel.handle}`}
                          alt={channel.handle}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                          <img
                            src={channel.social_channel === 'Bluesky'
                                  ? BlueskyLogo
                                  : channel.social_channel === 'LinkedIn'
                                  ? LinkedInLogo
                                  : XLogo
                                }
                            alt={channel.social_channel}
                            className="w-3 h-3"
                          />
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{channel.display_name || channel.handle}</p>
                        <p className="text-xs text-gray-500">@{channel.handle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedChannel && (
                <>
                  {/* Day Selection */}
                  <div>
                    <div className="flex space-x-2 items-center">
                      <span className="bg-blue-50 rounded-full p-1 mb-2">
                        <Calendar className="w-4 h-4 text-blue-500"/>
                      </span>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Days
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map(day => (
                        <button
                          key={day}
                          onClick={() => handleDayToggle(day)}
                          className={`flex items-center px-3 py-1.5 rounded-full text-xs transition-colors ${
                            selectedDays.includes(day)
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <PlusCircle className="w-3 h-3 mr-2"/>
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Selection - Now a dropdown */}
                  <div>
                    <div className="flex space-x-2 items-center">
                      <span className="bg-blue-50 rounded-full p-1 mb-2">
                        <Clock className="w-4 h-4 text-blue-500"/>
                      </span>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Time
                      </label>
                    </div>
                    <select
                      value={selectedTime}
                      onChange={handleTimeChange}
                      className={`px-4 py-2 border ${timeError ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full`}
                    >
                      {availableTimeSlots.length === 0 ? (
                        <option value="">No time slots available</option>
                      ) : (
                        <>
                          <option value="">Select a time slot</option>
                          {availableTimeSlots.map(time => (
                            <option key={time} value={time}>
                              {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    {timeError && (
                      <div className="mt-1 text-sm text-red-500 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{timeError}</span>
                      </div>
                    )}
                  </div>

                  {/* Post Content Summary (replaces textarea) */}
                  {/*
                  <div>
                    <div className="flex space-x-2 items-center">
                      <span className="bg-blue-50 rounded-full p-1 mb-2"> <Edit2 className="w-4 h-4 text-blue-500"/></span>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content to Schedule
                      </label>
                    </div>
                    <div className="w-full px-4 py-3 text-xs border border-gray-300 rounded-lg bg-gray-50 min-h-[80px] overflow-y-auto">
                      <p className="text-gray-700 font-medium">Posts will be scheduled for:</p>
                      <ul className="list-disc list-inside text-gray-600 mt-2">
                        {calendarContent.filter(item => selectedDays.includes(daysOfWeek[parse(item.content_date, 'yyyy-MM-dd', new Date()).getDay()])).map(item => (
                          <li key={item.id} className="truncate">
                            {format(parse(item.content_date, 'yyyy-MM-dd', new Date()), 'MMM d, EEE')}: "{item.content.substring(0, 50)}..."
                          </li>
                        ))}
                        {calendarContent.filter(item => selectedDays.includes(daysOfWeek[parse(item.content_date, 'yyyy-MM-dd', new Date()).getDay()])).length === 0 && (
                          <li>No content from this campaign matches selected days.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  */}
                </>
              )}

              {/* Display general validation errors */}
              {daySelectionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>{daySelectionError}</span>
                </div>
              )}

              {/* NEW: Display content length validation errors */}
              {contentLengthError && (
                  <div className="bg-red-50 text-sm border border-red-200 text-red-700 p-3 rounded-md flex items-start space-x-2 whitespace-pre-wrap max-h-15 overflow-y-auto">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{contentLengthError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <TooltipExtended
                  text="Please select an account, at least one day, and a time slot to schedule."
                  show={!selectedChannel || selectedDays.length === 0 || !selectedTime || calendarContent.length === 0}
                >
                  {/*removed time error|| !!timeError*/}
                  <button
                    onClick={handleSave}
                    disabled={!selectedChannel || selectedDays.length === 0 || !selectedTime || isSaving || calendarContent.length === 0}
                    className={`px-6 py-2 ${
                      !selectedChannel || selectedDays.length === 0 || !selectedTime || isSaving  || calendarContent.length === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    } rounded-lg flex items-center space-x-2`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scheduling...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Schedule All</span>
                      </>
                    )}
                  </button>
                </TooltipExtended>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
