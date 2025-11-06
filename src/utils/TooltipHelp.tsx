// src/utils/TooltipHelp.tsx
import React, { useState, ReactNode } from 'react'; // Import useState

interface TooltipHelpProps {
  text: string;
  children: ReactNode;
  bgColor?: string;
  textColor?: string;
  className?: string;
}

export function TooltipHelp({ text, children, bgColor = 'gray-900', textColor = 'white', className }: TooltipHelpProps) {
  // State to manage the tooltip's visibility
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  return (
    // Apply onMouseEnter and onMouseLeave directly to this container
    // REMOVE the 'group' class here if it was present, as it's no longer needed for internal hover
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsTooltipVisible(true)} // Set tooltip visible on hover in
      onMouseLeave={() => setIsTooltipVisible(false)} // Hide tooltip on hover out
    >
      {/*{children} This is the trigger element (your button/icon) removed whitespace-nowrap */}

      <div className={className}> {/* Apply className here */}
        {children}
      </div>
      <div
          className={`absolute z-1000 bottom-full left-1/2 transform -translate-x-1/2 mb-2
           bg-gray-900 text-white text-xs rounded-md py-1 px-2 // Static classes for testing
            shadow-lg whitespace-nowrap
           ${isTooltipVisible ? 'opacity-100' : 'opacity-0'}
           transition-opacity duration-300 pointer-events-none`}
>
          {text}
      </div>

{/*
      <div
        className={`absolute z-1000 bottom-full left-1/2 transform -translate-x-1/2 mb-2
                   bg-${bgColor} text-${textColor} text-xs rounded-md py-1 px-2
                    shadow-lg whitespace-nowrap 
                   ${isTooltipVisible ? 'opacity-100' : 'opacity-0'} // Use state for opacity
                   transition-opacity duration-300 pointer-events-none`}
      >
        
        {text}
      </div>
  */}      
    </div>
  );
}

export default TooltipHelp;