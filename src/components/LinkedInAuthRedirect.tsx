// src/components/LinkedInAuthRedirect.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const LinkedInAuthRedirect = () => {
  const navigate = useNavigate();
  const VITE_LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
  const VITE_LINKEDIN_REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;

  useEffect(() => {
    const uniqueState = uuidv4();
    const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${VITE_LINKEDIN_CLIENT_ID}&redirect_uri=${VITE_LINKEDIN_REDIRECT_URI}&scope=profile&state=${encodeURIComponent(uniqueState)}`;
    window.location.href = linkedInAuthUrl;
  }, [navigate, VITE_LINKEDIN_CLIENT_ID, VITE_LINKEDIN_REDIRECT_URI]);

  return (
    <div>
      Redirecting to LinkedIn...
    </div>
  );
};

export default LinkedInAuthRedirect;
