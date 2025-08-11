// src/components/CreateCampaignHelpVideos.tsx
import React from 'react';

// Define the updated structure for each video item
interface Video {
  id: string;
  videoId: string; // The unique ID from YouTube or Vimeo
  platform: 'youtube' | 'vimeo'; // New: Specifies the video platform
  title: string;
  description: string;
}
  
const helpVideos: Video[] = [
  {
    id: '1',
    videoId: '1109030630', // YouTube ID
    platform: 'vimeo',
    title: 'Getting Started: Create Your First Campaign',
    description: 'Learn how to set up your content campaigns, define your audience, and set your social goals in minutes.',
  },
  {
    id: '2',
    //videoId: 'sY_C_y_g_1Q', // YouTube ID
    //platform: 'vimeo',
    title: 'Coming Soon: Improve Your Campaign Posts with AI',
    description: 'Discover how to use AI to generate compelling post ideas and rewrite your content for maximum engagement.',
    placeholderImage: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },

  {
    id: '3',
    //videoId: '334889000', // Vimeo ID (example)
    //platform: 'vimeo',
    title: 'Coming Soon: Scheduling Masterclass - Plan & Publish',
    description: 'Master the art of scheduling posts, managing your content calendar, and automating your social media presence.',
    placeholderImage: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
];

{/*
  {
    id: '2',
    videoId: 'sY_C_y_g_1Q', // YouTube ID
    platform: 'youtube',
    title: 'AI-Powered Content: Improve Your Posts',
    description: 'Discover how to use AI to generate compelling post ideas and rewrite your content for maximum engagement.',
  },

  {/*    
  {
    id: '4',
    videoId: 'k_okcNVxJ_o', // YouTube ID
    platform: 'youtube',
    title: 'Advanced Analytics: Track Your Performance',
    description: 'Dive deep into your campaign performance with advanced analytics and reporting features.',
  },
  {
    id: '5',
    videoId: '76979871', // Vimeo ID (example)
    platform: 'vimeo',
    title: 'Connecting Social Accounts: A Quick Guide',
    description: 'Learn how to seamlessly connect and manage all your social media accounts in one place.',
  },
   {
    id: '6',
    // No videoId or platform, as it's not available yet
    title: 'Coming Soon: Advanced Reporting',
    description: 'Get a sneak peek into our upcoming advanced reporting features to gain deeper insights into your campaigns.',
    placeholderImage: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 
     // Example Pexels URL for a placeholder
  },
  
  {
   id: '7',
     No videoId or platform, and no specific placeholder image
     title: 'Future Feature: Direct Messaging Integration',
     description: 'We are working on integrating direct messaging capabilities for even more streamlined communication.',
     This will use the generic fallback image
  },
  */}

export function CreateCampaignHelpVideos() {

  const genericFallbackImage = 'https://via.placeholder.com/640x360/F3F4F6/9CA3AF?text=Video+Unavailable'; 
  // Light gray background, dark gray text
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Learn More with Video Tutorials
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {helpVideos.map((video) => (
          <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:border-blue-300 transition-all">
            {/* Video Player */}
            <div className="relative w-full aspect-video">
               {video.videoId && video.platform ? (
                
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                // Conditionally set the src based on the platform
                src={
                  video.platform === 'youtube'
                    ? `https://www.youtube.com/embed/${video.videoId}`
                    : video.platform === 'vimeo'
                    ? `https://player.vimeo.com/video/${video.videoId}?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479`
                    : '' // Fallback for unsupported platforms
                }
                title={video.title}
                frameBorder="0"
                // Allow attributes for both YouTube and Vimeo
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
             ) : (
            
              //Render image placeholder if video is not available
                <img
                  src={video.placeholderImage || genericFallbackImage}
                  alt={`Placeholder for ${video.title}`}
                  className="w-full h-full object-cover"
                />
              )}
              
            </div>
            {/* Video Details */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{video.title}</h3>
              <p className="text-sm text-gray-600">{video.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
