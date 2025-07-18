import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updatePostImage(oldFilePath: string, newFile: File, userId: string) {

  const { data, error } = await supabase.storage
    .from('user-post-images')
    .update(oldFilePath, newFile, {
      cacheControl: '3600',
      upsert: true // Set to true to replace if existing, or insert if not
    });

  if (error) {
    console.error('Error updating image:', error);
    throw error;
  }

  // The public URL for the updated image will remain the same if the path didn't change
  const { data: publicUrlData } = supabase.storage
    .from('user-post-images')
    .getPublicUrl(oldFilePath);

  return publicUrlData.publicUrl;
}