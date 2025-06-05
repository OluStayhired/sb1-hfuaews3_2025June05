import { supabase } from '../lib/supabase';

// Create or update user record with better error handling
export async function createOrUpdateUser(
  did: string, 
  name: string, 
  handle: string,
  appPassword?: string,
  rememberMe: boolean = false
) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: did,
        name,
        handle,
        app_password: rememberMe ? appPassword : null,
        remember_me: rememberMe,
        last_login: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Database error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error creating/updating user:', err);
    return null;
  }
}

// Get saved credentials with improved error handling
export async function getSavedCredentials(handle: string) {
  if (!handle) {
    console.error('Invalid handle provided');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('app_password')
      .eq('handle', handle)
      .eq('remember_me', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found - not an error
        return null;
      }
      console.error('Database error:', error);
      return null;
    }

    return data?.app_password || null;
  } catch (err) {
    console.error('Error getting saved credentials:', err);
    return null;
  }
}

// Update user's logout time
export async function updateUserLogout(did: string) {
  if (!did) return null;

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        last_logout: new Date().toISOString(),
        app_password: null,
        remember_me: false
      })
      .eq('id', did);

    if (error) {
      console.error('Database error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error updating user logout:', err);
    return null;
  }
}