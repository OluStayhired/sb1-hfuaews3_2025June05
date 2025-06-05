import { create } from 'zustand';
import { BskyAgent } from '@atproto/api';
import { createAgent, validateIdentifier } from '../utils/api';
import { supabase } from '../lib/supabase';

const debugLog = (message: string, data?: any) => {
  console.log(`[BlueSky Auth] ${message}`, data || '');
};

// Add UUID generation function
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface AuthState {
  agent: BskyAgent | null;
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  //New line to handle GrowAudienceModal
  onLoginSuccess?: () => void;
  setLoginSuccessHandler: (handler: () => void) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  agent: null,
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  onLoginSuccess: undefined,
  setLoginSuccessHandler: (handler) => set({ onLoginSuccess: handler }),
  login: async (identifier: string, password: string, rememberMe = false) => {
    debugLog('Starting login process');
    set({ isLoading: true, error: null });
    
    try {
      const agent = createAgent();
      const validIdentifier = validateIdentifier(identifier);
      
      debugLog('Attempting login with credentials');
      
      const loginResponse = await agent.login({
        identifier: validIdentifier,
        password
      });

      if (!loginResponse.success) {
        throw new Error('Login failed');
      };
      
      debugLog('Login successful, fetching profile');
      
      const profile = await agent.getProfile({
        actor: validIdentifier
      });

      // Generate UUID for new user
      const userId = generateUUID();

      // Store user in Supabase
      const { error: supabaseError } = await supabase
        .from('users')
        .upsert({
          id: userId,  // Use generated UUID
          handle: profile.data.handle,
          display_name: profile.data.displayName,
          avatar_url: profile.data.avatar,
          last_login: new Date().toISOString(),
          app_password: rememberMe ? password : null,
          remember_me: rememberMe
        }, {
        onConflict: 'handle',
        update: {
          last_login: new Date().toISOString(),
          app_password: rememberMe ? password : null,
          remember_me: rememberMe
        }
        });

      if (supabaseError) {
        console.error('Error storing user data:', supabaseError);
      }

      set({
        agent,
        isAuthenticated: true,
        user: { ...profile.data, uuid: userId }, // Include UUID in user object
        error: null
      });

        // Call onLoginSuccess handler after successful login
      const state = get();
      if (state.onLoginSuccess) {
        state.onLoginSuccess();
      }
      
      debugLog('Login process completed successfully');
    } catch (error: any) {
      debugLog('Login process failed', error);
      
      let errorMessage = 'Login failed. Please check your credentials and try again.';
      if (error.status === 401) {
        errorMessage = 'Invalid app password. Please check your credentials and ensure you\'re using an app password from BlueSky settings.';
      }
      
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    debugLog('Logging out');
    const { user } = get();
    
    if (user?.uuid) {  // Use uuid instead of did
      // Update last logout time in Supabase
      const { error } = await supabase
        .from('users')
        .update({ 
          last_logout: new Date().toISOString(),
          app_password: null,
          remember_me: false
        })
        .eq('id', user.uuid);  // Use uuid instead of did

      if (error) {
        console.error('Error updating logout time:', error);
      }
    }
    
    set({
      agent: null,
      isAuthenticated: false,
      user: null,
      error: null,
    });
    debugLog('Logout completed');
  },
  clearError: () => {
    debugLog('Clearing error state');
    set({ error: null });
  },
}));