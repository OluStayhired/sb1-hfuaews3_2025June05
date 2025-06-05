// src/components/UpdateTimeModal.tsx

import React, { useState, useEffect } from 'react';
import { Clock, X, Save, Settings2 } from 'lucide-react';
import { format, parse } from 'date-fns';

interface UpdateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (newTime: string) => void;
  currentTime: string;
  timeFormat?: '12h' | '24h';
}

export function UpdateTimeModal({ 
  isOpen, 
  onClose, 
  onUpdate,
  currentTime,
  timeFormat = '12h'
}: UpdateTimeModalProps) {
  // Parse the current time to initialize state
  const parsedTime = parse(currentTime, 'HH:mm:ss', new Date());
  const initialHour = timeFormat === '12h' 
    ? format(parsedTime, 'hh')
    : format(parsedTime, 'HH');
  const initialMinute = format(parsedTime, 'mm');
  const initialPeriod = format(parsedTime, 'a');

  const [time, setTime] = useState({
    hour: initialHour,
    minute: initialMinute,
    period: initialPeriod
  });

  const [format24h, setFormat24h] = useState(timeFormat === '24h');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  // *** Add this useEffect hook ***
  useEffect(() => {
    if (isOpen && currentTime) {
      try {
          // Use the current date to parse the time string correctly
          const parsedTime = parse(currentTime, 'HH:mm:ss', new Date());

          const initialHour = timeFormat === '12h' 
            ? format(parsedTime, 'hh') // Use 'hh' for 12-hour format (01-12)
            : format(parsedTime, 'HH'); // Use 'HH' for 24-hour format (00-23)

          const initialMinute = format(parsedTime, 'mm');
          const initialPeriod = format(parsedTime, 'a'); // 'AM' or 'PM'

          setTime({
            hour: initialHour,
            minute: initialMinute,
            period: initialPeriod as 'AM' | 'PM' // Cast to correct type
          });
          setErrorMessage(null); // Clear any previous error on opening

      } catch (error) {
        console.error('Error parsing time in modal:', currentTime, error);
        setErrorMessage('Invalid time format received.');
        // Fallback to a default time if parsing fails
        setTime({ hour: '12', minute: '00', period: 'AM' });
      }
    } else if (!isOpen) {
        // Optional: Reset time to a default or last used value when closing
        // For this scenario, re-parsing on open is sufficient, but good to consider reset needs.
    }
    // Dependencies: Re-run this effect if isOpen, currentTime, or timeFormat props change
  }, [isOpen, currentTime, timeFormat]);


  // Also update format24h state if the timeFormat prop changes
  useEffect(() => {
    setFormat24h(timeFormat === '24h');
  }, [timeFormat]);


  const handleTimeUpdate = () => {
    let hour = parseInt(time.hour);
    
    // Convert to 24-hour format if needed
    if (!format24h) {
      if (time.period === 'PM' && hour !== 12) hour += 12;
      if (time.period === 'AM' && hour === 12) hour = 0;
    }

    // Format time as HH:mm:ss
    const formattedTime = `${hour.toString().padStart(2, '0')}:${time.minute}:00`;
    onUpdate(formattedTime);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 rounded-full p-2">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Update Time
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Time Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-700">
              Select New Time
            </label>
            <button
              onClick={() => setFormat24h(!format24h)}
              className="flex items-center space-x-2 px-3 py-1.5 text-xs bg-gray-50 rounded-full hover:bg-gray-100"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{format24h ? '24-hour' : '12-hour'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* Hour Selection */}
            <select
              value={time.hour}
              onChange={(e) => setTime(prev => ({ ...prev, hour: e.target.value }))}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: format24h ? 24 : 12 }, (_, i) => {
                const hour = format24h ? i : (i + 1);
                return (
                  <option key={hour} value={hour.toString().padStart(2, '0')}>
                    {hour.toString().padStart(2, '0')}
                  </option>
                );
              })}
            </select>

            <span className="text-xl font-medium text-gray-400">:</span>

            {/* Minute Selection */}
            <select
              value={time.minute}
              onChange={(e) => setTime(prev => ({ ...prev, minute: e.target.value }))}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i.toString().padStart(2, '0')}>
                  {i.toString().padStart(2, '0')}
                </option>
              ))}
            </select>

            {/* AM/PM Selection for 12-hour format */}
            {!format24h && (
              <select
                value={time.period}
                onChange={(e) => setTime(prev => ({ ...prev, period: e.target.value }))}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleTimeUpdate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Update Time</span>
          </button>
        </div>
      </div>
    </div>
  );
}
