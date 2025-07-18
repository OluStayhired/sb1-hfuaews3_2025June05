import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

 

// Ensure these environment variables are set in your .env.local for Next.js
// NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
// NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

// Initialize Supabase client once
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadImageGetUrl(file: File, userId: string): Promise<string> {
  // Generate a unique file path to prevent collisions, e.g., with timestamp or UUID
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`; // Simple sanitization
  const filePath = `${userId}/${fileName}`;

  // Upload the file to the 'user-post-images' bucket
  const { data, error: uploadError } = await supabase.storage
    .from('user-post-images') // Make sure this bucket exists in your Supabase project
    .upload(filePath, file, {
      cacheControl: '3600', // Cache for 1 hour
      upsert: false // Set to true if you want to allow overwriting files with the same name/path
    });

  if (uploadError) {
    console.error('Error uploading image to Supabase Storage:', uploadError);
    // Provide a more user-friendly error message or throw a custom error
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get the public URL for the uploaded image
  const { data: publicUrlData } = supabase.storage
    .from('user-post-images')
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    console.error('Failed to get public URL after upload.');
    throw new Error('Failed to retrieve image URL.');
  }

  return publicUrlData.publicUrl;
}