// src/components/CalendarListSidePanel.tsx
import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, CalendarSearch, PlusCircle, Clock, ChevronRight, CalendarCheck, Info, Search, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { CampaignInfoModal } from './CampaignInfoModal';
import { TooltipExtended } from '../utils/TooltipExtended';
import { TooltipHelp } from '../utils/TooltipHelp';

interface CalendarListSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToList: () => void; 
  onSelectCalendar?: (calendarName: string) => void;
}

interface CalendarItem {
  calendar_name: string;
  description: string;
  active: boolean;
  social_goals: string[];
  target_audience: string;
  start_date: string;
  end_date: string;
}

export function CalendarListSidePanel({ isOpen, onClose, onBackToList, onSelectCalendar }: CalendarListSidePanelProps) {
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const [showCampaignInfo, setShowCampaignInfo] = useState(false);
  const [showCampaignInfoModal, setShowCampaignInfoModal] = useState(false);
  const [selectedCampaignForModal, setSelectedCampaignForModal] = useState<CalendarItem | null>(null); 
  // New state to hold campaign data

  useEffect(() => {
    const fetchCalendars = async () => {
      if (!isOpen) return;
      
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        const { data, error } = await supabase
          .from('calendar_questions')
          .select(`
            calendar_name,
            calendar_description,
            active,
            social_goals,
            target_audience,
            start_date,
            end_date
          `)
          .eq('email', session.user.email)
          .eq('active', true)
          .eq('deleted', false)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setCalendars(data || []);
      } catch (err) {
        console.error('Error fetching calendars:', err);
        setError('Failed to load campaigns');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchCalendars();
    }
  }, [isOpen]);

  const handleCreateCampaign = () => {
    navigate('/dashboard/campaign');
    onClose();
  };

  const handleShowCampaign = () => {
    navigate('/dashboard/calendars');
    onClose();
  }

  const handleSelectCalendar = (calendarName: string) => {
    if (onSelectCalendar) {
      onSelectCalendar(calendarName);
    }
    onClose();
  };

   const handleShowCampaignInfo = (campaign: CalendarItem) => {
    setSelectedCampaignForModal(campaign); // Set the campaign data
    setShowCampaignInfoModal(true); // Open the modal
  };

    const handleCloseCampaignInfoModal = () => {
    setShowCampaignInfoModal(false);
    setSelectedCampaignForModal(null); // Clear selected campaign when closing
  };

 const handleCreateNewCampaign = () => {
    setShowCampaignInfo(false);
    onBackToList();
  };

  const handleCreateNewCampaignFromModal = () => {
      setShowCampaignInfoModal(false); // Close the info modal
      onClose(); // Close the side panel
      navigate('/dashboard/campaign'); // Navigate to campaign creation
  };
  
  const getDaysLeft = (endDate: string): number => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = parseISO(endDate);
      return Math.max(0, differenceInDays(end, today));
    } catch (e) {
      console.error('Error calculating days left:', e);
      return 0;
    }
  };

  const getStatusColor = (daysLeft: number): string => {
    if (daysLeft === 0) return 'text-red-500 bg-red-50';
    if (daysLeft < 7) return 'text-yellow-500 bg-yellow-50';
    return 'text-green-500 bg-green-50';
  };

  const filteredCalendars = searchQuery.trim() 
    ? calendars.filter(cal => 
        (cal.calendar_name  || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cal.description  || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : calendars;

  if (!isOpen) return null;

  return (
    //<div className="fixed top-0 right-0 h-screen w-80 bg-white shadow-lg border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out">
    
// Starting the change for the overlay
     <>
      {/* Overlay for the rest of the screen */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose} // Clicking outside closes the panel
      ></div>

     {/* The actual side panel content */}
      <div
        className={`
          fixed top-0 right-0 h-screen w-2/5 bg-white shadow-lg border-r border-gray-200 z-50
          transform transition-transform duration-1000 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/*Ending the part for the changes*/}
       
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 items-center bg-green-100 rounded-full">
                <CalendarSearch className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <CalendarSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center flex-grow">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {filteredCalendars.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="mx-auto flex items-center justify-center bg-blue-50 rounded-full w-24 h-24">
                  <Calendar className="w-12 h-12 font-light text-blue-500" />
                </div>
                <p className="text-gray-600 mb-3 mt-4">No active campaigns found 😔</p>
                <p className="text-gray-400 mb-4 text-sm">Create a campaign to get started</p>
                <button
                  onClick={handleCreateCampaign}
                  className="inline-flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  <span>Create Campaign</span>
                </button>
              </div>
            ) : (
              filteredCalendars.map((calendar) => {
                const daysLeft = getDaysLeft(calendar.end_date);
                const statusColor = getStatusColor(daysLeft);
                
                return (
                  <div 
                    key={calendar.calendar_name}
                    onClick={() => handleSelectCalendar(calendar.calendar_name)} // renable this line here
                    className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium hover:text-blue-500 text-sm text-gray-600">{calendar.calendar_name}</h3>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {calendar.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-50">
                      
                      <div className="flex items-center mt-8 space-x-2">

                        <TooltipHelp text="⚡campaign duration">
                       <div className="flex items-center text-blue-500 bg-gradient-blue-50 to-white border border-blue-200 hover:border-blue-300 rounded-md px-2 py-1"> 
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              <span>
                                {format(parseISO(calendar.start_date), 'MMM d')} - {format(parseISO(calendar.end_date), 'MMM d')}
                              </span>

                      </div>
                          </TooltipHelp>


                        <div>
                              <TooltipExtended text={`⚡ ${calendar.calendar_description}`}>
                                <button
                                   className="text-blue-500 bg-blue-100 hover:text-blue-600 px-2 py-1 rounded-md text-sm font-normal flex items-center" 
                                >
                                  <Info className="w-3.5 h-3.5 mr-1" />
                                  <span>Details</span> 
          
                            
                                </button>
                                </TooltipExtended>
                        </div>

                        <div>
                              <span className={`px-2 py-1 hover:shadow-sm rounded-lg text-sm font-medium ${statusColor} whitespace-nowrap`}>
                              {daysLeft} days left
                            </span>
                        </div>
                        
                      </div>
                      
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
        
        {filteredCalendars.length > 0 && (
  <div className="pt-4 border-t items-center justify-center border-gray-200 mt-4 flex space-x-2">

 {/* Your "View Campaigns" button */}
  <button
    //onClick={handleSelectCalendar}
    onClick={handleShowCampaign}
    className="text-sm py-2 px-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
  >
    <ArrowLeft className="w-4 h-4 mr-2" />
    <span >View More</span>
  </button>
    
  {/* Your "Create Campaign" button */}
  <button
    onClick={handleCreateCampaign}
    className="text-sm py-2 px-2 border border-gray-300 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
  >
    <PlusCircle className="w-4 h-4 mr-2" />
    <span>Create New</span>
  </button>

 
</div>
        )}
      </div>

      <CampaignInfoModal
          isOpen={showCampaignInfoModal}
          onClose={handleCloseCampaignInfoModal}
          campaignName={selectedCampaignForModal}
          onCreateNewCampaign={handleCreateNewCampaignFromModal}
      />
    </div>
  </> // Added this as a close for the return
  );
}

export default CalendarListSidePanel;