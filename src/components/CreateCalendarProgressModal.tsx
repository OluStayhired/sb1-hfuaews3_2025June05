import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, Calendar, Sparkles, Database, FileText, Megaphone } from 'lucide-react';


// Define stages OUTSIDE the component to ensure it's a stable reference
const ALL_STAGES = [
  { id: 'preparing', label: 'Preparing campaign data', icon: <Calendar className="w-5 h-5" /> },
  { id: 'generating', label: 'Generating content ideas', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'storing', label: 'Storing in database', icon: <Database className="w-5 h-5" /> },
  { id: 'finalizing', label: 'Creating calendar entries', icon: <FileText className="w-5 h-5" /> },
  { id: 'complete', label: 'Finalizing campaign', icon: <Megaphone className="w-5 h-5" /> }
];

interface CreateCalendarProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  campaignName: string;
}

export function CreateCalendarProgressModal({ 
  isOpen, 
  onClose, 
  isLoading,
  campaignName
}: CreateCalendarProgressModalProps) {
  // Define the stages of calendar creation
  const stages = ALL_STAGES;

  // Track the current active stage
  const [currentStage, setCurrentStage] = useState(0);
  
  // Track completed stages
  const [completedStages, setCompletedStages] = useState<string[]>([]);

  // Progress through stages automatically
  useEffect(() => {
    if (!isOpen || !isLoading) return;
    
    // For the first 4 stages, progress automatically
    if (currentStage < 4) {
      const timer = setTimeout(() => {
        setCompletedStages(prev => [...prev, stages[currentStage].id]);
        setCurrentStage(prev => prev + 1);
      }, 1250); // <--- Changed to 1.25 seconds per stage
      
      return () => clearTimeout(timer);
    }
    
    // The last stage stays active until parent component changes isLoading
  }, [isOpen, currentStage, isLoading, stages]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStage(0);
      setCompletedStages([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
        {/* Close button - only show if not loading */}
        {!isLoading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900">
            {isLoading ? `Creating "${campaignName}"` : `"${campaignName}" Created!`}
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            {isLoading 
              ? "Please wait while we create your campaign" 
              : "Your campaign has been successfully created"}
          </p>
        </div>

        {/* Progress Stages */}
        <div className="space-y-4 mb-6">
          {stages.map((stage, index) => {
            const isActive = currentStage === index;
            const isCompleted = completedStages.includes(stage.id);
            
            return (
              <div 
                key={stage.id}
                className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
                  isActive ? 'bg-blue-50 border border-blue-100' : 
                  isCompleted ? 'bg-green-50 border border-green-100' : 
                  'bg-gray-50 border border-gray-100 opacity-60'
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-blue-100 text-blue-600' : 
                  isCompleted ? 'bg-green-100 text-green-600' : 
                  'bg-gray-200 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    stage.icon
                  )}
                </div>
                
                <div className="ml-4 flex-1">
                  <p className={`text-sm font-medium ${
                    isActive ? 'text-blue-700' : 
                    isCompleted ? 'text-green-700' : 
                    'text-gray-500'
                  }`}>
                    {stage.label}
                  </p>
                </div>
                
                {isCompleted && (
                  <span className="flex-shrink-0 text-xs text-green-600">Completed</span>
                )}
                
                {isActive && (
                  <span className="flex-shrink-0 text-xs text-blue-600 animate-pulse">In progress...</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div 
            className="h-full bg-blue-500 transition-all duration-700"
            style={{ 
              width: isLoading 
                ? `${Math.min(((currentStage + 1) / stages.length) * 100, 95)}%` 
                : '100%',
              backgroundColor: isLoading ? undefined : '#10B981' // green-500 when complete
            }}
          />
        </div>

        {/* Action Button - only show when complete */}
        {!isLoading && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Check className="w-5 h-5" />
            <span>View Campaign</span>
          </button>
        )}
      </div>
    </div>
  );
}