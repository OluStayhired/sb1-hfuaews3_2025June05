import React from 'react';
import { PlayCircle } from 'lucide-react';

interface VideoButtonProps {
  videoTitle: string;
  videoDescription: string;
  thumbnailUrl: string;
  videoUrl: string; // <--- ADD THIS LINE
  onClick: (url: string) => void; // <--- CHANGE THIS: now takes a URL argument
  // Optional: add any additional props like disabled, className, etc.
}

const VideoPillButton: React.FC<VideoButtonProps> = ({
  videoTitle,
  videoDescription,
  thumbnailUrl,
  videoUrl, // <--- DESTRUCTURE THE NEW PROP
  onClick,
}) => {
  return (
    <button
      onClick={() => onClick(videoUrl)}
      className="
        flex items-center   // Use flexbox to align items horizontally
        space-x-3           // Add space between items
        px-4 py-2           // Padding around the content
        bg-white            // White background
        //border border-blue-200     // add a border here
        hover:border-blue-300      // add hover effect
        rounded-full         // **Pill shape** with full rounded corners
        //shadow-md           // Subtle shadow for depth
        hover:bg-gray-50    // Light hover effect
        hover:shadow-lg     // Larger shadow on hover
        transition-all      // Smooth transitions for hover effects
        duration-200        // Transition duration
        border border-blue-200 // Light border
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 // Focus styles
        w-full sm:w-auto // Responsive width: full width on small screens, auto on larger
        justify-start // Align content to the start
      "
    >
      {/* Thumbnail Image */}
      <div className="relative flex-shrink-0">
      <img
        src={thumbnailUrl}
        alt={`${videoTitle} thumbnail`}
        className="
          w-12 h-12         // Fixed width and height for the thumbnail (46x46 is approx 12 units in Tailwind rems)
          rounded-full        // Slightly rounded corners for the thumbnail
          object-cover      // Ensure image covers the area without distortion
          flex-shrink-0     // Prevent image from shrinking
        "
      />
        <PlayCircle
          className=" fill-blue-500 
            absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
            w-12 h-12 text-white // Icon size and color
            bg-blue-500 bg-opacity-50 // Semi-transparent blue background
            hover:bg-blue-200 // Semi-transparent blue background
            rounded-full // Make it a circle
            p-1 // Padding inside the circle
            //pointer-events-none // Allow clicks to pass through to the button
          "
        />
      </div>

      {/* Text Content */}
      <div className="flex flex-col text-left">
        <h3 className="
          text-sm           // Small font size for title
          font-semibold     // Semi-bold text
          text-gray-800     // Dark gray text
          truncate          // Truncate long titles with ellipsis
          max-w-xs          // Limit width to prevent overflow
        ">
          {videoTitle}
        </h3>
        <p className="
          text-xs           // Extra-small font size for description
          text-gray-500     // Lighter gray text
          truncate          // Truncate long descriptions
          max-w-xs          // Limit width
        ">
          {videoDescription}
        </p>
      </div>
    </button>
  );
};

export default VideoPillButton;