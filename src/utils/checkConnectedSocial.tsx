// src/utils/checkConnectedSocial.tsx
import { supabase } from '../lib/supabase';

interface ConnectedSocials {
  bluesky: boolean;
  linkedin: boolean;
  twitter: boolean;
}

export async function checkConnectedSocials(): Promise<ConnectedSocials | null> {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      console.error('No authenticated user found');
      return null;
    }

    // Query social_channels table for connected accounts
    const { data: socialChannels, error } = await supabase
      .from('social_channels')
      .select('social_channel, activated')
      .eq('email', session.user.email);

    if (error) {
      console.error('Error checking social channels:', error);
      return null;
    }

    // Initialize result object
    const result: ConnectedSocials = {
      bluesky: false,
      linkedin: false,
      twitter: false
    };

    // Check active connections
    socialChannels?.forEach(channel => {
      if (channel.social_channel === 'Bluesky' && channel.activated) {
        result.bluesky = true;
      }
      if (channel.social_channel === 'Twitter' && channel.activated) {
        result.twitter = true;
      }
      if (channel.social_channel === 'LinkedIn' && channel.activated) {
        result.linkedin = true;
      }
    });

    return result;

  } catch (err) {
    console.error('Error checking connected socials:', err);
    return null;
  }
}

// Helper function to check specific platform
export async function checkPlatformConnection(platform: 'Bluesky' | 'LinkedIn' | 'Twitter'): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return false;

    const { data, error } = await supabase
      .from('social_channels')
      .select('id')
      .match({
        email: session.user.email,
        social_channel: platform,
        activated: true
      });

    if (error) {
      console.error(`Error checking ${platform} connection:`, error);
      return false;
    }

    return data && data.length > 0;

  } catch (err) {
    console.error(`Error checking ${platform} connection:`, err);
    return false;
  }
}
