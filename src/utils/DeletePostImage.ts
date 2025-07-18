import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function deletePostImage(filePath: string) { // <--- Keep 'async' here
  // filePath should be the full path within the bucket, e.g., 'user_id/image-timestamp.jpg'
  const { data, error } = await supabase.storage // <--- 'await' is necessary
    .from('user-post-images')
    .remove([filePath]); // .remove takes an array of paths

  if (error) {
    console.error('Error deleting image:', error);
    throw error;
  }

  console.log('Image successfully deleted:', filePath);
  return true;
}