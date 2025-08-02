import { create } from 'zustand';
import { BskyAgent } from '@atproto/api';
import { createAgent, validateIdentifier } from '../utils/api';
import { supabase } from '../lib/supabase';

interface BlueskyProfile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  timezone?: string;
  social_channel?: string;
}

interface BlueskyState {
  agent: BskyAgent | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: BlueskyProfile | null;
  error: string | null;
  login: (identifier: string, password: string, rememberMe?: boolean, timezone?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useBlueskyStore = create<BlueskyState>((set, get) => ({
  agent: null,
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,

  login: async (identifier: string, password: string, rememberMe = false, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) => {
    try {
      set({ isLoading: true, error: null });
      
      // Create agent and validate identifier
      const validIdentifier = validateIdentifier(identifier);
      const agent = createAgent();
      
      // Attempt login
      const loginResponse = await agent.login({
        identifier: validIdentifier,
        password
      });

      if (!loginResponse.success) {
        throw new Error('Login failed');
      }

      // Fetch user profile
      const profile = await agent.getProfile({
        actor: validIdentifier
      });

      // Get current authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.id || !authUser?.email) {
        throw new Error('No authenticated user found');
      }

      // Store in social_channels table
      const { error: channelError } = await supabase
        .from('social_channels')
        .upsert({
          handle: profile.data.handle,
          display_name: profile.data.displayName,
          avatar_url: profile.data.avatar,
          channel_user_id: profile.data.did,
          last_login: new Date().toISOString(),
          app_password: rememberMe ? password : null,
          remember_me: rememberMe,
          user_id: authUser.id, // Add user_id reference
          email: authUser.email,
          social_channel: 'Bluesky',
          updated_at: new Date().toISOString(), 
          timezone: timezone // Store the timezone
        }, {
          //onConflict: 'handle, email'
          onConflict: 'user_id, channel_user_id'
        });

      if (channelError) {
        console.error('Error storing social channel:', channelError);
        throw new Error('Failed to store channel information');
      }

      set({
        agent,
        isAuthenticated: true,
        user: {
          did: profile.data.did,
          handle: profile.data.handle,
          displayName: profile.data.displayName,
          avatar: profile.data.avatar,
          social_channel: profile.data.social_channel,
          timezone: profile.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        error: null
      });

    } catch (error: any) {
      let errorMessage = 'Login failed. Please check your credentials.';
      if (error.status === 401) {
        errorMessage = 'Invalid app password. Please check your credentials.';
      }
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const { user, agent } = get();
    
    try {
      set({ isLoading: true });
      
      if (user?.handle) {
        // Get current authenticated user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id && authUser?.email) {
          // Update the social channel record
          const { error: updateError } = await supabase
            .from('social_channels')
            .update({ 
              last_login: null,
              app_password: null,
              remember_me: false,
              updated_at: new Date().toISOString()
            })
            .match({ 
              handle: user.handle,
              user_id: authUser.id,
              email: authUser.email
            });

          if (updateError) {
            console.error('Error updating social channel:', updateError);
          }
        }
      }

      if (agent) {
        await agent.logout();
      }

      set({
        agent: null,
        isAuthenticated: false,
        user: null,
        error: null
      });

    } catch (error) {
      console.error('Logout error:', error);
      set({ error: 'Failed to logout properly' });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null })
}));