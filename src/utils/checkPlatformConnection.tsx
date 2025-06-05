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