import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client once
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a video file to Supabase Storage and returns its public URL.
 * @param file The File object (video) to upload.
 * @param userId The ID of the authenticated user, used for folder structure.
 * @returns A Promise that resolves to the public URL of the uploaded video.
 * @throws An error if the upload or URL retrieval fails.
 */
export async function uploadVideoGetUrl(file: File, userId: string): Promise<string> {
  // Generate a unique file path, replacing non-alphanumeric chars for safety
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  // Store videos in a 'videos' subfolder for the user, in a 'user-post-videos' bucket
  const filePath = `${userId}/videos/${fileName}`;

  // Upload the file to the 'user-post-videos' bucket
  const { data, error: uploadError } = await supabase.storage
    .from('user-post-videos') // <-- CRUCIAL CHANGE: Use your dedicated video bucket name
    .upload(filePath, file, {
      cacheControl: '3600', // Cache for 1 hour
      upsert: false // Set to true if you want to allow overwriting files with the same name/path
    });

  if (uploadError) {
    console.error('Error uploading video to Supabase Storage:', uploadError);
    throw new Error(`Failed to upload video: ${uploadError.message}`);
  }

  // Get the public URL for the uploaded video
  const { data: publicUrlData } = supabase.storage
    .from('user-post-videos') // <-- CRUCIAL CHANGE: Use the same dedicated video bucket
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    console.error('Failed to get public URL after video upload.');
    throw new Error('Failed to retrieve video URL.');
  }

  return publicUrlData.publicUrl;
}