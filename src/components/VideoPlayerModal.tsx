// src/components/VideoPlayerModal.tsx
import React from 'react';
import {  X } from 'lucide-react';

interface VideoPlayerModalProps {
  videoUrl: string;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ videoUrl, onClose, videoTitle }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 relative w-full max-w-lg">
        <button onClick={onClose} className="absolute rounded-full top-2 right-2 text-gray-400 hover:text-gray-600">
         <X className="h-4 w-4"/>
        </button>
        <h2 className="text-xl font-bold mb-4">Playing Video</h2>
        <video controls src={videoUrl} className="w-full h-auto rounded-md" autoPlay>
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default VideoPlayerModal; // Export it as default