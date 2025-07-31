// src/components/CalendarList.tsx

import React, { useState, useEffect } from 'react';
import { CalendarCheck, RefreshCcw, Users, Megaphone, CircleCheck, Clock, X, ListChecks, PlusCircle, CheckCircle, ArrowLeft, CalendarSearch, Trash2, Goal, NotepadText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreateCalendarForm } from '/src/components/CreateCalendarForm';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';
import {DeleteCampaignWarning} from '/src/components/DeleteCampaignWarning';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';



interface CalendarListProps {
  calendars: {
    calendar_name: string;
    description: string;
    active: boolean;
    social_goals: string[];
    target_audience: string;
    end_date: string;
  }[];
  onToggleActive: (calendarName: string, active: boolean, email: string | null, refreshLists: () => Promise<void>) => Promise<void>;
  currentUserEmail: string | null;
  fetchCalendarList: () => Promise<void>;
  fetchCalendarContent: () => Promise<void>;
  //showOnlyActive?: boolean;
  onSelectCalendar?: (calendarName: string) => void;
}

export function CalendarList({
  calendars,
  onToggleActive,
  currentUserEmail,
  fetchCalendarList,
  fetchCalendarContent,
  showOnlyActive = false,
  onSelectCalendar
}: CalendarListProps) {
  const [showOnlyActiveLocal, setShowOnlyActiveLocal] = useState(showOnlyActive);
  const [isCreateCalendarFormOpen, setIsCreateCalendarFormOpen] = useState(false);
  const [isDeleteCampaignWarningOpen, setIsDeleteCampaignWarningOpen] = useState(false);
  const [selectedCalendarToDelete, setSelectedCalendarToDelete] = useState<string | null>(null);
  

  const handleCreateCalendarClick = () => {
    console.log('Create Campaign button clicked in ViewCalendars!');
    setIsCreateCalendarFormOpen(true);
  };  

  

   const truncateText = (text: string, maxLength: number = 25): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};


  const navigate = useNavigate();
  const location = useLocation();
  

  // Add these checks right here, before any other logic
  if (!Array.isArray(calendars)) {
    return (
      <div className="text-center py-4 text-gray-500">
        No campaigns available
      </div>
    );
  }

  const handleCreateCampaign = () => {
    navigate('/dashboard/campaign');
  };

  const handleShowCampaignList = () => {
    navigate('/dashboard/calendars') 
  };
  
 const handleOpenDeleteCampaignWarning = (calendarName: string) => {
    setSelectedCalendarToDelete(calendarName);
    setIsDeleteCampaignWarningOpen(true);
  };

  const handleCloseDeleteCampaignWarning = () => {
    setSelectedCalendarToDelete(null);
    setIsDeleteCampaignWarningOpen(false);
  };

  const handleDeleteCampaignConfirm = async () => {
    if (selectedCalendarToDelete) {
      await handleDeleteCampaign(selectedCalendarToDelete);
      handleCloseDeleteCampaignWarning();
    }
  };
  

const handleDeleteCampaign = async (calendarName: string) => {
  try {
    // Get current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      throw new Error('No authenticated user found');
    }

    // Set deleted column to true in calendar_questions table
    const { error } = await supabase
      .from('calendar_questions')
      .update({ deleted: true })
      .match({
        calendar_name: calendarName,
        email: session.user.email
      });

    if (error) throw error;

    // Refresh the calendar list
    fetchCalendarList();
    fetchCalendarContent();

  } catch (err) {
    console.error('Error deleting calendar:', err);
    // Optionally, display an error message to the user
  }
};

  

  // Ensure calendars is always an array
  const safeCalendars = Array.isArray(calendars) ? calendars : [];

 const handleToggleActive = async (
    calendarName: string,
    active: boolean,
    email: string | null,
    refreshLists: () => Promise<void>
) => {
    try {
        // Input validation
        if (!calendarName || !email) {
            console.error('Missing required parameters for toggle active');
            return;
        }

        // Start optimistic update
        const updatedCalendars = calendars.map(calendar => 
            calendar.calendar_name === calendarName 
                ? { ...calendar, active } 
                : calendar
        );

        // Update the active status in calendar_questions table
        const { error } = await supabase
            .from('calendar_questions')
            .update({ 
                active,
                updated_at: new Date().toISOString()
            })
            .match({
                calendar_name: calendarName,
                email: email
            });

        if (error) {
            console.error('Error updating calendar status:', error);
            // Revert optimistic update if needed
            throw error;
        }

        // Refresh the lists to get updated data
        await refreshLists();

    } catch (err) {
        console.error('Error toggling calendar active status:', err);
        // Show error notification to user
        // Revert any optimistic updates
    }
};

  
  // Filter calendars if showOnlyActiveLocal is true  
  const displayedCalendars = showOnlyActiveLocal 
    ? safeCalendars.filter(calendar => calendar.active)
    : safeCalendars;

  if (displayedCalendars.length === 0) {
  return (
    <div className="text-center py-6 bg-white rounded-lg z-99999">
      <div className="flex flex-col items-center space-y-4">
        {/* Icon and message */}
        <div className="bg-gray-50 p-3 rounded-full">
          <Megaphone className="w-6 h-6 text-gray-400" />
        </div>
        <div className="space-y-1">
          <p className="text-gray-900 font-normal">
            {showOnlyActiveLocal ? 'No active campaigns found' : 'No campaigns found'}
          </p>
          <p className="text-sm text-gray-400">
            {showOnlyActiveLocal 
              ? 'Activate a campaign to see it here'
              : 'Create your first campaign to get started'}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-3 pt-2">
          {showOnlyActiveLocal && (
            <button
              onClick={() => setShowOnlyActiveLocal(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Activate Your Campaigns</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="items-center p-2 bg-blue-50 rounded-full">
          <CalendarSearch className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {showOnlyActiveLocal ? 'Active Campaign' : 'All Campaigns'}
          </h3>
        </div>

        <div className="flex item-center">

          
        {/* "Active" Button */}

          <button
            onClick={handleShowCampaignList}
            //className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mr-4"
              className="inline-flex text-sm items-center px-4 py-2 bg-blue-50 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-100 border border-blue-200 rounded-lg text-gray-600 mr-2">
         
            <RefreshCcw className="text-blue-500 w-4 h-4 mr-2" />
            <span className="text-blue-500">Refresh List</span>
        </button>
        
        <button
            onClick={handleCreateCampaign}
            //className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors mr-4"
              className="inline-flex text-sm items-center px-4 py-2 hover:border-blue-400 hover:text-blue-500 hover:bg-gray-50 bg-white border border-gray-200 rounded-lg text-gray-600 mr-2">
         
            <PlusCircle className="w-4 h-4 mr-2" />
            <span>Create Campaign</span>
        </button>
      
         <div className="flex rounded-lg border border-gray-300 overflow-hidden"> 
          <button
            onClick={() => setShowOnlyActiveLocal(true)} // Sets state to show only active
            className={`
                  flex items-center px-4 py-2 text-sm font-normal
                  ${showOnlyActiveLocal // If showOnlyActiveLocal is true, this button is active
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                    }
                transition-colors duration-200
                ${!showOnlyActiveLocal ? 'border-r border-gray-300' : ''}`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Active</span>
          </button>

        {/* "All" Button */}
          <button
            onClick={() => setShowOnlyActiveLocal(false)} // Sets state to show all
            className={`
              flex items-center px-4 py-2 text-sm font-normal
               ${!showOnlyActiveLocal // If showOnlyActiveLocal is false, this button is active
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                transition-colors duration-200
              `}
              >
              <ListChecks className="w-4 h-4 mr-2" />
                <span>All</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md mt-6">
        <table className="w-full rounded-md">
          <thead className="bg-gray-50 border border-gray-100 rounded-md">
            
            <tr>
              <th className="inline-block px-6 py-3 text-left text-sm font-normal text-gray-500 tracking-wider">
                <div className="p-2 flex items-center hover:bg-gray-100 rounded-md space-x-2">
                 <div className="p-1 bg-gray-100 rounded-full"> 
                   <Megaphone className="w-4 h-4 text-gray-500"/>
                 </div>                 
                  <span className="whitespace-nowrap">
                      Campaign
                  </span>
                  
                </div> 
              </th>

              <th className="px-6 py-3 text-left text-sm font-normal text-gray-500 tracking-wider">
                <div className="p-2 flex items-center hover:bg-gray-100 rounded-md space-x-2">
                 <div className="p-1 bg-gray-100 rounded-full"> 
                   <Clock className="w-4 h-4 text-gray-500"/>
                 </div>  
                  <span className="whitespace-nowrap">Days</span>
                </div>
              </th>
              
              <th className="px-6 py-3 text-left text-sm font-normal text-gray-500 tracking-wider">
                <div className="p-2 flex items-center hover:bg-gray-100 rounded-md space-x-2">
                 <div className="p-1 bg-gray-100 rounded-full"> 
                   <NotepadText className="w-4 h-4 text-gray-500"/>
                 </div>  
                  <span className="whitespace-nowrap">Description </span>
                </div>
                
              </th>

              
               <th className="px-6 py-3 text-left text-sm font-normal text-gray-500 tracking-wider">
               <div className="p-2 flex items-center hover:bg-gray-100 rounded-md space-x-2">
                 <div className="p-1 bg-gray-100 rounded-full"> 
                   <Users className="w-4 h-4 text-gray-500"/>
                 </div>  
                      <span className="whitespace-nowrap">Audience</span>
                </div>
                
              </th>
                 <th className="px-6 py-3 text-left text-sm font-normal text-gray-500 tracking-wider">
                <div className="p-2 flex items-center hover:bg-gray-100 rounded-md space-x-2">
                 <div className="p-1 bg-gray-100 rounded-full"> 
                   <Goal className="w-4 h-4 text-gray-500"/>
                 </div>  
                    <span className="whitespace-nowrap">Goals</span>
                </div>
              </th>


                      <th className="px-6 py-3 text-left text-sm font-normal text-gray-500 tracking-wider">
          <div className="p-2 flex items-center hover:bg-gray-100 rounded-md space-x-2">
            <div className="p-1 bg-gray-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-gray-500"/>
            </div>
            <span className="whitespace-nowrap">Status</span>
          </div>
        </th>
              
              <th className="px-6 py-3 text-left text-sm font-normal text-gray-500 tracking-wider">
               <div className="p-2 flex items-center hover:bg-gray-100 rounded-md space-x-2">
                 <div className="p-1 bg-gray-100 rounded-full"> 
                   <Trash2 className="w-4 h-4 text-gray-500"/>
                 </div>  
                 <span className="whitespace-nowrap">Delete</span>
                </div>
              </th>
              
            </tr>
          </thead>
          <tbody className="bg-white text-left divide-y divide-gray-200">
             {displayedCalendars.map((calendar) => {
              // --- START of the specific change ---
              // 1. Get today's date at midnight for accurate comparison
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              // 2. Parse the end_date string into a Date object
              const endDate = parseISO(calendar.end_date); // Using parseISO for 'YYYY-MM-DD' strings
              //const endDate = calendar.end_date ? parseISO(calendar.end_date) : null; // Handle null case

              if (!endDate || isNaN(endDate.getTime())) {
                console.warn(`Invalid end_date for calendar "${calendar.calendar_name}":`, calendar.end_date);
                return null; // Skip rendering this row or provide a default value
              }

      
              endDate.setHours(0, 0, 0, 0); // Set end date to midnight for comparison

              // 3. Calculate the difference in days
              // differenceInDays returns a positive number if today is before the end date,
              // and a negative number if today is after the end date.
              const daysLeft = differenceInDays(endDate, today);

              // 4. Ensure it's not negative (set to 0 if campaign has ended)
              const campaignDaysLeft = Math.max(0, daysLeft);
              // --- END of the specific change ---
           return (
              <tr 
                key={calendar.calendar_name}
                onClick={() => onSelectCalendar?.(calendar.calendar_name)}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-4 whitespace-wrap text-xs text-gray-900">
                  {/*<TooltipExtended text={`⚡${calendar.calendar_name}`}>*/}
                  <span className="whitespace-wrap">
                   {truncateText(calendar.calendar_name,50)}
                   </span> 
                  {/*</TooltipExtended>*/}
                
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-center text-xs text-gray-900">
                <TooltipExtended text={`⚡ ${campaignDaysLeft} days left on the calendar`} >
                  {`${campaignDaysLeft}`} 
                </TooltipExtended>
                </td>
                
                <td className="px-6 py-4 text-xs text-gray-500"> 
                  {truncateText(calendar.description,100)}
                </td>

                            
                <td className="mt-4 px-6 py-4 text-xs text-gray-500">
                  <TooltipExtended text={`⚡${truncateText(calendar.target_audience,150)}`} className="z-10000"> 
                      {truncateText(calendar.target_audience,100)}
                    </TooltipExtended>
                </td>
                  
                
                  
                <td className="px-6 py-4 text-xs text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {calendar.social_goals?.map((goal) => (
                      <span key={goal} className="px-2 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs hover:bg-gray-100">
                        {goal}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">

              <TooltipExtended text="⚡Activate campaign for post ideas" className="z-10000 whitespace-wrap">  

                  <div className="flex justify-center items-center h-full">

                  
                  <label 
                    className="relative inline-flex items-center cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                    >
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={calendar.active}
                      onChange={(e) => {
                        //e.stopPropagation(); // Prevent row click when toggling
                        onToggleActive(
                          calendar.calendar_name,
                          e.target.checked,
                          currentUserEmail,
                          async () => {
                            await Promise.all([
                              fetchCalendarList(),
                              fetchCalendarContent()
                            ]);
                          }
                        );
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                        
                    
                  </div>

                </TooltipExtended>   
                  
                </td>
                <td className="px-6 py-6 whitespace-nowrap text-xs text-gray-500">

                 <div className="p-2 w-15 h-15 flex justify-center items-center">
    <button
        onClick={(e) => {
            e.stopPropagation();
            handleOpenDeleteCampaignWarning(calendar.calendar_name);
        }}
        className="p-3 text-red-500 rounded-full bg-red-50 hover:text-red-700 hover:bg-red-100 flex justify-center items-center"
    >
        <Trash2 className="w-6 h-6" />
    </button>
</div>
                  
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

       <DeleteCampaignWarning
        isOpen={isDeleteCampaignWarningOpen}
        onClose={handleCloseDeleteCampaignWarning}
        onConfirm={handleDeleteCampaignConfirm}
        campaignName={selectedCalendarToDelete || ''}
      />
      
    </div>
  );
}
