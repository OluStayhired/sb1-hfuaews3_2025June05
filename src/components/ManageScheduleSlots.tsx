import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, X, Info, Settings2, FilePen, PlusCircle } from 'lucide-react';
import { UpdateTimeModal } from '/src/components/UpdateTimeModal';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface TimeSlot {
  schedule_time: string;
  day_of_week: string;
  active_time: boolean;
}

interface DaySchedule {
  day: string;
  active_day: boolean;
  slots: TimeSlot[];
}

export function ManageScheduleSlots() {
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [newTime, setNewTime] = useState({ hour: '09', minute: '00', period: 'AM' });
  //const [selectedDays, setSelectedDays] = useState<string[]>(['monday']);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('14:30:00');
  const [editingSlot, setEditingSlot] = useState<{
  time: string;
  day: string;
} | null>(null);
  const [activeTimeSlots, setActiveTimeSlots] = useState<{[key: string]: boolean}>({});
  const [daySelectionError, setDaySelectionError] = useState<string | null>(null);


  const days = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
    'Friday', 'Saturday', 'Sunday'
  ];

  // Fetch schedule data
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        const { data, error } = await supabase
          .from('user_schedule')
          .select('*')
          .eq('email', session.user.email);

        if (error) throw error;

        // Transform data into grouped schedule
        const groupedSchedule = days.map(day => {
            const daySlots = data?.filter(slot => slot.day_of_week === day) || [];
              return {
                  day: day,
                    active_day: daySlots.length > 0 ? daySlots[0].active_day : true,
                    slots: daySlots
                    .map(slot => ({
                    schedule_time: slot.schedule_time,
                    day_of_week: slot.day_of_week,
                    active_time: slot.active_time
                    }))
                    .sort((a, b) => a.schedule_time.localeCompare(b.schedule_time))
                  };
                });

        setSchedules(groupedSchedule);
      } catch (err) {
        console.error('Error fetching schedule:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  useEffect(() => {
  const initializeActiveTimeSlots = () => {
    const activeSlots: {[key: string]: boolean} = {};
    schedules.forEach(schedule => {
      schedule.slots.forEach(slot => {
        activeSlots[`${schedule.day}-${slot.schedule_time}`] = slot.active_time;
      });
    });
    setActiveTimeSlots(activeSlots);
  };

  if (schedules.length > 0) {
    initializeActiveTimeSlots();
  }
}, [schedules]);


  const formatTime = (time: string) => {
    if (timeFormat === '24h') return time.substring(0, 5);
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${formattedHour}:${minutes} ${period}`;
  };

  const handleAddTime = async () => {

 setDaySelectionError(null);
    
 if (selectedDays.length === 0) {
    // Could add an error state to show this message in the UI
     setDaySelectionError('Please select at least one day of the week');
    return;
  }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      // Convert time to 24h format for storage
      let hour = parseInt(newTime.hour);
      if (newTime.period === 'PM' && hour !== 12) hour += 12;
      if (newTime.period === 'AM' && hour === 12) hour = 0;
      const time24 = `${hour.toString().padStart(2, '0')}:${newTime.minute}:00`;

      // Add time for each selected day
      const newSlots = selectedDays.map(day => ({
        email: session.user.email,
        user_id: session.user.id,
        day_of_week: day,
        schedule_time: time24,
        active_day: true,
        active_time: true,
      }));

      console.log('all the data: ', newSlots);
      
      const { error } = await supabase
        .from('user_schedule')
        .insert(newSlots);

      if (error) throw error;

      // Update local state
      setSchedules(prev => 
        prev.map(schedule => ({
          ...schedule,
          slots: selectedDays.includes(schedule.day)
            ? [...schedule.slots, { 
                schedule_time: time24, 
                day_of_week: schedule.day,
                active: true 
              }].sort((a, b) => a.schedule_time.localeCompare(b.schedule_time))
            : schedule.slots
        }))
      );
    } catch (err) {
      console.error('Error adding time slot:', err);
      setDaySelectionError('Failed to add time slot');
    }
  };

  const handleDeleteTime = async (day: string, time: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) return;

      const { error } = await supabase
        .from('user_schedule')
        .delete()
        .match({ 
          email: session.user.email,
          day_of_week: day,
          schedule_time: time 
        });

      if (error) throw error;

      // Update local state
      setSchedules(prev =>
        prev.map(schedule => ({
          ...schedule,
          slots: schedule.day === day
            ? schedule.slots.filter(slot => slot.schedule_time !== time)
            : schedule.slots
        }))
      );
    } catch (err) {
      console.error('Error deleting time slot:', err);
    }
  };

const handleTimeUpdate = async (newTime: string, day: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    // Update the time in the database
    const { error } = await supabase
      .from('user_schedule')
      .update({ 
        schedule_time: newTime,
        updated_at: new Date().toISOString()
      })
      .match({ 
        email: session.user.email,
        day_of_week: day,
        schedule_time: currentTime // Use the old time to match the record
      });

    if (error) throw error;

    // Update local state
    setSchedules(prev =>
      prev.map(schedule => ({
        ...schedule,
        slots: schedule.day === day
          ? schedule.slots.map(slot => ({
              ...slot,
              schedule_time: slot.schedule_time === currentTime ? newTime : slot.schedule_time
            }))
          : schedule.slots
      }))
    );

    // Update current time state
    setCurrentTime(newTime);

  } catch (err) {
    console.error('Error updating time slot:', err);
  }
};

const handleToggleDay = async (day: string, active: boolean) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    // Update all slots for the day in the database
    const { error } = await supabase
      .from('user_schedule')
      .update({ 
        active_day: active,
        updated_at: new Date().toISOString()
      })
      .match({ 
        email: session.user.email,
        day_of_week: day
      });

    if (error) throw error;

    // Update local state
    setSchedules(prev =>
      prev.map(schedule => ({
        ...schedule,
        active_day: schedule.day === day ? active : schedule.active_day,
        slots: schedule.slots.map(slot => ({
          ...slot,
          //comment out the local update for active_time
          //active_time: schedule.day === day ? active : slot.active_time
        }))
      }))
    );

  } catch (err) {
    console.error('Error toggling day status:', err);
  }
};

const handleActiveTimeToggle = async (day: string, time: string, currentActive: boolean) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    // Update in database
    const { error } = await supabase
      .from('user_schedule')
      .update({ 
        active_time: !currentActive,
        updated_at: new Date().toISOString()
      })
      .match({ 
        email: session.user.email,
        day_of_week: day,
        schedule_time: time 
      });

    if (error) throw error;

    // Update local state
    setActiveTimeSlots(prev => ({
      ...prev,
      [`${day}-${time}`]: !currentActive
    }));

  } catch (err) {
    console.error('Error toggling time slot:', err);
  }
};
  
  

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 mb-8"> 
            <div className="p-2 bg-blue-100 rounded-md"> 
               <Clock className="w-5 h-5 text-blue-500"/> 
            </div>
        
              <h2 className="text-xl font-semibold text-gray-900">Posting Schedule</h2>
        </div>

        
        <div className=" flex items-center space-x-4">
          <button
            onClick={() => setTimeFormat(prev => prev === '12h' ? '24h' : '12h')}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <Settings2 className="w-4 h-4" />
            <span>{timeFormat === '12h' ? '12-hour' : '24-hour'}</span>
          </button>
        </div>
      </div>

      {/* Add New Time Section
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Add Posting Times</h3>
        <div className="flex items-center space-x-4">
          <select
            value={newTime.hour}
            onChange={(e) => setNewTime(prev => ({ ...prev, hour: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
              <option key={hour} value={hour.toString().padStart(2, '0')}>
                {hour}
              </option>
            ))}
          </select>
          <span>:</span>
          <select
            value={newTime.minute}
            onChange={(e) => setNewTime(prev => ({ ...prev, minute: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 60 }, (_, i) => i).map(minute => (
              <option key={minute} value={minute.toString().padStart(2, '0')}>
                {minute.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
          <select
            value={newTime.period}
            onChange={(e) => setNewTime(prev => ({ ...prev, period: e.target.value as 'AM' | 'PM' }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
         */}

        {/* Day Selection */}
      <div className="p-4 bg-gray-50 rounded-lg">  
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Select Posting Days</h3>
          <div className="flex flex-wrap gap-2">
          {days.map(day => (
            <button
              key={day}
              onClick={() => {
                setSelectedDays(prev => 
                  prev.includes(day)
                    ? prev.filter(d => d !== day)
                    : [...prev, day]
                );
              }}
              className={`flex px-3 py-1.5 items-center rounded-full text-sm transition-colors ${
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
          
              {daySelectionError && (
                <div className="mt-2 text-sm text-red-500 bg-red-50 border border-red-200 p-2 rounded-md z-999">
                  {daySelectionError}
                </div>
              )}
          
        </div>

        {/* start moving time selection section here */}
       <div className="mt-8"> {/*taken from bottom */}
        <h3 className=" text-sm font-medium text-gray-700 mb-4">Add Posting Times</h3>
        <div className="flex items-center space-x-4 text-sm">
          <select
            value={newTime.hour}
            onChange={(e) => setNewTime(prev => ({ ...prev, hour: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(hour => (
              <option key={hour} value={hour.toString().padStart(2, '0')}>
                {hour}
              </option>
            ))}
          </select>
          <span>:</span>
          <select
            value={newTime.minute}
            onChange={(e) => setNewTime(prev => ({ ...prev, minute: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 60 }, (_, i) => i).map(minute => (
              <option key={minute} value={minute.toString().padStart(2, '0')}>
                {minute.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
          <select
            value={newTime.period}
            onChange={(e) => setNewTime(prev => ({ ...prev, period: e.target.value as 'AM' | 'PM' }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
     
       
        {/* end moving time selection section here */}
</div> {/*End New Added Format Grid*/}
         <button
            onClick={handleAddTime}
            className="px-4 py-2 mt-8 items-center bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex space-x-2"
          >
            <PlusCircle className="w-4 h-4 mr-2 text-white"/>
            Add Time Slot
          </button>
      </div>

{/* Schedule Grid */}
<div className="grid grid-cols-7 gap-4 mt-12">
  {schedules.map((schedule) => (
    <div key={schedule.day} className="space-y-2">
      <div className="flex-col mb-2">
        <h3 className="text-sm font-medium text-gray-700">{schedule.day}</h3>
        
        <label className="relative inline-flex items-start cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={schedule.active_day}
            onChange={(e) => handleToggleDay(schedule.day, e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
      <div className="space-y-2">
        {schedule.slots.map((slot) => (
          <div
            key={slot.schedule_time}
            className={`flex flex-col items-center justify-between px-2 py-2 rounded-lg group ${
              schedule.active_day ? 'bg-gray-50' : 'bg-gray-100 opacity-50'
            }`}
          >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-600">
              {formatTime(slot.schedule_time)}
            </span>
              <input
                  type="checkbox"
                  checked={activeTimeSlots[`${schedule.day}-${slot.schedule_time}`] ?? false}
                  onChange={() => handleActiveTimeToggle(
                  schedule.day,
                  slot.schedule_time,
                  activeTimeSlots[`${schedule.day}-${slot.schedule_time}`] ?? false
                  )}
                  className="form-checkbox h-3.5 w-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
            </div>  {/* end of top row time + check box*/}

            <div className="opacity-0 group-hover:opacity-100 flex items-center justify-start w-full space-x-2 mt-1">
              <div className="opacity-0 items-center rounded-md bg-blue-50 group-hover:opacity-100 hover:bg-blue-100 flex space-x-1">
                <button
                    onClick={() => {
                      setCurrentTime(slot.schedule_time);
                      setEditingSlot({
                      time: slot.schedule_time,
                      day: schedule.day
                      });
                      setIsTimeModalOpen(true);
                    }}
                    className="p-1 items-center flex text-blue-400 hover:text-blue-500 transition-opacity"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1" />
                  <span className= "text-xs">Edit</span>
                </button>
              </div>
              
        <div className="opacity-0 items-center rounded-md bg-red-50 group-hover:opacity-100 hover:bg-red-100 flex items-center space-x-1">
                <button
                    onClick={() => handleDeleteTime(schedule.day, slot.schedule_time)}
                      className="p-1 items-center flex text-red-400 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span className= "text-xs">Delete</span>
                </button>
              </div>
            </div> 
            {/* **End of Bottom Row** */}
          </div>
        ))}
      </div>
    </div>
  ))}
</div>

          <UpdateTimeModal
              isOpen={isTimeModalOpen}
              onClose={() => {
                setIsTimeModalOpen(false);
                setEditingSlot(null);
              }}
            onUpdate={(newTime) => {
            if (editingSlot) {
                handleTimeUpdate(newTime, editingSlot.day);
              }
            }}
            currentTime={currentTime}
            timeFormat={timeFormat}
          />
    </div>
  );
}
