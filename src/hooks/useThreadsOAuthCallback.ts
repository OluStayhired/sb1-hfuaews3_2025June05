// This is the hook defined earlier, which you can place in its own file
// e.g., src/hooks/useThreadsOAuthCallback.ts

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const useThreadsOAuthCallback = (onCallbackProcessed: () => Promise<void>) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // Check for status parameters set by your Edge Function's final redirect
    const threadsConnected = params.get('threads_connected');
    const error = params.get('error'); // Assuming your Edge Function includes an 'error' parameter on failure

    // Only process if we detect the result of the Threads OAuth flow
    if (threadsConnected || error) {
      console.log('Detected Threads OAuth callback result in URL.');

      if (threadsConnected) {
        console.log('Threads account connected successfully!');
        // TODO: Display a success notification to the user (e.g., a toast message)

      } else if (error) {
        console.error('Error connecting Threads:', error);
        // TODO: Display an error notification to the user, potentially showing a user-friendly message based on the 'error' code
        // Example: if (error === 'oauth_state_mismatch') { display 'Security error during connection.' }
      }

      // This is crucial: Call the function to refresh the UI data AFTER the callback is processed
      onCallbackProcessed();


      // Clean up the URL parameters after processing
      const newParams = new URLSearchParams(location.search);
      newParams.delete('threads_connected');
      newParams.delete('error');
      // Clean up any potential old OAuth parameters too, just in case
      newParams.delete('code');
      newParams.delete('state');
      newParams.delete('provider');

      // Navigate to the same path without the parameters, replacing the history entry
      navigate(location.pathname + (newParams.toString() ? `?${newParams.toString()}` : ''), { replace: true });

    }

    // The effect should re-run if the URL search parameters change
  }, [location.search, navigate, onCallbackProcessed]); // Dependencies
};

export default useThreadsOAuthCallback; // Export the hook