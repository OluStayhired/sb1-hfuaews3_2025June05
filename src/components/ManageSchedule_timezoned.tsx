import React, { useState, useEffect } from 'react';
import { format, addDays, parseISO } from 'date-fns';
import { Plus, Clock, ChevronLeft, ChevronRight, Trash2, SquarePen, Send, PlusCircle, Calendar, List, CalendarClock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SchedulePostModal } from '/src/components/SchedulePostModal';
import { EditSchedulePostModal } from '/src/components/EditSchedulePostModal';
import { DeleteWarningModal } from '/src/components/DeleteWarningModal';
import { CalendarView } from '/src/components/CalendarView';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import { checkConnectedSocials, checkPlatformConnection } from '../utils/checkConnectedSocial';
import { CreateBlueskyModal } from './CreateBlueskyModal';
import { NoSocialModal } from './NoSocialModal';
import { ScheduleDateWarningModal } from './ScheduleDateWarningModal';
import { PostNowWarningModal } from './PostNowWarningModal';
import { TimezoneSelectorModal } from './TimezoneSelectorModal';
import { utcToZonedTime, formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';


// Add new interfaces for post data
interface PostData {
  id: string;
  campaign_name: string;
  content: string;
  social_channel: string;
  user_handle: string;
  user_display_name: string | null;
  avatar_url?: string | null;
  content_time: string;
  social_channels?: {
    avatar_url: string | null;
    handle: string;
  };
}

interface TimeSlot {
  schedule_time: string;
  day_of_week: string;
  //active_day: boolean;
  //active_time: boolean;
}

// Update DaySchedule interface to include posts
interface DaySchedule {
  date: Date;
  dayOfWeek: string;
  isDisabledDay: boolean;
  slots: {
    time: string;
    isAvailable: boolean;
    scheduledPost?: PostData; // Add scheduled post data
    active_time?: boolean;
  }[];
}

interface CalendarViewProps {
  schedules: DaySchedule[];
  onNewPost: (date: Date, time: string) => void;
  onEditPost: (post: PostData) => void;
  onDeletePost: (post: PostData) => void;
  onPostScheduled: (post: PostData) => void;
  onPostUpdate: (post: PostData) => void;
  onScheduleError: (post: PostData) => void;
  isLoading: boolean;
}


function ManageSchedule() {
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimezoneSelectorOpen, setIsTimezoneSelectorOpen] = useState(false);
  const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<PostData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [optimisticPosts, setOptimisticPosts] = useState<PostData[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPostWarningModalOpen, setIsPostWarningModalOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showNoSocialModal, setShowNoSocialModal] = useState(false);
  const [isBlueskyModalOpen, setIsBlueskyModalOpen] = useState(false);
  const [isMoreAccountsModalOpen, setIsMoreAccountsModalOpen] = useState(false);
  const [isDateWarningModalOpen, setIsDateWarningModalOpen] = useState(false);
  const [invalidDate, setInvalidDate] = useState<Date | null>(null);
  const [selectedPostForNow, setSelectedPostForNow] = useState<PostData | null>(null);
  const [isPausingPost, setIsPausingPost] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);



const formatDateInUserTimezone = (date: Date, timezone: string, formatStr: string) => {
  //console.log('date: ', date)
  //console.log('timezone: ', timezone)
  //console.log('formatStr: ', formatStr )
  try {
  
    const zonedDate = utcToZonedTime(date, timezone);
    //return formatInTimeZone(zonedDate, formatStr, { timeZone: userTimezone });
    return formatInTimeZone(zonedDate, userTimezone, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

  {/*
const formatTimeInUserTimezone = (time: string, date: Date, timezone: string) => {
    //console.log('time: ', time)
  //console.log('date: ', date )
  //console.log('timezone: ', timezone)
  
  try {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    const utcDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      seconds
    ));
    const zonedDate = utcToZonedTime(utcDate, timezone);
    return formatInTimeZone(zonedDate, 'h:mm a', { timeZone: timezone });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
}; */} 


const formatTimeInUserTimezone = (timeString: string, date: Date, targetTimezone: string) => {
  try {
    const datePart = format(date, 'yyyy-MM-dd');
    const combinedDateTimeString = `${datePart} ${timeString}`;

    const momentInTargetTzUtc = zonedTimeToUtc(combinedDateTimeString, targetTimezone);

    return formatInTimeZone(momentInTargetTzUtc, targetTimezone, 'h:mm a');

  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
};  

// Add this function to handle timezone changes
const handleSaveTimezone = async (newTimezone: string) => {
  try {
    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email || !session?.user?.id) {
      throw new Error('No authenticated user found');
    }

    // Update user timezone in the database
    const { error: updateError } = await supabase
      .from('user_preferences')
      .upsert({
        email: session.user.email,
        user_id: session.user.id,
        timezone: newTimezone,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });

    if (updateError) throw updateError;

    // Update local state
    setUserTimezone(newTimezone);
    
    // Refresh schedule data with new timezone
    await fetchUserSchedule();
    
  } catch (err) {
    console.error('Error saving timezone:', err);
    // Optionally show error message to user
  }
};

// Add this useEffect to fetch the user ID when the component mounts
useEffect(() => {
  const fetchUserId = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
      }
    } catch (err) {
      console.error('Error fetching user ID:', err);
    }
  };
  
  fetchUserId();
}, []);
  
// Add this useEffect to fetch the user's timezone preference
useEffect(() => {
  const fetchUserTimezone = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('timezone')
        .eq('email', session.user.email)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching user timezone:', error);
        return;
      }

      if (data?.timezone) {
        setUserTimezone(data.timezone);
      }
    } catch (err) {
      console.error('Error fetching user timezone preference:', err);
    }
  };

  fetchUserTimezone();
}, []);
  

const checkSocials = async () => {
  const socials = await checkConnectedSocials();
  if (socials) {
    console.log('Bluesky connected:', socials.bluesky);
    console.log('LinkedIn connected:', socials.linkedin);
  }
};

const checkBluesky = async () => {
  const isConnected = await checkPlatformConnection('Bluesky');
  console.log('Bluesky connected:', isConnected);
};  

  // Generate next 7 days starting from today
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      date,
      dayOfWeek: format(date, 'EEEE').toLowerCase()
    };
  });


  const validateAndSetDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    
    if (date < today) {
      // Date is in the past, show warning
      setInvalidDate(date);
      setIsDateWarningModalOpen(true);
      return false;
    }
    
    // Date is valid, proceed with your logic
    setSelectedDate(date);
    return true;
  };
  
  // 4. Function to handle closing the modal
  const handleCloseWarningModal = () => {
    setIsDateWarningModalOpen(false);
    setInvalidDate(null);
  };

  const truncateText = (text: string, maxLength: number = 25): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};


// Add this function to handle pausing a post
const handlePausePost = async (postId: string) => {
  if (!postId) {
    console.error('Post ID is missing');
    return;
  }
  
  try {
    setIsPausingPost(postId); // Set loading state for this specific post
    
    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      throw new Error('No authenticated user found');
    }
    
    // Get the current status of the post
    const { data: postData, error: postError } = await supabase
      .from('user_post_schedule')
      .select('schedule_status, draft_status')
      .eq('id', postId)
      .single();
      
    if (postError) throw postError;
    
    // Determine the new status (toggle)
    const newScheduleStatus = !postData.schedule_status;
    const newDraftStatus = !postData.schedule_status; // If activating, set draft to false
    
    // Update the post in the database
    const { error } = await supabase
      .from('user_post_schedule')
      .update({ 
        schedule_status: newScheduleStatus,
        draft_status: !newScheduleStatus, // Opposite of schedule_status
        updated_at: new Date().toISOString()
      })
      .match({ 
        id: postId,
        user_email: session.user.email // Ensure user can only update their own posts
      });

    if (error) throw error;

    // Update local state to reflect the change
    setSchedules(prev => 
      prev.map(day => ({
        ...day,
        slots: day.slots.map(slot => {
          if (slot.scheduledPost?.id === postId) {
            return {
              ...slot,
              scheduledPost: {
                ...slot.scheduledPost,
                schedule_status: newScheduleStatus,
                draft_status: !newScheduleStatus
              }
            };
          }
          return slot;
        })
      }))
    );

    // Refresh the schedule data
    //await fetchUserSchedule();

  } catch (err) {
    console.error('Error toggling post status:', err);
    // Handle error (show error message to user)
  } finally {
    setIsPausingPost(null);
  }
};

  
  // Handle new scheduled post
  const handleSchedulePost = (newPost: PostData) => {
    // Add to optimistic state immediately
    setOptimisticPosts(prev => [...prev, newPost]);
    
    // Update the schedules state with the new post
    setSchedules(prev => 
      prev.map(day => {
        if (format(day.date, 'yyyy-MM-dd') === newPost.content_date) {
          return {
            ...day,
            slots: day.slots.map(slot => {
              if (slot.time === newPost.content_time) {
                return {
                  ...slot,
                  scheduledPost: newPost
                };
              }
              return slot;
            })
          };
        }
        return day;
      })
    );
  };

  

  //Handle Errors with Scheduling and revert post
  const handleScheduleError = (failedPost: PostData) => {
  // Remove the failed post from optimistic state
  setOptimisticPosts(prev => 
    prev.filter(post => 
      !(post.content_date === failedPost.content_date && 
        post.content_time === failedPost.content_time)
    )
  );

  // Revert the schedules state
  setSchedules(prev => 
    prev.map(day => {
      if (format(day.date, 'yyyy-MM-dd') === failedPost.content_date) {
        return {
          ...day,
          slots: day.slots.map(slot => {
            if (slot.time === failedPost.content_time) {
              return {
                ...slot,
                scheduledPost: undefined
              };
            }
            return slot;
          })
        };
      }
      return day;
    })
  );
};

  

const generateTimeSlots = (timesHHmm: string[]) => {
  // Sort the times chronologically (they are already in HH:mm format)
  const sortedTimes = [...timesHHmm].sort((a, b) => {
    return a.localeCompare(b);
  });

  // Map each sorted time to a slot object
  return sortedTimes.map(time => ({
    time, // time is already HH:mm string
    isAvailable: true // A slot generated here means it's a time we care about (standard or has a post)
  }));
};
  
  const isDayInactive = (dayOfWeek: string, scheduleData: any[]) => {
  const daySlots = scheduleData.filter(slot => 
    slot.day_of_week.toLowerCase() === dayOfWeek.toLowerCase()
  );
  
  // If no slots exist for this day, consider it active
  if (daySlots.length === 0) return false;
  
  // Check if ALL slots for this day have active_day as false
  return daySlots.every(slot => !slot.active_day);
};

  // **Define the reusable fetch and data processing logic here**
  const fetchUserSchedule = async () => {
    try {
      setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      // Fetch user's schedule slots
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('user_schedule')
        .select('schedule_time, day_of_week, active_day, active_time')
        .eq('email', session.user.email);

      //console.log('Raw Schedule Data:', scheduleData);

      if (scheduleError) throw scheduleError;

      setScheduleData(scheduleData || []);

      const { data: postsData, error: postsError } = await supabase
        .from('user_post_schedule')
        .select(`
          id,
          calendar_name,
          full_content,
          social_channel,
          user_handle,
          user_display_name,
          content_date,
          content_time,
          schedule_status,
          draft_status,
          sent_post
        `)
        .eq('user_email', session.user.email);

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        return;
      }

      const { data: channelsData, error: channelsError } = await supabase
        .from('social_channels')
        .select(`
          avatar_url,
          handle,
          social_channel
        `)
        .eq('email', session.user.email);

      

      if (channelsError) {
        console.error('Error fetching channels:', channelsError);
        return;
      }

      
      const availableSlots = (scheduleData || []).reduce((acc, slot) => {
        const day = slot.day_of_week.toLowerCase();
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(slot.schedule_time);
        return acc;
      }, {} as Record<string, string[]>);
      

      const combinedData = postsData.map(post => {
        const matchingChannel = channelsData.find(
          channel => channel.social_channel === post.social_channel
        );
        return {
          ...post,
          id: post.id,
          campaign_name: post.calendar_name,
          content: post.full_content, 
          avatar_url: matchingChannel?.avatar_url,
          handle: matchingChannel?.handle,
        };
      });

      const postsMap = (combinedData || []).reduce((acc, post) => {
        const timeWithoutSeconds = post.content_time.substring(0, 5);
        const key = `${post.content_date}_${timeWithoutSeconds}`;
        acc[key] = post;
        return acc;
      }, {} as Record<string, PostData>);


// Start code for TimeSlots Availability      
const isTimeSlotInactive = (dayOfWeek: string, timeSlot: string, scheduleData: any[]) => {

 const matchingSlot = scheduleData.find(slot =>
    slot.day_of_week.toLowerCase() === dayOfWeek.toLowerCase() &&
    slot.schedule_time.substring(0, 5) === timeSlot
  );

  if (!matchingSlot) {
     //console.log('No matching slot found for Day:', dayOfWeek, 'Target timeSlot (HH:mm):', timeSlot, 'in scheduleData.');
     return false; 
    // No matching slot means it's not *inactive* from the schedule perspective
  }

  // Return true if active_time is false (meaning the slot is inactive)
  return !matchingSlot.active_time;
};  

const calculateDisabledSlotTime = (date: Date, time: string, scheduleData: any[]) => {
  const dayOfWeek = format(date, 'EEEE').toLowerCase();
  
  // First check if the entire day is inactive
  const isDayDisabled = isDayInactive(dayOfWeek, scheduleData);
  
  if (isDayDisabled) return true;
  
  // Otherwise, check if this specific time slot is inactive
  return isTimeSlotInactive(dayOfWeek, time, scheduleData);
};      

// End code for TimeSlots Availability      

// Start modified section
   
 const scheduledDays = days.map(({ date, dayOfWeek }) => {
    
    const formattedDateForDisplay = formatDateInUserTimezone(date, userTimezone, 'yyyy-MM-dd');
    

   const formattedDate = format(date, 'yyyy-MM-dd');
   //const formattedDate = formatDateInUserTimezone(date, 'yyyy-MM-dd');
   const lowerDayOfWeek = dayOfWeek.toLowerCase();

   const calculatedIsDisabledDay = isDayInactive(lowerDayOfWeek, scheduleData || []);
    
   
   const daySlots = scheduleData?.filter(slot => 
    slot.day_of_week.toLowerCase() === dayOfWeek.toLowerCase()
  ) || [];


      // Get standard schedule times for this day (HH:mm:ss format)
      const standardScheduleTimes = availableSlots[dayOfWeek] || [];

      // Get all posts scheduled for THIS specific day
      const postsForThisDay = combinedData.filter(
        post => post.content_date === formattedDate
      );

      // Extract the content_time (HH:mm:ss format) from posts for this day
      const postTimesForThisDay = postsForThisDay.map(post => post.content_time);

      // Combine standard schedule times and post times Modified
      //const allTimesForDay = [...standardScheduleTimes, ...postTimesForThisDay];

   const allTimesForDay = [...(scheduleData || []).filter(s => s.day_of_week.toLowerCase() === lowerDayOfWeek).map(s => s.schedule_time),
                                 ...(combinedData || []).filter(post => post.content_date === formattedDate).map(post => post.content_time)];

// Get unique times and truncate them to HH:mm for consistency with postsMap keys and UI display
      const allUniqueTimesHHmm = Array.from(new Set(
        allTimesForDay.map(timeString => timeString.substring(0, 5)) 
      )).sort(); 

  
      // Let's adjust generateTimeSlots to accept HH:mm strings directly
      const slots = generateTimeSlots(allUniqueTimesHHmm); 

      return {
        date,
        dayOfWeek,
        isDisabledDay: calculatedIsDisabledDay,
        slots: slots.map(slot => {
          // slot.time is now HH:mm string because generateTimeSlots produces HH:mm strings
          const displayTime = formatTimeInUserTimezone(slot.time, date, userTimezone);
          const postKey = `${formattedDate}_${slot.time}`; // Key is YYYY-MM-DD_HH:mm
          const post = postsMap[postKey]; // Lookup in postsMap which uses YYYY-MM-DD_HH:mm keys

          // Calculate if this slot should be disabled
        const isSlotDisabled = calculateDisabledSlotTime(date, slot.time, scheduleData || []);
          
          return {
            ...slot,
            displayTime,
            // scheduledPost will be undefined if no post exists for this specific HH:mm time
            scheduledPost: post ? {
              ...post,
              avatar_url: post.avatar_url || null, // Use the combined avatar_url
              displayTime
            } : undefined,
            //active_day: !isDayDisabled,
             // isAvailable might need adjustment depending on if you want to mark
             // standard slots differently from custom post times.
             // For now, if a slot exists, it's 'available' for display.
            //isAvailable: true // A slot is generated if it's a standard slot or has a post
            isAvailable: !isSlotDisabled, // Update isAvailable based on the slot's active status
            isDisabled: isSlotDisabled // Add a new property to explicitly track disabled state
          };
        })
      };
    });

      
// End of the Modified Section
      
      setSchedules(scheduledDays);
    } catch (err) {
      console.error('Error fetching schedule data:', err);
    } finally {
      setIsLoading(false);
    }
  }; // end of fetchUserSchedule


  // Use useEffect to call the reusable function on component mount
  useEffect(() => {
    fetchUserSchedule(); // Call the reusable function
  }, []); // Empty dependency array means this runs once on mount

  // Pass this to SchedulePostModal
  const handlePostScheduled = async (newPost: PostData) => {
    handleSchedulePost(newPost);
  // Then refresh the data in the background
 //await fetchUserSchedule();
  };

  const handleNewPost = async (date: Date, time: string) => {

    // Check for connected social accounts first
    const socials = await checkConnectedSocials();
  
  if (!socials || (!socials.bluesky && !socials.linkedin)) {
    // No social accounts connected, show NoSocialModal
    setShowNoSocialModal(true);
    return;
  }

 // Then validate the date
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
  
  if (date < today) {
    // Date is in the past, show warning modal
    setInvalidDate(date);
    setIsDateWarningModalOpen(true);
    return;
  }    
    
    // Implementation for new post creation
    //console.log('Creating new post for:', format(date, 'PPP'), 'at', time);
    setSelectedDate(date);
    setSelectedTime(time);
    setIsModalOpen(true);
  };

const handleEditPost = (post: PostData) => {
   // Ensure post has an ID from the database
  if (!post.id) {
    console.error('Post ID is missing');
    return;
  }
  setSelectedPostForEdit(post);
  setIsEditModalOpen(true);
};


// Add these handlers in ManageSchedule component
const handlePostUpdate = (updatedPost: PostData) => {
  // Update the schedules state with the updated post
  setSchedules(prev => 
    prev.map(day => {
      if (format(day.date, 'yyyy-MM-dd') === updatedPost.content_date) {
        return {
          ...day,
          slots: day.slots.map(slot => {
            if (slot.time === updatedPost.content_time) {
              return {
                ...slot,
                scheduledPost: updatedPost
              };
            }
            return slot;
          })
        };
      }
      return day;
    })
  );
  
  // Refresh the schedule data
  fetchUserSchedule();
  
};

const handleUpdateError = (error: any) => {
  console.error('Error updating post:', error);
  // Optionally show an error message to the user
};

// Add this function to handle post deletion
//const handleDelete = async (postId: string) => {
  
const handleDelete = async (postId: string) => {  
   if (!postId) {
    console.error('Post ID is missing');
    return;
  }
  try {
    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      throw new Error('No authenticated user found');
    }
    
//console.log("Post Id:", postId);
    
    // Delete the post from the database
    const { error } = await supabase
      .from('user_post_schedule')
      .delete()
      .match({ 
        id: postId,
        user_email: session.user.email // Ensure user can only delete their own posts
      });

    if (error) throw error;

    // Update local state to remove the deleted post
    setSchedules(prev => 
      prev.map(day => ({
        ...day,
        slots: day.slots.map(slot => {
          if (slot.scheduledPost?.id === postId) {
            return {
              ...slot,
              scheduledPost: undefined // Remove the deleted post
            };
          }
          return slot;
        })
      }))
    );

    // Optionally refresh the schedule data
    await fetchUserSchedule();

  } catch (err) {
    console.error('Error deleting post:', err);
    // Handle error (show error message to user)
  }
};

// Add this to trigger the delete modal
const handleDeleteClick = (post: PostData) => {
   if (!post.id) {
    console.error('Post ID is missing');
    return;
  }
  const truncatedContent = truncateText(post.content || post.full_content, 25);
  setSelectedPostForEdit(post); // Store the post to be deleted
  setIsDeleteModalOpen(true);
};

  
const handleConnectBluesky = () => {
  // First close the NoSocialModal
  setShowNoSocialModal(false);
  setIsBlueskyModalOpen(true);
};

const handleCloseBlueskyModal = () => {
  setIsBlueskyModalOpen(false);
};

const handleConnectLinkedIn = () => {
  // Your LinkedIn connection logic (when available)
  setShowNoSocialModal(false);
};
  
//console.log("Schedules State:", schedules);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 mb-8"> 
              <div className="p-2 bg-blue-100 rounded-md"> 
                 <CalendarClock className="w-5 h-5 text-blue-500"/> 
              </div>
        
                <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
            </div>
          
          <div className="flex items-center space-x-4">
             <button
                  onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                  className="flex space-x-2 items-center px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                  {/*viewMode === 'list' ? 'Calendar View' : 'List View'*/}
               
                {viewMode === 'list' ? (
                 
                     <Calendar className="w-4 h-4" />
                 ) : (
                    
                     <List className="w-4 h-4" />
                 )}

      
                  <span>{viewMode === 'list' ? 'Calendar View' : 'List View'}</span>

               
            </button>
            <button 
              onClick={() => setIsTimezoneSelectorOpen(true)}      
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Timezone: {userTimezone}</span>
            </button>
          </div>
        </div>

{/* Schedule List View */}
 {viewMode === 'list' ? (        
        <div className="space-y-8">
          {schedules.map((day) => (
            <div key={day.date.toISOString()} className="bg-white rounded-lg shadow-sm">
              {/* Day Header */}
              <div className="px-6 py-4 border-b border-gray-200">
               
                 <h2 className={`text-lg font-semibold ${day.isDisabledDay ? 'text-gray-300' : 'text-blue-500'}`}>
                  {format(day.date, "EEEE, d MMMM")}
                </h2>
                
              {day.isDisabledDay && (
                    <span className="px-2.5 py-0.5 text-xs bg-red-50 text-red-500 rounded-full border border-red-200">
                        Disabled
                    </span>
                    )}
              </div>

              {/* Time Slots */}
              <div className="divide-y divide-gray-100">
                {day.slots.map((slot) => (
                  <div 
                      key={slot.time} 
                      className={`px-6 bg-white py-3 flex items-center justify-between ${
                          slot.isDisabled ? 'bg-gray-100 opacity-50' :
                          slot.isAvailable ? 'hover:bg-gray-50' : 'bg-gray-50'
                          }`}
                    >
                    <div className="flex items-center space-x-6">
                      <div className="w-24 flex-shrink-0">
                        <span className={`text-sm font-medium ${day.isDisabledDay ? 'text-gray-300' : 'text-gray-900'}`}>
                          
                          {/*slot.time.substring(0, 5)*/}

                          {slot.displayTime.substring(0,5) || formatTimeInUserTimezone(slot.time, day.date, userTimezone)}
                        </span>
  
                      </div>
          
                       {slot.scheduledPost ? (
                        <div className="flex items-start space-x-3 p-1 bg-white shadow-sm shadow-blue-100 rounded-md border hover:bg-white hover:border-0 w-full relative">

                          

                          <div className="relative flex-shrink-0">
                         
                            <img
                              src={slot.scheduledPost.avatar_url || `https://ui-avatars.com/api/?name=${slot.scheduledPost.user_handle}`}
                              alt={slot.scheduledPost.user_handle}
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-gray-50 rounded-full p-1 shadow-sm">
                              <img
                                src={slot.scheduledPost.social_channel === 'Bluesky' ? BlueskyLogo
                                : slot.scheduledPost.social_channel === 'LinkedIn' ? LinkedInLogo
                                : BlueskyLogo} // Fallback just in case
                                alt={slot.scheduledPost.social_channel}
                                className="w-3 h-3"
                              />
                            </div>
                        </div>
                {/* Add the buttons container */}
                <div className="absolute  top-1 right-1 flex space-x-1 z-10">
 <button
                            onClick={() => handleNewPost(day.date, slot.time)}
                            className="ml-auto flex items-center space-x-1 px-2 py-1 text-xs bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-md transition-colors"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>New Post</span>
                          </button>
                    
                    <button
                        onClick={() => {
                            setSelectedPostForNow(slot.scheduledPost);
                            setIsPostWarningModalOpen(true);
                            }}
                       className="p-1 flex-1 items-center rounded-md text-gray-500 bg-gray-50 hover:text-green-700 hover:bg-green-100 transition-colors"
                       title="Post Now"
                     >
                        <Send className="w-3 h-3" />
                      
                    </button>
                    
                    <button
                       onClick={() => handleEditPost(slot.scheduledPost)}
                       className="p-1 rounded-md text-gray-500 bg-gray-50 hover:text-blue-500 hover:bg-blue-100 transition-colors"
                       title="Edit post"
                     >
                        <SquarePen className="w-3 h-3" />
                    </button>
                    <button
                       onClick={() => handleDeleteClick(slot.scheduledPost)}
                       className="p-1 rounded-md text-red-300 bg-red-50 hover:text-red-500 hover:bg-red-100 transition-colors"
                       title="Delete post"
                     >
                           <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                                    
                  <div className="flex flex-col flex-1 pr-8"> 
                      <div className="flex flex-col mb-1"> 
                              <p className="text-sm font-semibold text-gray-900 leading-none">
                                {slot.scheduledPost.user_display_name || slot.scheduledPost.user_handle}
                              </p>

                              {/* User Handle */}
                              {slot.scheduledPost.user_display_name && (                
                                 <p className="font-normal text-xs text-gray-500 leading-none">
                                  @{slot.scheduledPost.user_handle}
                                 </p>
                              )}
                         </div> 
                                 
                            {/* Post Content */}                           
                            <div className={`mt-6 text-sm ${day.isDisabledDay ? 'text-gray-300' : 'text-gray-900'}`}>  
                              
                              <p className="line-clamp-1"> 
                                {/*slot.scheduledPost.content*/}
                                {truncateText(slot.scheduledPost.content,100)}
                              </p>
                            </div>  

                          {/* Add gray line divider here */}
                          <div className="mt-4 border-t border-gray-100"></div>
  
                          {/* Add Pause Post button in bottom right */}
                          <div className="flex justify-end mt-2">
                            
{/* Pause/Activate Post button */}
<button
  // Use a template literal for the className string
  className={`
    text-xs px-2 py-1 rounded-md // Base styles for size, padding, shape

    ${slot.scheduledPost.sent_post // --- Check for Posted Successfully FIRST ---
      ? 'bg-green-50 text-green-500 cursor-not-allowed' // Posted Successfully style
      : isPausingPost === slot.scheduledPost.id // --- Else, Check if THIS post is currently loading ---
        ? // --- Loading State Styles ---
          // Apply colors based on the *current* status (what it was before clicking)
          slot.scheduledPost.schedule_status // Check status *before* toggle for loading color
            ? 'bg-yellow-50 text-yellow-700 opacity-70 cursor-not-allowed' // Pausing (from true)
            : 'bg-green-100 text-green-700 opacity-70 cursor-not-allowed' // Activating (from false)
        : // --- Else, Normal State Styles (Not Sent, Not Loading) ---
          // Apply colors based on the current schedule_status
          slot.scheduledPost.schedule_status
          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' // Pause style (status is true)
          : 'bg-green-100 text-green-700 hover:bg-green-200' // Activate style (status is false)
    }
  `}
  onClick={(e) => {
    // Only trigger the action if the post hasn't been sent
    if (!slot.scheduledPost.sent_post) {
      e.stopPropagation(); // Prevent click from bubbling up if needed
      handlePausePost(slot.scheduledPost.id);
    }
  }}
  // Button is disabled if already sent OR currently in the pausing/activating loading state
  disabled={
    slot.scheduledPost.sent_post ||
    isPausingPost === slot.scheduledPost.id
  }
>
  {/* --- Button Text Content Logic --- */}
  {slot.scheduledPost.sent_post ? ( // Check for Posted Successfully FIRST
    'Post Sent'
  ) : isPausingPost === slot.scheduledPost.id ? ( // Else, Check loading state
    <span className="flex items-center">
      {/* Spinner uses gray, which is fine for a loading indicator */}
      <div className="animate-spin h-3 w-3 border-2 border-gray-500 border-t-transparent rounded-full mr-1"></div>
      {/* Loading text based on status *before* the toggle */}
      {slot.scheduledPost.schedule_status ? 'Pausing...' : 'Activating...'}
    </span>
  ) : ( // Else, Normal text based on schedule_status
    slot.scheduledPost.schedule_status ? 'Pause Post' : 'Activate Post'
  )}
</button>

                          </div>

                          {/*End of Add Gray Line*/}
                          </div> 
                       </div>
                    ) : (
                        
                    slot.isAvailable && (
                      <div className="flex-1 bg-gray-50 rounded-md w-full">
                          <button
                            onClick={() => handleNewPost(day.date, slot.time)}
                            className={`flex rounded-md items-center p-1 space-x-2 text-sm ${day.isDisabledDay ? 'text-gray-300 hover:text-blue-300 hover:bg-blue-400 hover:text-white' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-500 hover:text-white'}`}>

                            
                            <PlusCircle className="w-4 h-4" />
                            <span>New Post</span>
                          </button>
                        </div>
                        )
                      )}           
                    
                    </div>                         
                  </div>
              
                ))}
              </div>
            </div>
          ))}
        </div>
  ) : (
            <CalendarView 
              schedules={schedules}
              onNewPost={handleNewPost}
              onEditPost={handleEditPost}
              onDeletePost={handleDeleteClick}
              onPostScheduled={handlePostScheduled}
              onPostUpdate={handlePostUpdate}
              onScheduleError={handleScheduleError}
              isLoading={isLoading}
            />
        )}
        
             {selectedDate && (
                <SchedulePostModal
                    isOpen={isModalOpen}
                    onClose={() => {
                    setIsModalOpen(false);
                    setSelectedDate(null);
                    setSelectedTime('');
                    fetchUserSchedule();  
                  }}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSchedule={handlePostScheduled}
                  onScheduleError={handleScheduleError}
                />
               )}

        
                {selectedPostForEdit && (
                  <EditSchedulePostModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                      setIsEditModalOpen(false);
                      setSelectedPostForEdit(null);
                      }}
                    post={selectedPostForEdit}
                    onUpdate={handlePostUpdate}
                    onError={handleUpdateError}
                      />
                  )}

                {selectedPostForEdit && (
                  <DeleteWarningModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={() => handleDelete(selectedPostForEdit.id)}
                    message="Are you sure you want to delete this post?"
                    itemToDelete={truncateText(selectedPostForEdit.content || selectedPostForEdit.full_content, 25)}
                  />)}


                  <NoSocialModal
                      isOpen={showNoSocialModal}
                      onClose={() => setShowNoSocialModal(false)}
                      onConnectBluesky={handleConnectBluesky}
                      onConnectLinkedIn={handleConnectLinkedIn}
                    />

                  <CreateBlueskyModal 
                    isOpen={isBlueskyModalOpen}
                    onClose={handleCloseBlueskyModal}
                  />

                  {invalidDate && (
                    <ScheduleDateWarningModal
                      isOpen={isDateWarningModalOpen}
                      onClose={handleCloseWarningModal}
                      selectedDate={invalidDate}
                    />
                  )}

                <PostNowWarningModal
                    isOpen={isPostWarningModalOpen}
                    onClose={() => {
                        setIsPostWarningModalOpen(false);
                        setSelectedPostForNow(null);
                      }}
                    onConfirm={() => {
                  // Handle successful post
                  fetchUserSchedule(); // Refresh data after posting
                    }}
                    message="Are you sure you want to post this content now?"
                    postContent={selectedPostForNow?.full_content || selectedPostForNow?.content}
                    userHandle={selectedPostForNow?.user_handle}
                    />

                  {/* Add this at the bottom of the component, alongside other modals */}
                <TimezoneSelectorModal
                    isOpen={isTimezoneSelectorOpen}
                    onClose={() => setIsTimezoneSelectorOpen(false)}
                    selectedTimeZone={userTimezone}
                    onSave={handleSaveTimezone}
                    userId={currentUserId} // Pass the user ID if available
                    />


        
      </div>
    </div>
  );
}

export default ManageSchedule;