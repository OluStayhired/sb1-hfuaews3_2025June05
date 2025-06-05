import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
         isSameDay, addMonths, subMonths, parseISO, isToday, addDays, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, PlusCircle, SquarePen, Trash2, Send, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { SchedulePostModal } from './SchedulePostModal';
import { EditSchedulePostModal } from './EditSchedulePostModal';
import { ReschedulePostModal } from '/src/components/ReschedulePostModal';
import { DeleteWarningModal } from './DeleteWarningModal';
import { CreateBlueskyModal } from './CreateBlueskyModal';
import { checkConnectedSocials, checkPlatformConnection } from '../utils/checkConnectedSocial';
import { NoSocialModal } from './NoSocialModal';
import { ScheduleDateWarningModal } from './ScheduleDateWarningModal';
import { PostNowWarningModal } from './PostNowWarningModal';
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
import { TooltipHelp } from '../utils/TooltipHelp';


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
  schedule_status?: boolean; 
  sent_post?: boolean;  
  draft_status?: boolean;
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

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: PostData[];
  isDisabled: boolean;
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  //const [userTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [userTimezone, setUserTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [selectedPostForEdit, setSelectedPostForEdit] = useState<PostData | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPostWarningModalOpen, setIsPostWarningModalOpen] = useState(false);
  const [showNoSocialModal, setShowNoSocialModal] = useState(false);
  const [isBlueskyModalOpen, setIsBlueskyModalOpen] = useState(false);
  const [isMoreAccountsModalOpen, setIsMoreAccountsModalOpen] = useState(false);
  const [isDateWarningModalOpen, setIsDateWarningModalOpen] = useState(false);
  const [invalidDate, setInvalidDate] = useState<Date | null>(null);
  const [optimisticPosts, setOptimisticPosts] = useState<PostData[]>([]);
  const [selectedPostForNow, setSelectedPostForNow] = useState<PostData | null>(null);
  
  const [scheduleStatus, setScheduleStatus] = useState<boolean>(true);
  const [draftStatus, setDraftStatus] = useState<boolean>(false);      
  const [sentPost, setSentPost] = useState<boolean>(false);       

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedPostForReschedule, setSelectedPostForReschedule] = useState<PostData | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);


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
  
  const formatPostTimeForDisplay = (
  postDate: Date,
  postTimeString: string,
  socialAccountTimezone: string,
  userViewingTimezone: string,
  formatString: string
): string => {
  try {
    const datePart = format(postDate, 'yyyy-MM-dd');
    const combinedDateTimeString = `${datePart} ${postTimeString}`;
    const momentInSourceTzUtc = zonedTimeToUtc(combinedDateTimeString, socialAccountTimezone);
    return formatInTimeZone(momentInSourceTzUtc, userViewingTimezone, formatString);
} catch (error) {
     console.error('Error formatting post time:', error, {
      postDate,
      postTimeString,
      socialAccountTimezone,
      userViewingTimezone
    });
    return postTimeString.substring(0, 5);
  }
};


const handleRescheduleClick = (postToReschedule: PostData) => {
  setSelectedPostForReschedule(postToReschedule);
  setIsRescheduleModalOpen(true);
};  
 
const handleRequestMoreBskyAcct = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    const { data: existingAccounts, error } = await supabase
      .from('social_channels')
      .select('id')
      .match({
        email: session.user.email,
        social_channel: 'Bluesky'
      });

    if (error) throw error;

    if (existingAccounts && existingAccounts.length > 0) {
      setIsMoreAccountsModalOpen(true);
    }
  } catch (err) {
    console.error('Error checking Bluesky accounts:', err);
  }
};
// End Check Bluesky Connections

// Start Auto Connect Bluesky Connection
const handleBlueskyButtonClick = async () => {
  const hasActiveSession = await checkPlatformConnection('Bluesky');
  
  if (hasActiveSession) {
    //console.log('account has an active session')
    handleRequestMoreBskyAcct();
  } else {
    //console.log('account DOES NOT have an active session')
    handleConnectBluesky();
  }
};


// End Auto Connect Bluesky Connection  

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

const calculateDisabledSlotTime = (date: Date, time: string, scheduleData: any[]) => {
  const dayOfWeek = format(date, 'EEEE').toLowerCase();
  
  // First check if the entire day is inactive
  const isDayDisabled = isDayInactive(dayOfWeek, scheduleData);
  
  if (isDayDisabled) return true;
  
  // Otherwise, check if this specific time slot is inactive
  return isTimeSlotInactive(dayOfWeek, time, scheduleData);
};        


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

      setPosts(combinedData);

      const postsMap = (combinedData || []).reduce((acc, post) => {
        const timeWithoutSeconds = post.content_time.substring(0, 5);
        const key = `${post.content_date}_${timeWithoutSeconds}`;
        acc[key] = post;
        return acc;
      }, {} as Record<string, PostData>);

 

      
// Start modified section
   
 const scheduledDays = days.map(({ date, dayOfWeek }) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
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
        const postKey = `${formattedDate}_${slot.time}`; // Key is YYYY-MM-DD_HH:mm
        const post = postsMap[postKey]; // Lookup in postsMap which uses YYYY-MM-DD_HH:mm keys

        // Calculate if this slot should be disabled
        const isSlotDisabled = calculateDisabledSlotTime(date, slot.time, scheduleData || []);
          
        return {
            ...slot,
            // scheduledPost will be undefined if no post exists for this specific HH:mm time
            scheduledPost: post ? {
              ...post,
              avatar_url: post.avatar_url || null // Use the combined avatar_url
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
    console.log('Creating new post for:', format(date, 'PPP'), 'at', time);
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

 // Add month navigation
  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Generate calendar days
const calendarDays = React.useMemo(() => {
  // Get the first day of the month
  const firstDayOfMonth = startOfMonth(currentMonth);
  
  // Get the last day of the month
  const lastDayOfMonth = endOfMonth(currentMonth);
  
  // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
  const startDayIndex = firstDayOfMonth.getDay();
  
  // Calculate days from previous month to fill the first row
  const prevMonthDays = [];
  if (startDayIndex > 0) {
    // Add days from previous month to align with weekday headers
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(firstDayOfMonth);
      prevDate.setDate(prevDate.getDate() - (i + 1));
      prevMonthDays.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: isToday(prevDate),
        posts: posts.filter(post => isSameDay(parseISO(post.content_date), prevDate)),
        isDisabled: true // Disable previous month days
      });
    }
  }

   // Get all days in the current month
  const currentMonthDays = eachDayOfInterval({ 
    start: firstDayOfMonth, 
    end: lastDayOfMonth 
  }).map(day => ({
    date: day,
    isCurrentMonth: true,
    isToday: isToday(day),
    posts: posts.filter(post => isSameDay(parseISO(post.content_date), day)),
    isDisabled: isDayInactive(format(day, 'EEEE').toLowerCase(), scheduleData)
  }));
  
  // Calculate how many days we need from the next month to complete the grid
  const totalDaysDisplayed = Math.ceil((startDayIndex + lastDayOfMonth.getDate()) / 7) * 7;
  const nextMonthDaysCount = totalDaysDisplayed - (prevMonthDays.length + currentMonthDays.length);
  
  // Add days from next month
  const nextMonthDays = [];
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    const nextDate = new Date(lastDayOfMonth);
    nextDate.setDate(nextDate.getDate() + i);
    nextMonthDays.push({
      date: nextDate,
      isCurrentMonth: false,
      isToday: isToday(nextDate),
      posts: posts.filter(post => isSameDay(parseISO(post.content_date), nextDate)),
      isDisabled: true // Disable next month days
    });
  }
  
  // Combine all days
  return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
}, [currentMonth, posts, scheduleData]);
 
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

const handleEmptySlotClick = (date: Date, time: string) => {
  // Check if this slot is disabled
  const isSlotDisabled = calculateDisabledSlotTime(date, time, scheduleData);
  
  // Only allow adding posts to enabled slots
  if (!isSlotDisabled) {
    handleNewPost(date, time);
  }
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
    <div className="p-2">
      <div className="max-w-8xl mx-auto">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-4">
            <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {/* Weekday Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 py-2 text-center text-sm font-medium text-blue-500">
              {day}
            </div>
          ))}

          
          
          {/* Calendar Days */}
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              className={`min-h-[120px] bg-white p-2 ${
                !day.isCurrentMonth ? 'bg-gray-50' : ''
              } ${
                day.isToday ? 'ring-2 ring-blue-500' : ''
              } ${
                day.isDisabled ? 'opacity-50' : ''
              }`}
            >
              <div className="font-medium text-sm mb-1">
                {format(day.date, 'd')}
              </div>
              
        {/* Start Posts for this day */}
              <div className="space-y-1">
          {day.posts.map(post => {
            // Extract time from post.content_time (HH:mm:ss format)
            const postTime = post.content_time.substring(0, 5); // Get HH:mm

            //console.log('Day date:', day.date);
            //console.log('Post time:', postTime);
            //console.log('Schedule data:', scheduleData);  
  
           // Check if this post's time slot is disabled
            const isPostSlotDisabled = calculateDisabledSlotTime(day.date, postTime, scheduleData);

          //console.log('Is post slot disabled:', isPostSlotDisabled);              
  
          return (
            <div 
                  key={post.id} 
                  className={`group relative ${isPostSlotDisabled ? 'opacity-50' : ''}`}
            >
              <div className={`flex items-center space-x-2 p-1 ${
                post.sent_post
                     ? 'bg-green-50 hover:bg-green-100'
                : post.draft_status
                    ? 'bg-red-50 hover:bg-red-100' 
                 : isPostSlotDisabled 
                    ? 'bg-gray-200 text-gray-400' 
                    : 'bg-gray-100 hover:bg-gray-50'
              } rounded`}>
                {/* Avatar and content rendering */}
                <div className="relative flex-shrink-0">
                  <img 
                      src={post.avatar_url || `https://ui-avatars.com/api/?name=${post.user_handle}`}
                      className={`w-6 h-6 rounded-full border ${
                      isPostSlotDisabled ? 'border-gray-300' : 'border-gray-200'
                  }`}
                  alt={post.user_handle}
                />
                <div className="absolute -bottom-0.5 -right-0.5 bg-gray-50 rounded-full p-0.5 shadow-sm">
                  <img 
                      src={
                            post.social_channel === 'Bluesky' 
                            ? BlueskyLogo 
                            : post.social_channel === 'LinkedIn'
                            ? LinkedInLogo 
                            : XLogo
                      }

                      className="w-3 h-3"
                      alt={post.social_channel}
                  />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                    <span className={`text-xs font-medium ${
                      isPostSlotDisabled ? 'text-gray-400' : 'text-gray-900'
                    }`}>
                      {formatPostTimeForDisplay(
                        day.date,
                        post.content_time,
                        post.timezone,
                        userTimezone,
                        'h:mm a'
                        )}
                      {/*{postTime}*/}

                      
                    </span>
                </div>
                  <p className={`text-xs ${
                      isPostSlotDisabled ? 'text-gray-400' : 'text-gray-600'
                  } truncate`}>
                      {post.content}
                  </p>
              </div>
            </div>
      
            {/* Action buttons - only show if not disabled */}
            {!isPostSlotDisabled && (
              <div className="absolute top-0 right-0 hidden group-hover:flex items-center space-x-1 p-1 bg-white rounded-lg shadow-sm">

                <TooltipHelp text="Post now">
                  <button 
                      onClick={() => {
                            setSelectedPostForNow(post);
                            setIsPostWarningModalOpen(true);
                            }}
                      className="p-1 rounded-md text-gray-500 bg-gray-50 hover:text-green-700 hover:bg-green-100 transition-colors">
                      <Send className="w-3 h-3" />           
                  </button>
              </TooltipHelp>
             
              <TooltipHelp text="Schedule post">
                  <button
                        onClick={() => handleRescheduleClick(post)}
                        className="p-1 rounded-md text-gray-500 bg-gray-50 hover:text-yellow-600 hover:bg-yellow-100 transition-colors">
  
                      <Calendar className="w-3 h-3" /> 
                    </button>
              </TooltipHelp>

                <TooltipHelp text="Edit post">
                  <button 
                        onClick={() => handleEditPost(post)} 
                        className="p-1 rounded-md text-gray-500 bg-gray-50 hover:text-blue-500 hover:bg-blue-100 transition-colors" 
                       >
                    <SquarePen className="w-3 h-3" />
                  </button>
                </TooltipHelp>

                <TooltipHelp text="Delete post">
                  <button 
                        onClick={() => handleDeleteClick(post)} 
                        className="p-1 rounded-md text-red-300 bg-red-50 hover:text-red-500 hover:bg-red-100 transition-colors" 
                        title="Delete post">
                      <Trash2 className="w-3 h-3" />
                  </button>
              </TooltipHelp>
              
              </div>
              )}
          </div>
          );
        })}


               {/* End Posts for this day */}
                                    
             {!day.isDisabled && (
                <button
                  onClick={() => handleNewPost(day.date)}
                  className="w-full text-xs text-gray-500 hover:text-blue-500 flex items-center justify-center space-x-1 p-1 rounded hover:bg-blue-50"
                >
                    <PlusCircle className="w-3 h-3" />
                    <span>Add Post</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
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
                    //handlePostNow(selectedPostForNow);
                      fetchUserSchedule(); // Refresh data after posting
                    }}
                    message="Are you sure you want to post this content now?"
                    postContent={selectedPostForNow?.full_content || selectedPostForNow?.content}
                    userHandle={selectedPostForNow?.user_handle}
                    postId={selectedPostForNow?.id}
                    socialChannel={selectedPostForNow?.social_channel}
                    />

                    {selectedPostForReschedule && (
                      <ReschedulePostModal
                          isOpen={isRescheduleModalOpen}
                          onClose={() => {
                            setIsRescheduleModalOpen(false);
                            setSelectedPostForReschedule(null);
                              }}
                          post={selectedPostForReschedule}
                          onUpdate={handlePostUpdate} // <--- HERE IT IS!
                          onError={handleUpdateError}
                          />
                      )}
        
      </div>
    </div>
  );
}

export default CalendarView;