import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, addDays, parseISO } from 'date-fns';
import { Plus, Clock, ChevronLeft, ChevronRight, Trash2, SquarePen, Send, PlusCircle, Calendar, List, CalendarClock, X, Loader2, ImagePlus, Copy, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ReschedulePostModal } from '/src/components/ReschedulePostModal';
import { SchedulePostModal } from '/src/components/SchedulePostModal';
import { EditSchedulePostModal } from '/src/components/EditSchedulePostModal';
import { DeleteWarningModal } from '/src/components/DeleteWarningModal';
import { CalendarView } from '/src/components/CalendarView';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { checkConnectedSocials, checkPlatformConnection } from '../utils/checkConnectedSocial';
import { CreateBlueskyModal } from './CreateBlueskyModal';
import { NoSocialModal } from './NoSocialModal';
import { ScheduleDateWarningModal } from './ScheduleDateWarningModal';
import { PostNowWarningModal } from './PostNowWarningModal';
import { TimezoneSelectorModal } from './TimezoneSelectorModal';
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
import { TooltipHelp } from '../utils/TooltipHelp';
import { TooltipExtended } from '../utils/TooltipExtended';
import { uploadImageGetUrl } from '../utils/UploadImageGetUrl';
import { deletePostImage } from '../utils/DeletePostImage';
import { uploadVideoGetUrl } from '../utils/UploadVideoGetUrl';


// Add new interfaces for post data
interface PostData {
  id: string;
  user_id: string;
  campaign_name: string;
  content: string;
  social_channel: string;
  user_handle: string;
  user_display_name: string | null;
  avatar_url?: string | null;
  content_time: string;
  content_date?: string; // recently added
  photo_url?: string | null;
  video_url?: string | null;
  video_thumbnail_url?: string;
  target_timezone?: string;
  social_channels?: {
    avatar_url: string | null;
    handle: string;
  };
  schedule_status: boolean;
  sent_post: boolean;
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
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedPostForReschedule, setSelectedPostForReschedule] = useState<PostData | null>(null);

    // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentPostIdRef = useRef<string | null>(null);
  // State to track which post is currently uploading an image
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const [copyingPostId, setCopyingPostId] = useState<string | null>(null); // NEW: State for copying loading
  const [copySuccessMessage, setCopySuccessMessage] = useState<string | null>(null); // NEW: State for copy success

  const containerRef = useRef(null);
  const [scrollPosition, setScrollPosition] = useState(0);

const [isContentExpanded, setIsContentExpanded] = useState<{ [postId: string]: boolean }>({});
const [expandedPosts, setExpandedPosts] = useState<{ [postId: string]: boolean }>({});  

 // --- NEW STATE & REF FOR VIDEO UPLOAD ---
const [uploadingVideoId, setUploadingVideoId] = useState<string | null>(null); // New loading state for video uploads
const videoFileInputRef = useRef<HTMLInputElement>(null); // New ref for video file input 
const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);  

  //LinkedIn VITE
  const VITE_LINKEDIN_POSTER_URL = import.meta.env.VITE_LINKEDIN_POSTER_URL;

  //Twitter VITE
  const VITE_TWITTER_POSTER_URL = import.meta.env.VITE_TWITTER_POSTER_URL;

  useEffect(() => {
    fetchUserSchedule();
  }, [viewMode]);

  // 3. RESTORE the scroll position after the DOM has been updated
  useLayoutEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollPosition;
    }
  }, [schedules, scrollPosition]);

  const handleViewModeChange = (newViewMode: 'list' | 'calendar') => {
    setViewMode(newViewMode);
    fetchUserSchedule(); // Call fetchUserSchedule directly
  };  

  //const handleToggleExpansion = () => {
  //setIsThisPostExpanded(prev => !prev);
//};

// This function will toggle the expansion state for a specific post
  const handleToggleExpansion = (postId: string) => {
    //console.log("execute handleToggleExpansion", expandedPosts)
    console.log("execute handleToggleExpansion for postId:", postId);
    setExpandedPosts(prevState => ({
      ...prevState,
      [postId]: !prevState[postId] // Toggle the boolean for that postId
    }));
  };  

const handleRescheduleClick = (postToReschedule: PostData) => {
  setSelectedPostForReschedule(postToReschedule);
  setIsRescheduleModalOpen(true);
};


//const toolTipText = {scheduledPost.user_display_name || scheduledPost.user_handle};


  
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
    // console.log('Bluesky connected:', socials.bluesky);
    // console.log('LinkedIn connected:', socials.linkedin);
  }
};

const checkBluesky = async () => {
  const isConnected = await checkPlatformConnection('Bluesky');
  //console.log('Bluesky connected:', isConnected);
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
        slots: day.slots.map(slot => ({
          ...slot,
          scheduledPosts: slot.scheduledPosts.map(scheduledPost => {
            if (scheduledPost.id === postId) {
              return {
                ...scheduledPost,
                schedule_status: newScheduleStatus,
                draft_status: !newScheduleStatus
              };
            }
            return scheduledPost;
          })
        }))
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
    //-- Set the Scroll location here
     //if (containerRef.current) {
      //setScrollPosition(containerRef.current.scrollTop);
       //console.log('--- BEFORE FETCH ---');
    //console.log('Saved scroll position:', currentScrollPosition);
    //}
    
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
          photo_url,
          video_url,
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
          social_channel,
          timezone
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
          timezone: matchingChannel?.timezone,
        };
      });

      
      //const postsMap = (combinedData || []).reduce((acc, post) => {
       // const timeWithoutSeconds = post.content_time.substring(0, 5);
       // const key = `${post.content_date}_${timeWithoutSeconds}`;
        // acc[key] = post;
      // return acc;
      // }, {} as Record<string, PostData>);
      
    // Changed postsMap from 1:1 to Many:1 to handle multiple posts per slot
      const postsMap = (combinedData || []).reduce((acc, post) => {
        const timeWithoutSeconds = post.content_time.substring(0, 5);
        const key = `${post.content_date}_${timeWithoutSeconds}`;
        if (!acc[key]) {
            acc[key] = [];
              }
              acc[key].push(post);
              return acc;
              }, {} as Record<string, PostData[]>);


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

          {/*
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
          */}
          return {
            ...slot,
            // Instead of a single scheduledPost property, use scheduledPosts (plural)
               scheduledPosts: postsForThisDay
                .filter(post => slot.time === post.content_time.substring(0, 5))
                .map(post => ({
                ...post,
                avatar_url: post.avatar_url || null // Use the combined avatar_url
              })),
              isAvailable: !isSlotDisabled,
              isDisabled: isSlotDisabled
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

//-- start useEffect to stop the schedule scrolling up 
useEffect(() => {
  //console.log('--- AFTER RENDER ---');
  //console.log('Current container ref:', containerRef.current);
  //console.log('Scroll position to restore:', scrollPosition);

  if (containerRef.current) {
    containerRef.current.scrollTop = scrollPosition;

    //console.log('Restored scroll position to:', containerRef.current.scrollTop);
  }
}, [copySuccessMessage, scrollPosition]);
//-- end useEffect to stop the schedule scrolling up 
  
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

const handleConnectLinkedInClick = () => {
  // Your LinkedIn connection logic (when available)
  setShowNoSocialModal(false);
};
  
//console.log("Schedules State:", schedules);

// ------------------------ Start handle Copy Post Function ---------------------- //
// NEW : handleCopyPost function

const handleCopyPost = async (postToCopy: PostData) => {
  if (!postToCopy?.id) {
    console.error('Post ID is missing for copy operation.');
    return;
  }

  if (containerRef.current) {
    setScrollPosition(containerRef.current.scrollTop);
  }

  setCopyingPostId(postToCopy.id);
  setCopySuccessMessage(null);

  let optimisticPost = null;

  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    if (!session?.user?.email || !session?.user?.id) {
      throw new Error('No authenticated user found to copy post.');
    }

    // Create the object to be inserted into the database.
    const postDataForDb = {
      user_id: session.user.id,
      user_email: session.user.email,
      full_content: postToCopy.full_content,
      content_time: postToCopy.content_time,
      content_date: postToCopy.content_date,
      photo_url: postToCopy.photo_url,
      social_channel: postToCopy.social_channel,
      user_display_name: postToCopy.user_display_name,
      created_at: new Date().toISOString(),
      sent_post: false,
      schedule_status: false,
      draft_status: false,
      posted_at: null,
      social_post_id: null,
      error_message: null,
    };

    // Create the complete post object for the optimistic UI update
    optimisticPost = {
      ...postDataForDb,
      id: uuidv4(), // Temporary ID for the UI
      avatar_url: postToCopy.avatar_url, // UI-specific data
    };

    // Optimistically update the UI: INSERT the new post
    setSchedules(prevSchedules =>
      prevSchedules.map(daySchedule => {
        if (format(daySchedule.date, 'yyyy-MM-dd') === optimisticPost.content_date) {
          const updatedSlots = [...daySchedule.slots];
          const newSlot = {
            time: optimisticPost.content_time,
            isAvailable: true,
            scheduledPost: optimisticPost, // Use the full optimisticPost object
            isDisabled: false,
          };

          // Insert the new slot in the correct chronological order
          let inserted = false;
          for (let i = 0; i < updatedSlots.length; i++) {
            if (newSlot.time.localeCompare(updatedSlots[i].time) < 0) {
              updatedSlots.splice(i, 0, newSlot);
              inserted = true;
              break;
            }
          }
          if (!inserted) {
            updatedSlots.push(newSlot);
          }
          return { ...daySchedule, slots: updatedSlots }; // Return a new daySchedule object
        }
        return daySchedule; // Return an unchanged daySchedule object
      })
    );

    fetchUserSchedule();
    
    // Insert the data into the database
    const { data: newPostFromDb, error: insertError } = await supabase
      .from('user_post_schedule')
      .insert(postDataForDb)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Final UI update: REPLACE the temporary post with the permanent one
    if (newPostFromDb) {
      const finalPostForUi = {
        ...newPostFromDb,
        avatar_url: postToCopy.avatar_url,
      };

      setSchedules(prevSchedules =>
        prevSchedules.map(daySchedule => ({
          ...daySchedule,
          slots: daySchedule.slots.map(slot => {
            // Find the slot with the temporary ID and replace it
            if (slot.scheduledPost?.id === optimisticPost.id) {
              return { ...slot, scheduledPost: finalPostForUi };
            }
            return slot;
          }),
        }))
      );
    }
    
    setCopySuccessMessage('Post copied successfully!');
    setTimeout(() => setCopySuccessMessage(null), 3000);

  } catch (err: any) {
    console.error('Error copying post:', err);
    // Revert the optimistic update on error. This mirrors the delete pattern.
    if (optimisticPost) {
        setSchedules(prevSchedules =>
          prevSchedules.map(daySchedule => ({
            ...daySchedule,
            slots: daySchedule.slots.filter(slot => slot.scheduledPost?.id !== optimisticPost.id),
          }))
        );
    }
    setCopySuccessMessage(`Failed to copy post: ${err.message || 'Unknown error'}`);
    setTimeout(() => setCopySuccessMessage(null), 5000);

  } finally {
    setCopyingPostId(null);
  }
};
  
// ----------------------- End handle Copy Post Function -------------------------//  
  
//------------------------ Start handle upload image to attach to post ------------------ //

// New handleUploadImage function
const handleUploadImage = (post: PostData) => {
  currentPostIdRef.current = post.id;
  fileInputRef.current?.click(); // Programmatically click the hidden file input
};


// New handleFileChange function
const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  const postId = currentPostIdRef.current;

  if (!file || !postId) {
    console.error('No file selected or postId is missing.');
    return;
  }

  setUploadingImageId(postId); // Set loading state for this specific post

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id; // Get the current authenticated user's ID

    if (!userId) {
      console.error('User not authenticated. Cannot upload image.');
      // Optionally, show an error message to the user
      return;
    }

    const imageUrl = await uploadImageGetUrl(file, userId); // Call the upload utility

    // Update the photo_url column for the specific post in Supabase
    const { error: updateError } = await supabase
      .from('user_post_schedule')
      .update({ photo_url: imageUrl })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating photo_url in database:', updateError);
      // Optionally, show an error message to the user
    } else {
      //console.log('Image uploaded and URL updated successfully:', imageUrl);
      // Refresh the schedule data to display the new image
      fetchUserSchedule();
    }
  } catch (error) {
    console.error('Error during image upload process:', error);
    // Optionally, show a user-friendly error message
  } finally {
    setUploadingImageId(null); // Clear loading state
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input value
    }
    currentPostIdRef.current = null; // Clear the stored postId
  }
};

//------------------------ End handle upload image to attach to post --------------------//  

//------------------------ start handle delete photo ----------------------------//

// New handleDeleteImage function
const handleDeleteImage = async (postId: string) => {
  if (!postId) {
    console.error('Post ID is missing for image deletion.');
    return;
  }

  setDeletingImageId(postId); // Set loading state for this specific post

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id || !session?.user?.email) { // Ensure email is available for security check
      throw new Error('User not authenticated or email not available.');
    }
    const userEmail = session.user.email;

    // First, fetch the current photo_url for the given postId and verify ownership
    const { data: postData, error: fetchError } = await supabase
      .from('user_post_schedule')
      .select('photo_url, user_email') // Select photo_url and user_email for verification
      .eq('id', postId)
      .single();

    if (fetchError) {
      console.error('Error fetching post data for image deletion:', fetchError);
      throw new Error('Failed to retrieve post details for image deletion.');
    }

    if (!postData) {
      console.warn(`Post with ID ${postId} not found.`);
      return; // Post not found, nothing to delete
    }

    // Security check: Ensure the post belongs to the authenticated user
    if (postData.user_email !== userEmail) {
        console.error('Unauthorized attempt to delete image for a post not owned by the user.');
        throw new Error('Unauthorized: You can only delete images from your own posts.');
    }

    // No need to check postData.photo_url here before updating database,
    // as the goal is to ensure it's null regardless of its current state.
    // Also, removed all storage deletion logic as requested.

    // Update the user_post_schedule table, setting photo_url to null
    const { error: updateError } = await supabase
      .from('user_post_schedule')
      .update({ photo_url: null, updated_at: new Date().toISOString() })
      .eq('id', postId) // Match by post ID
      .eq('user_email', userEmail); // Crucial security check: Match by user's email

    if (updateError) {
      console.error('Error updating photo_url to null in Supabase:', updateError);
      throw new Error('Failed to remove image URL from database.');
    }

    // Optimistically update the local state using setSchedules
    setSchedules(prevSchedules =>
        prevSchedules.map(day => ({
            ...day,
            slots: day.slots.map(slot => ({
                ...slot,
                scheduledPosts: slot.scheduledPosts.map(scheduledPost => {
                    if (scheduledPost.id === postId) {
                        // Found the post, update its photo_url to null
                        return {
                            ...scheduledPost,
                            photo_url: null
                        };
                    }
                    return scheduledPost; // Return unchanged post if not the target
                })
            }))
        }))
    );

    //console.log(`Image URL removed from database for post ID: ${postId}.`);

  } catch (err) {
    console.error('Error during image URL deletion process:', err);
    // Here you would typically show a user-friendly error message (e.g., a toast notification)
  } finally {
    setDeletingImageId(null); // Clear loading state
  }
};
 
//----------------------- end handle delete photo ------------------------------//  


// ------------------------ Start handle upload video to attach to post ------------------ //

// New handleUploadVideo function (identical pattern to handleUploadImage)
const handleUploadVideo = (post: PostData) => {
  currentPostIdRef.current = post.id;
  videoFileInputRef.current?.click(); // Programmatically click the hidden video file input
};

// New handleVideoChange function (identical pattern to handleFileChange)
const handleVideoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  const postId = currentPostIdRef.current;

  if (!file || !postId) {
    console.error('No file selected or postId is missing for video upload.');
    return;
  }

  if (!file.type.startsWith('video/')) {
    console.error('Selected file is not a video.');
    return;
  }

  setUploadingVideoId(postId); // Set loading state for this specific post's video upload

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      console.error('User not authenticated. Cannot upload video.');
      return;
    }

    // Call the NEWLY IMPORTED video upload utility
    const videoUrl = await uploadVideoGetUrl(file, userId); 

    // Update the video_url column for the specific post in Supabase
    const { error: updateError } = await supabase
      .from('user_post_schedule')
      .update({ video_url: videoUrl }) // <-- UPDATING VIDEO_URL
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating video_url in database:', updateError);
    } else {
      console.log('Video uploaded and URL updated successfully:', videoUrl);
      fetchUserSchedule(); // Refresh the schedule data to display the new video
    }
  } catch (error) {
    console.error('Error during video upload process:', error);
  } finally {
    setUploadingVideoId(null); // Clear loading state
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = ''; // Clear the file input value
    }
    currentPostIdRef.current = null; // Clear the stored postId
  }
};

// ------------------------ End handle upload video to attach to post --------------------//  

// ------------------------ Start Handle Delete Video to attach to post ----------------- //
const handleDeleteVideo = async (postId: string) => { // New function for video deletion
  // Implement your video deletion logic here.
  // This would typically involve:
  // 1. Setting deletingVideoId to postId
  // 2. Calling Supabase Storage to delete the video file (e.g., supabase.storage.from('user-post-videos').remove([...]))
  // 3. Updating the user_post_schedule table to set video_url to null for the given postId
  // 4. Calling fetchUserSchedule()
  // 5. Clearing deletingVideoId
  console.log(`Deleting video for post ID: ${postId}`);
  setDeletingVideoId(postId);
  try {
    // Example: Fetch post to get video_url for deletion
    const { data: postData, error: fetchError } = await supabase
      .from('user_post_schedule')
      .select('video_url')
      .eq('id', postId)
      .single();

    if (fetchError || !postData?.video_url) {
      console.error('Failed to fetch video URL for deletion or video URL is missing:', fetchError);
      return;
    }

    // Extract path from public URL
    const videoUrl = postData.video_url;
    const pathSegments = videoUrl.split('/public/');
    if (pathSegments.length < 2) {
      console.error('Invalid video URL for path extraction:', videoUrl);
      return;
    }
    const bucketNameAndPath = pathSegments[1]; // e.g., 'user-post-videos/user_id/videos/filename.mp4'
    const [bucketName, ...filePathParts] = bucketNameAndPath.split('/');
    const filePathInBucket = filePathParts.join('/');

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([filePathInBucket]); // Supabase remove expects an array of paths

    if (storageError) {
      console.error('Error deleting video from storage:', storageError);
      throw storageError;
    }

    // Update database to clear video_url
   const { error: updateError } = await supabase
      .from('user_post_schedule')
      .update({ video_url: null }) // <-- Also clear thumbnail URL
      .eq('id', postId);

    if (updateError) {
      console.error('Error clearing video_url in database:', updateError);
      throw updateError;
    }

    console.log('Video deleted successfully for post ID:', postId);
    fetchUserSchedule();
  } catch (error) {
    console.error('Error during video deletion process:', error);
  } finally {
    setDeletingVideoId(null);
  }
};  
  
// ------------------------ End Handle Delete Video to attach to post ----------------- //  
  
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

          {/* Wrap this into a condition */}
          
          <div className="flex items-center space-x-2 mb-8"> 
              <div className="p-2 bg-blue-100 rounded-md"> 
                 <CalendarClock className="w-5 h-5 text-blue-500"/> 
              </div>
                {viewMode === 'list' ? (
                  <h2 className="text-xl font-semibold text-gray-900">Daily Posts</h2>
              ):(
                <h2 className="text-xl font-semibold text-gray-900">Monthly Posts</h2>
              )}
      
            </div>

<div className="flex items-center space-x-4">
  {/* Segmented control for View Mode */}
  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
    {/* List View Button */}
    <button
      onClick={() => handleViewModeChange('list')} // Explicitly set viewMode to 'list'
      className={`
        flex items-center px-4 py-2 space-x-2 text-sm font-normal
        ${viewMode === 'list' // If viewMode is 'list', this button is active
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-500'
        }
        transition-colors duration-200
        ${viewMode !== 'list' ? 'border-r border-gray-300' : ''} 
      `}
    >

  <span //className="p-1 bg-blue-50 rounded-full">
          className={`
        p-1 rounded-full
        ${viewMode === 'list' // If viewMode is 'calendar', this button is active
          ? 'bg-blue-500 text-white'
          : 'bg-blue-50 text-blue-500 hover:bg-gray-50'
        }
        transition-colors duration-200
      `}>
      
      <List className="w-4 h-4" />

  </span>
      
      <span>List View</span>
    </button>

    {/* Calendar View Button */}
    <button
      onClick={() => handleViewModeChange('calendar')} // Explicitly set viewMode to 'calendar'
      className={`
        flex items-center space-x-2 px-4 py-2 text-sm font-normal
        ${viewMode === 'calendar' // If viewMode is 'calendar', this button is active
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-500'
        }
        transition-colors duration-200
      `}
    >
      <span //className="p-1 bg-blue-50 rounded-full">
          className={`
        p-1 rounded-full
        ${viewMode === 'calendar' // If viewMode is 'calendar', this button is active
          ? 'bg-blue-500 text-white'
          : 'bg-blue-50 text-blue-500 hover:bg-gray-50'
        }
        transition-colors duration-200
      `}>
        
      <Calendar className="w-4 h-4" />
      </span>
      <span>Calendar View</span>
    </button>
  </div>

  {/* The Timezone button remains separate and unchanged */}
  <TooltipHelp text="⚡Reset your local time if travelling"> 
  <button
    onClick={() => setIsTimezoneSelectorOpen(true)}
    className="flex items-center space-x-2 px-4 py-2 hover:text-blue-500 hover:bg-gray-50 bg-white border border-gray-300 rounded-lg text-gray-600">

   <span className="p-1 bg-blue-50 rounded-full">
    <Clock className="w-4 h-4 text-blue-500" />
    </span> 
    
    <span>Timezone: {userTimezone}</span>
       
  </button>
  </TooltipHelp>
 
  </div>
</div>

{/* NEW: Copy Success/Error Message */}
        {copySuccessMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            copySuccessMessage.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          }`}>
            {copySuccessMessage}
          </div>
        )}    

        {/*End Copy Success Error Message */}        

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
                      //key={slot.scheduledPost?.id}
                      className={`px-6 bg-gray-50 py-3 flex items-center justify-between transition-colors duration-200 ${
                          
                          slot.isDisabled ? 'bg-gray-100 opacity-50' :
                          slot.isAvailable ? 'hover:bg-customGray-75' : 'bg-gray-50' 
                          //slot.isAvailable ? 'bg-gray-50' : 'hover:bg-white' 
                          
                        
                          }`}
                    >
                    <div className="flex items-center space-x-6">
                      <div className="w-24 flex-shrink-0">
                        <span className={`text-sm font-medium ${day.isDisabledDay ? 'text-gray-300' : 'text-gray-900'}`}>
                          
                          {slot.time.substring(0, 5)}
                        </span>
  
                      </div>

<input
  type="file"
  ref={fileInputRef}
  onChange={handleFileChange}
  accept="image/*" // Only allow image files
  style={{ display: 'none' }} // Hide the input
/>

<input
  type="file"
  ref={videoFileInputRef} // Use the new ref
  onChange={handleVideoChange} // Use the new handler
  accept="video/*" // Only allow video files
  style={{ display: 'none' }} // Hide the input
/>                      

<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4"> {/*Start New Grid wrapper for max 2 posts per slot*/}
                  {slot.scheduledPosts && slot.scheduledPosts.length > 0 ? (
                    slot.scheduledPosts.map((scheduledPost) => {
                      
                        const isThisPostExpanded = expandedPosts[scheduledPost.id] || false; 

                  return (  //added a new return here since code is added at the top
                        <div 
                            key={scheduledPost.id}
                            //className="flex items-start space-x-3 p-1 bg-white shadow-sm shadow-blue-100 rounded-md border 
                              //      hover:bg-white hover:border-0 w-full relative">

                          className="flex items-start space-x-3 p-1 bg-white rounded-md border border-blue-50 hover:border-blue-100
                                     w-full relative shadow-sm hover:shadow-md">

                          <div className="relative flex-shrink-0">
                         <TooltipHelp text = {`${scheduledPost.user_display_name}`}>
                            <img
                              src={scheduledPost.avatar_url || `https://ui-avatars.com/api/?name=${scheduledPost.user_handle}`}
                              alt={scheduledPost.user_handle}
                              className="w-8 h-8 rounded-full"
                            />
                        </TooltipHelp>
                            <div className="absolute -bottom-1 -right-1 bg-gray-50 rounded-full p-1 shadow-sm">
                              <img
                                src={
                                  scheduledPost.social_channel === 'Bluesky' ? BlueskyLogo
                                : scheduledPost.social_channel === 'LinkedIn' ? LinkedInLogo
                                : XLogo
                                
                                } // Fallback just in case
                                alt={scheduledPost.social_channel}
                                className="w-3 h-3"
                              />
                            </div>
                        </div>
                {/* Add the buttons container */}
                {/* Only Show Button Container When it's a Valid Post */}

                          
                <div className="absolute  top-1 right-1 flex space-x-1 z-10">

                  {scheduledPost.user_handle && ( 
                    <TooltipHelp text="Post now">
                    <button
                        onClick={() => {
                            setSelectedPostForNow(scheduledPost);
                            setIsPostWarningModalOpen(true);
                            }}
                       className="p-1 flex-1 items-center rounded-md text-gray-500 bg-gray-50 hover:text-green-700 hover:bg-green-100 transition-colors"
                       //title="Post Now"
                     >
                        <Send className="w-3 h-3" />
                      
                    </button>

                    </TooltipHelp>  

                     )}

                  {scheduledPost.user_handle && scheduledPost.social_channel === 'LinkedIn' && (
                      <TooltipHelp text="Add video">
                        <button
                          onClick={() => handleUploadVideo(scheduledPost)} // Call new function
                          disabled={uploadingVideoId === scheduledPost.id} // Use new loading state
                          className="p-1 flex-1 items-center rounded-md text-gray-500 bg-gray-50 hover:text-pink-700 hover:bg-pink-100 transition-colors"
                        >
                        {uploadingVideoId === scheduledPost.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" /> // Show spinner while uploading
                           ) : (
                          <Video className="w-3 h-3" /> // Use a video icon (e.g., from Lucide React)
                            )}
                         </button>
                      </TooltipHelp>
                    )}
             
          {scheduledPost.user_handle && ( 
              <TooltipHelp text="Add image">
                    <button
                      onClick={() => handleUploadImage(scheduledPost)} // Call with postId
                      disabled={uploadingImageId === scheduledPost.id}
                      className="p-1 flex-1 items-center rounded-md text-gray-500 bg-gray-50 hover:text-purple-700 hover:bg-purple-100 transition-colors"
                       //title="Post Now"
                     >
                        {uploadingImageId === scheduledPost.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" /> // Show spinner while uploading
                          ) : (
                          <ImagePlus className="w-3 h-3" />
                            )}
                          </button>
                  </TooltipHelp>
               )}

             {scheduledPost.user_handle && (      
                  <TooltipHelp text="Reschedule post">
                    <button
                        onClick={() => handleRescheduleClick(scheduledPost)}
                        className="p-1 rounded-md text-gray-500 bg-gray-50 hover:text-yellow-600 hover:bg-yellow-100 transition-colors" 
                        //title="Reschedule post" 
                      >
  
                      <Calendar className="w-3 h-3" /> 
                    </button>
                  </TooltipHelp>
               )}

            {scheduledPost.user_handle && (    
                  <TooltipHelp text="Edit post">
                    <button
                       onClick={() => handleEditPost(scheduledPost)}
                       className="p-1 rounded-md text-gray-500 bg-gray-50 hover:text-blue-500 hover:bg-blue-100 transition-colors"
                       //title="Edit post"
                     >
                        <SquarePen className="w-3 h-3" />
                    </button>
                  </TooltipHelp>
                     )}


              {!scheduledPost.user_handle && (               
                 
                    <button
                      className={`flex text-xs px-2 py-1 rounded-md items-center p-1 space-x-2 text-sm bg-green-50 text-green-500 hover:text-green-500 hover:bg-green-100}`}>
                      {/*<SquarePen className="w-3 h-3" />*/}
                        <span className="text-xs">Recently Copied!</span>
                    </button>
                  
                
           )}                  
           {/*Useful for changing social account*/}         

                  <TooltipHelp text="Delete post">
                    <button
                       onClick={() => handleDeleteClick(scheduledPost)}
                       className="p-1 rounded-md text-red-300 bg-red-50 hover:text-red-500 hover:bg-red-100 transition-colors"
                       //title="Delete post"
                     >
                           <Trash2 className="w-3 h-3" />
                    </button>
                  </TooltipHelp>
                  
                  </div>
                                    
                  <div className="flex flex-col flex-1 pr-8"> 
                      <div className="flex flex-col"> 
                              <p className="text-sm font-semibold text-gray-900 leading-none">
                                {/* {scheduledPost.user_display_name || scheduledPost.user_handle}*/}
                              </p>

                         </div> 
                    {/* Start - New Displayed Time */}
                    <div className="inline-flex items-center space-x-2">
                      
                     <TooltipExtended text={`⚡viewing this post in your local timezone : ${userTimezone}`}> 
                      <span className="flex items-center text-xs py-1 px-2 text-gray-500 bg-gray-50 rounded-sm">
                        <span className="bg-blue-50 rounded-full">
                            <Clock className="text-blue-500 h-3 w-3 mr-1"/>

                      </span>
                        
                        {formatPostTimeForDisplay(
                          day.date,
                          slot.time,
                          scheduledPost?.timezone,
                          userTimezone,
                          'h:mm a'
                        )}
                      </span>
                    </TooltipExtended>
                    </div>
                  {/* End - New Displayed Time */}
                                 
             {/*---------------------  Post Content ------------------------------------*/}      
               

{/* Post Content */}
<div className={`mt-6 text-sm ${day.isDisabledDay ? 'text-gray-300' : 'text-gray-900'}`}>

  {/*
  <p className="line-clamp-1">
    {truncateText(scheduledPost.content, 60)}
  </p>
  */}

  <p
      // Add onClick to toggle expansion
      //onClick={handleToggleExpansion}
      onClick={() => handleToggleExpansion(scheduledPost.id)}
      // Apply conditional classes based on expansion state
      className={`
        //line-clamp-none // Default to no clamp if you want content to expand fully
        ${isThisPostExpanded ? 'line-clamp-none' : 'line-clamp-6'}
        cursor-pointer     // Indicate it's clickable
        overflow-hidden    // Ensure truncation works
        transition-all     // Enable all CSS property transitions
        duration-700       // Set transition duration to 700ms (adjust as needed)
        ease-in-out        // Add an easing function for smoother animation
        leading-relaxed    // Improve readability of text blocks
        whitespace-pre-wrap  // <-- ADDED: Preserve whitespace and wrap text
        sm:w-[350px]     // changed the minimum post width size
      `}
      //title={!isThisPostExpanded ? "Click to expand" : "Click to collapse"} // Useful for accessibility/tooltip
    >
      {/* Show full content. The line-clamp will handle truncation */}
      {scheduledPost.full_content || scheduledPost.content}
    </p>

  {/* REWRITTEN: Image thumbnail/indicator with delete on hover */}
  {scheduledPost.photo_url && (
    <div className="
        relative mt-1 group
        w-24 h-24 shadow-md rounded-lg border border-gray-200
        overflow-hidden cursor-pointer
    "> {/* Parent div acts as the group, with fixed size */}
      <img
        src={`${scheduledPost.photo_url}`}
        alt="Attached"
        className="
            w-full h-full object-cover
            transition-opacity duration-300
            group-hover:opacity-50
        " // Image becomes semi-transparent on hover
        title="Image attached" // Tooltip on hover
      />

      {/* Delete button overlay */}
      <div
        className="
          absolute inset-0
          flex items-center justify-center
          bg-black bg-opacity-50
          opacity-0
          group-hover:opacity-100
          transition-opacity duration-300
          rounded-lg
          p-1
        "
      >
        <button
          type="button"
          onClick={() => handleDeleteImage(scheduledPost.id)} // Call with postId
          className="relative
            bg-red-600 text-white px-2 py-1 rounded-md
            hover:bg-red-700 transition-colors
            text-xs font-semibold
            flex items-center justify-center
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          disabled={deletingImageId === scheduledPost.id} // Disable if this post's image is being deleted
        >
          {deletingImageId === scheduledPost.id ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
                <Trash2 className="w-3 h-3 mr-1" /> // Use an X icon for delete
            )}
          Delete
        </button>
      </div>
    </div>
  )}
{/*-------------------- End Image Delete Button and Functionality ------------------------- */}

{/*-------------------- Start Video Delete Button and Functionality ------------------------- */}

 {/* NEW: Video Thumbnail/Indicator with Delete on Hover (Identical Structure) */}
  
      {scheduledPost.video_url && (
  console.log(`Attempting to render video for post ID: ${scheduledPost.id}, video_url: ${scheduledPost.video_url}, poster: https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/calendar_list_campaign.png`),
        <div className="
          relative mt-1 group
          w-48 h-48 shadow-md rounded-lg border border-gray-200
          overflow-hidden cursor-pointer
        ">
          <video
            src={scheduledPost.video_url}
            controls={false} // No controls for thumbnail view
            className="
              w-full h-full object-cover
              transition-opacity duration-300
              group-hover:opacity-50
            "
            title="Video attached"
            loop // Loops the video
            muted // Mutes the video for autoplay
            playsInline // Allows video to play inline on iOS
            preload="metadata" // Preloads only metadata, not entire video
            //poster={scheduledPost.video_thumbnail_url || "https://placehold.co/96x96/e0e0e0/555555?text=Video"}
            //poster="https://selrznkggmoxbpflzwjz.supabase.co/storage/v1/object/public/user-post-images/calendar_list_campaign.png"
          />

          {/* Delete button overlay for video */}
          <div
            className="
              absolute inset-0
              flex items-center justify-center
              bg-black bg-opacity-50
              opacity-0
              group-hover:opacity-100
              transition-opacity duration-300
              rounded-lg
              p-1
            "
          >
            <button
              type="button"
              onClick={() => handleDeleteVideo(scheduledPost.id)} // Call the new handleDeleteVideo function
              className="relative
                bg-red-600 text-white px-2 py-1 rounded-md
                hover:bg-red-700 transition-colors
                text-xs font-semibold
                flex items-center justify-center
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              disabled={deletingVideoId === scheduledPost.id} // Disable if this post's video is being deleted
            >
              {deletingVideoId === scheduledPost.id ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              Delete Video
            </button>
          </div>
        </div>
      )}
  {/*-------------------- End Video Delete Button and Functionality ------------------------- */}
  
</div>                    

                          {/* Add gray line divider here */}
                          <div className="mt-4 border-t border-gray-100"></div>
  
                          {/* Add Pause Post button in bottom right */}
                          <div className="flex space-x-2 justify-start mt-2">


                  {scheduledPost.user_handle && ( 
                      <TooltipHelp text="create post">
                         <button
                            onClick={() => handleNewPost(day.date, slot.time)}
                            className="ml-auto flex items-center space-x-1 px-2 py-1 text-xs bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-500 rounded-md transition-colors"
                          >
                            <PlusCircle className="w-3 h-3 text-blue-500" />
                            <span>New Post</span>
                          </button>
                      </TooltipHelp>
                  )}


                    {/* NEW: Copy Post Button */}
              {scheduledPost.user_handle && (                                
                  <TooltipHelp text="duplicate post">                        
                    <button
                      onClick={() => handleCopyPost(scheduledPost)}
                      disabled={copyingPostId === scheduledPost.id}
                      className={`flex text-xs px-2 py-1 rounded-md items-center p-1 space-x-2 text-sm ${day.isDisabledDay ? 'text-gray-300 bg-gray-50 hover:bg-gray-100 hover:text-gray-400' : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>

                      {copyingPostId === scheduledPost.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy Post</span>
                    </button> 
                    </TooltipHelp>
                  )}
                            
                    {!scheduledPost.user_handle && (               
                  <TooltipExtended text="⚡Publish this post under a different social media account">
                    <button
                       //onClick={() => handleEditPost(scheduledPost)}
                      onClick={() => handleEditPost(scheduledPost)}
                      disabled={copyingPostId === scheduledPost.id}
                      className={`flex text-xs px-2 py-1 rounded-md items-center p-1 space-x-2 text-sm ${day.isDisabledDay ? 'text-gray-500 bg-gray-50 hover:bg-gray-100 hover:text-gray-500' : 'bg-blue-500 text-white hover:text-white hover:bg-blue-600'}`}>
                      {/*<SquarePen className="w-3 h-3" />*/}
                        <span className="text-xs">Publish Post</span>
                    </button>
                  </TooltipExtended>
                
           )} {/*Useful for changing social account*/}   

                            
          {/* Pause/Activate Post button */}

 {scheduledPost.user_handle && (                       
<button
  // Use a template literal for the className string
  className={`
    text-xs px-2 py-1 rounded-md // Base styles for size, padding, shape

    ${scheduledPost.sent_post // --- Check for Posted Successfully FIRST ---
      ? 'bg-green-50 text-green-500 cursor-not-allowed' // Posted Successfully style
      : isPausingPost === scheduledPost.id // --- Else, Check if THIS post is currently loading ---
        ? // --- Loading State Styles ---
          // Apply colors based on the *current* status (what it was before clicking)
          scheduledPost.schedule_status // Check status *before* toggle for loading color
            ? 'bg-green-50 text-green-700 opacity-70 cursor-not-allowed' // Pausing (from true)
            : 'bg-red-100 text-red-500 opacity-70 cursor-not-allowed' // Activating (from false)
        : // --- Else, Normal State Styles (Not Sent, Not Loading) ---
          // Apply colors based on the current schedule_status
          scheduledPost.schedule_status
          ? 'bg-green-50 text-green-700 hover:bg-green-200' // Pause style (status is true)
          : 'bg-red-100 text-red-500 hover:bg-red-200' // Activate style (status is false)
    }
  `}
  onClick={(e) => {
    // Only trigger the action if the post hasn't been sent
    if (!scheduledPost.sent_post) {
      e.stopPropagation(); // Prevent click from bubbling up if needed
      handlePausePost(scheduledPost.id);
    }
  }}
  // Button is disabled if already sent OR currently in the pausing/activating loading state
  disabled={
    scheduledPost.sent_post ||
    isPausingPost === scheduledPost.id
  }
>
  {/* --- Button Text Content Logic --- */}
  {scheduledPost.sent_post ? ( // Check for Posted Successfully FIRST
    'Post Sent'
  ) : isPausingPost === scheduledPost.id ? ( // Else, Check loading state
    <span className="flex items-center">
      {/* Spinner uses gray, which is fine for a loading indicator */}
      <div className="animate-spin h-3 w-3 border-2 border-gray-500 border-t-transparent rounded-full mr-1"></div>
      {/* Loading text based on status *before* the toggle */}
      {scheduledPost.schedule_status ? 'Pausing...' : 'Activating...'}
    </span>
  ) : ( // Else, Normal text based on schedule_status
  <TooltipHelp text="click to change status">  
    {scheduledPost.schedule_status ? 'Post Scheduled' : 'Post Disabled'}
  </TooltipHelp>  
  )}
</button>
  )}
    

                          </div>

                          {/*End of Add Gray Line*/}
                          </div> 
                       </div>
                ); // <--- This is the closing parenthesis for the `return (` statement
                      } // just replaced 
                    //) old version                       
                    )) : (
                
                    slot.isAvailable && (
                      <div className="flex-1 bg-gray-50 rounded-md w-full">
                        
                          <button
                            onClick={() => handleNewPost(day.date, slot.time)}
                            className={`flex border border-gray-200 rounded-md items-center p-1 space-x-2 text-sm ${day.isDisabledDay ? 'text-gray-300 hover:text-blue-300 hover:bg-blue-400 hover:text-white' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-500 hover:text-white'}`}>

                            
                            <PlusCircle className="w-4 h-4" />
                            <span>New Post</span>
                          </button>
                        
                        </div>
                        )
                      )}           
                     </div> {/*Close New Div controlling grid implementation*/}           
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
                    postId={selectedPostForEdit.id}
                  />)}


                  <NoSocialModal
                      isOpen={showNoSocialModal}
                      onClose={() => setShowNoSocialModal(false)}
                      onConnectBluesky={handleConnectBluesky}
                      onConnectLinkedIn={handleConnectLinkedInClick}
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
                    onClose={(postedSuccessfully) => { // <-- Modified onClose to accept the boolean argument
                      setIsPostWarningModalOpen(false);
                      setSelectedPostForNow(null);
                    if (postedSuccessfully) {
                      //console.log("Post successful, refreshing schedule data.");
                      fetchUserSchedule(); // <-- Call your fetch function here
                      } else {
                       //console.log("Post failed or cancelled, not refreshing schedule data.");
                      }
                      }}
    
                      message="Are you sure you want to post this content now?"
                      postContent={selectedPostForNow?.full_content || selectedPostForNow?.content}
                      userHandle={selectedPostForNow?.user_handle}
                      postId={selectedPostForNow?.id}
                      socialChannel={selectedPostForNow?.social_channel}
                    />

                  {/* Add this at the bottom of the component, alongside other modals */}
                <TimezoneSelectorModal
                    isOpen={isTimezoneSelectorOpen}
                    onClose={() => setIsTimezoneSelectorOpen(false)}
                    selectedTimeZone={userTimezone}
                    onSave={handleSaveTimezone}
                    userId={currentUserId} // Pass the user ID if available
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

export default ManageSchedule;