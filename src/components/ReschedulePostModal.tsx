// src/components/ReschedulePostModal.tsx

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Check, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Ensure this path is correct
import { format, parse } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

interface PostData {
    id: string;
    content: string; // Keeping content for preview, though not editable
    full_content?: string; // Keeping full_content for preview
    social_channel: string;
    user_handle: string;
    content_date: string;
    content_time: string;
    // We only need id, content_date, content_time, and user_email for the update
    // The other fields are useful for display but not for the update itself
}

interface ReschedulePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: PostData;
    onUpdate: (updatedPost: PostData) => void;
    onError: (error: any) => void;
}

export function ReschedulePostModal({
    isOpen,
    onClose,
    post,
    onUpdate,
    onError
}: ReschedulePostModalProps) {
    const [scheduledTime, setScheduledTime] = useState(post.content_time.substring(0, 5));
    const [selectedDate, setSelectedDate] = useState(new Date(post.content_date));
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [dateError, setDateError] = useState<string | null>(null);
    const [timeError, setTimeError] = useState<string | null>(null);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);

    // Effect for initial validation and error resetting
    useEffect(() => {
        if (isOpen && selectedDate) {
            validateAndSetDate(selectedDate, setDateError);
            if (scheduledTime) {
                validateAndSetTime(selectedDate, scheduledTime, setTimeError);
            }
        }
        if (!isOpen) {
            setDateError(null);
            setTimeError(null);
        }
    }, [isOpen, selectedDate, scheduledTime]);

  const targetTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Effect for handling click outside date picker
    useEffect(() => {
        if (!isDatePickerOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDatePickerOpen]);

    const validateAndSetDate = (date: Date, setDateError: React.Dispatch<React.SetStateAction<string | null>>) => {
        setDateError(null);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (date < today) {
            setDateError('Cannot schedule posts for dates in the past. Please select a current or future date.');
            return false;
        }
        setSelectedDate(date);
        return true;
    };

    const validateAndSetTime = (date: Date, timeString: string, setTimeError: React.Dispatch<React.SetStateAction<string | null>>) => {
        setTimeError(null);
        const [hours, minutes] = timeString.split(':').map(Number);
        const scheduledDateTime = new Date(date);
        scheduledDateTime.setHours(hours, minutes, 0, 0);

        const now = new Date();

        if (
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear() &&
            scheduledDateTime < now
        ) {
            setTimeError(`Cannot schedule for ${timeString} as this time has already passed today.`);
            return false;
        }
        setScheduledTime(timeString);
        return true;
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        validateAndSetDate(newDate, setDateError);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value;
        validateAndSetTime(selectedDate, newTime, setTimeError);
    };

    const handleSave = async () => {
        if (dateError || timeError) {
            return;
        }

        try {
            setIsSaving(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) throw new Error('No authenticated user');

            if (!post.id) {
                throw new Error('Post ID is required for update');
            }

            const timeStringWithoutSeconds = scheduledTime.substring(0, 5);
            const parsedTime = parse(timeStringWithoutSeconds, 'HH:mm', new Date());

            if (isNaN(parsedTime.getTime())) {
                throw new Error("Invalid time format");
            }

            const formattedTimeForDatabase = format(parsedTime, 'HH:mm:ss');

            const updatedPostData = {
                content_date: format(selectedDate, 'yyyy-MM-dd'),
                content_time: formattedTimeForDatabase,
                target_timezone: targetTimezone,
                updated_at: new Date().toISOString(),
                // Ensure schedule_status is true when rescheduling
                schedule_status: true,
                sent_post: false,
            };

            const { error } = await supabase
                .from('user_post_schedule')
                .update(updatedPostData)
                .match({
                    id: post.id,
                    user_email: session.user.email
                });

            if (error) throw error;

            onUpdate({
                ...post,
                ...updatedPostData,
            });

            setIsSaving(false);
            setIsSuccess(true);
            onClose(); // Close the modal after success

        } catch (err) {
            console.error('Error rescheduling post:', err);
            onError(err);
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-5 z-50">
            <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col p-6" style={{ maxHeight: '75vh' }}>
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Reschedule Post</h2>
                    <span className="items-start text-sm text-gray-400 rounded-md">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </span>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Conditional Rendering Based on isSuccess */}
                {isSuccess ? (
                    <div className="flex items-center space-x-3 p-4">
                        <div className="bg-green-100 rounded-full p-2">
                            <Check className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Post Rescheduled Successfully</p>
                            <p className="text-sm text-gray-500">
                                Your post will now be published on {format(selectedDate, 'MMM d')} at {scheduledTime}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Schedule Time */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                                Schedule Time
                            </label>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg hover:bg-blue-50 hover:text-blue-500 transition-colors"
                                    type="button"
                                >
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="text-xs text-gray-700">
                                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                    </span>
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                                <input
                                    type="time"
                                    value={scheduledTime}
                                    onChange={handleTimeChange}
                                    className={`px-4 py-2 text-sm cursor-pointer hover:border-blue-500 hover:bg-blue-100 hover:font-semibold border ${
                                        timeError ? 'border-red-300' : 'border-blue-300'
                                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                                />
                            </div>

                            {/* Start Date Picker Open */}
                            {isDatePickerOpen && (
                                <div
                                    ref={datePickerRef}
                                    className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
                                >
                                    <div className="flex space-x-2 mb-3">
                                        <button
                                            onClick={() => {
                                                const today = new Date();
                                                validateAndSetDate(today, setDateError);
                                            }}
                                            className="px-3 py-1 text-xs bg-blue-50 text-blue-500 rounded hover:bg-blue-100"
                                        >
                                            Today
                                        </button>
                                        <button
                                            onClick={() => {
                                                const tomorrow = new Date();
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                validateAndSetDate(tomorrow, setDateError);
                                            }}
                                            className="px-3 py-1 text-xs bg-blue-50 text-blue-500 rounded hover:bg-blue-100"
                                        >
                                            Tomorrow
                                        </button>
                                    </div>
                                    <input
                                        type="date"
                                        value={format(selectedDate, 'yyyy-MM-dd')}
                                        onChange={handleDateChange}
                                        className="w-full text-sm px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}
                            {/* End Date Picker Open */}
                        </div>

                        <div className={`flex items-center space-x-2 ${
                            dateError || timeError ? 'bg-red-50 border border-red-200' : 'hidden'
                        } rounded-md p-2`}>
                            {(dateError || timeError) && <AlertCircle className="text-red-300 w-5 h-5" />}
                            {dateError && (
                                <div className="mt-1 text-sm text-red-500">
                                    {dateError}
                                </div>
                            )}
                            {timeError && (
                                <div className="mt-1 text-sm text-red-500">
                                    {timeError}
                                </div>
                            )}
                        </div>

                        {/* Preview section */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Post Preview</h3>
                            <p className="text-sm text-gray-600">{post.full_content || post.content}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || dateError !== null || timeError !== null}
                                className={`px-6 py-2 ${
                                    dateError !== null || timeError !== null
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                } rounded-lg disabled:bg-gray-300 text-gray-50 flex items-center space-x-2`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Rescheduling...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>Reschedule Post</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
