import React, { useState, useEffect } from 'react'; // Import useEffect
import { ArrowRight, ArrowLeft, X, Lightbulb, Users, User, FileText, Send, Globe, CheckCircle, Sparkles, Loader2, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BlueskyLogo from '../images/bluesky-logo.svg';
import LinkedInLogo from '../images/linkedin-solid-logo.svg';
import XLogo from '../images/x-logo.svg';
import { generateCalendar, generateListPost, generateFirstPostIdeas, generateFirstPost, generateFirstPostWithRetry } from '../lib/gemini';
import { getCompanyProblemAndAudience, CompanyInsightsResponse } from '../lib/firecrawl';
import { v4 as uuidv4 } from 'uuid';
import { Routes, Route, useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { CreateBlueskyModal } from './CreateBlueskyModal';
import { TooltipHelp } from '../utils/TooltipHelp';
import { TooltipExtended } from '../utils/TooltipExtended';

interface FirstPostIdeaRecord {
  id: string;
  first_post: string; // This is the actual generated post content
  content: string; // The original idea content
  target_audience: string;
  // ... any other relevant fields you expect
}

interface WelcomeGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
  postToUpdate: FirstPostIdeaRecord | null;
}



export function WelcomeGuide({ isOpen, onClose, onComplete, postToUpdate }: WelcomeGuideProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [competitorWebsite, setCompetitorWebsite] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [audience, setAudience] = useState('');
  const [selectedContentIdea, setSelectedContentIdea] = useState<number | null>(null);
  const [selectedSocialChannel, setSelectedSocialChannel] = useState<'Twitter' | 'LinkedIn' | 'Bluesky' | null>(null);
  const [generatedPost, setGeneratedPost] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Used for async operations like Firecrawl/Gemini calls
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false); // Used for generating ideas
  const [isGeneratingContent, setIsGeneratingContent] = useState(false); // Used for generating ideas
  const [isConnectingAccount, setIsConnectingAccount] = useState(false); //Used for connecting social account
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<CompanyInsightsResponse | null>(null);
  const [contentIdeas, setContentIdeas] = useState<any[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialChannelAccount[]>([]);
  const [hooksData, setHooksData] = useState<string[]>([]);
  const [isHooksLoading, setIsHooksLoading] = useState(false); // New loading state for hooks
  const [hooksError, setHooksError] = useState<string | null>(null); // New error state for hooks
  // Removed the duplicate 'loading' state; consolidate to 'isLoading'

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  interface CreateBlueskyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

  const [twitterLoading, setTwitterLoading] = useState(false);
  const [isBlueskyModalOpen, setIsBlueskyModalOpen ] = useState(false);
  
    //LinkedIn VITE
  const VITE_LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
  const VITE_LINKEDIN_REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;
  const VITE_FINAL_REDIRECT_URL = import.meta.env.VITE_FINAL_REDIRECT_URL;

  //Twitter VITE
  const VITE_TWITTER_CLIENT_ID = import.meta.env.VITE_TWITTER_CLIENT_ID;
  const VITE_TWITTER_REDIRECT_URI = import.meta.env.VITE_TWITTER_REDIRECT_URI;

  // --- Helper function for Twitter PKCE ---
// Required for Twitter OAuth 2.0 (PKCE)
const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};
  
// twitter helper functions
const base64urlencode = (input: ArrayBuffer): string => {
  const bytes = new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const generateCodeChallenge = async (code_verifier: string): Promise<string> => {
  const hashed = await sha256(code_verifier);
  return base64urlencode(hashed);
};
// End Helper Functions for Twitter

  const handleOpenBlueskyModal = () => {
    setIsBlueskyModalOpen(true); // Step 1: Open the Bluesky Modal
    onClose();                   // Step 2: Close the WelcomeGuide Modal itself
  };  

  // --- Crucial: useEffect to automatically transition to slide 1 when insights are loaded ---
  {/*
  useEffect(() => {
    if (insights && currentSlide === 0) {
      setProblemStatement(insights.Problem); // Pre-fill from insights
      setAudience(insights.Audience);       // Pre-fill from insights
      setCurrentSlide(1); // Move to the next slide
      setError(null); // Clear any previous errors on success
    }
  }, [insights, currentSlide]); // Depend on insights and currentSlide
*/}

   useEffect(() => {
    if (insights && currentSlide === 0) {
      setProblemStatement(insights.Problem);
      setAudience(insights.Audience);
      setCurrentSlide(1);
      setError(null);
    }
     // --- NEW: Handle return from LinkedIn OAuth ---
    const linkedInConnected = searchParams.get('linkedin_connected');
    const context = searchParams.get('context');
    const oauthError = searchParams.get('oauth_error');

    // Only process if the modal is open AND it's a LinkedIn callback we care about
    if (isOpen && linkedInConnected === 'true' && context === 'welcome_guide') {
        console.log('Detected successful LinkedIn connection from Welcome Guide context.');
        setCurrentSlide(3); // Go directly to the final slide (Congratulations!)
        setError(null); // Clear any previous errors

        // Crucial: Clear the query parameters from the URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('linkedin_connected');
        newSearchParams.delete('context');
        newSearchParams.delete('oauth_error'); // Also clear error params if any
        navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });

    } else if (isOpen && oauthError) {
        console.error('LinkedIn OAuth error detected:', oauthError);
        setError(`LinkedIn connection failed: ${oauthError.replace(/_/g, ' ')}`); 
      
        // Optionally, reset to a specific slide or show a clear error message
        // setCurrentSlide(2); // Maybe return to the social channel selection slide
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('linkedin_connected');
        newSearchParams.delete('context');
        newSearchParams.delete('oauth_error');
        navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
    }

  }, [insights, currentSlide, isOpen, searchParams, location.pathname, navigate]); 
// Add searchParams and navigate to dependencies

// ------------ Hard coded hooks for fallback ------------- //
  const hardcodedHooksString = `
- Want [Target audience goal/desire] This is how [my service/product/community] can help you: 
- What [beneficial outcome] looks like in [specific situation]. 
- Looking to [benefit] without [hassle]? 
- The [X] worst [topic] mistakes you can make. 
- I can't believe this [tactic/tip/strategy] actually works! 
- How [person/brand] [action] and how we can do the same! 
- I'm tired of hearing about [trend]. 
- What's your biggest challenge with [activity]? 
- How [person/brand] went from [situation] to [results]. 
- What are your thoughts on [topic/trend]? 
- [X] strategies to [goal]. 
- I [feeling] when I saw the results my clients/customers got from [activity]! 
- Wow! I can't believe the impact my [product, service, etc.] has had on [target audience]. 
- [Achievement]. If I could start from scratch, here's what I'd do differently. 
- Don't [take action] until you read this! 
- Don't fall for it - [X] myths about [topic]. 
- The [Number] trends that are shaking up the [topic] industry! 
- Here are [X] mistakes I made when [activity]. 
- Success story from one of my [niche clients] who [specific goal]. 
- [X] reasons why [topic] is [adjective]. 
- Tired of [problem]? Try this. 
- I don't believe in [commonly held belief]. 
- Don't let anyone tell you [X]. 
- Improve your [topic/skill] with one simple tactic 
- Stop [activity]. It doesn't work. 
- I don't think [activity] is worth the effort. 
- If you want to [desired result] try this. (Guaranteed results!) 
- The most underestimated [topic] strategy! 
- [X] things I wish I knew before [activity]: 
- I never expected [result]. Here's the full story. 
- Don't make this [topic] mistake when trying to [outcome]. 
- The [adjective] moment I realized [topic/goal]. 
- What do you think is the biggest misconception about [topic/trend]? 
- [X] signs that it's time to [take action]. 
- The truth behind [topic] - busting the most common myths. 
- The most important skill for [life situation]. 
- Don't get fooled - not everything you hear about [topic] is true. 
- [Failure]. Here's what I learned. 
- How I [achieved goal] In [specific time period]. 
- Trying to [outcome] in [difficulty]? 
- Top [X] reasons why [topic] is not working for you. 
- You won't believe these [number] statistics about [topic]. 
- I guarantee that if you do this, you’ll [desired result]. 
- How to make [topic] work for you. 
- [Achievement], here's what I learned about [segment] 
- Don't take my word for it - [insert social proof]. Here's how they did it: 
- [Activity] is overrated. 
- How [activity] is holding you back in [situation]. 
- [Statistics]. Here's what this means for your business. 
- They said it couldn't be done, but [insert what was accomplished]. 
- What's your best tip for [activity]? I'll start: 
- Special discount offer: Get [name of the product/service] for [discounted price] TODAY! 
- [X] [adjective] Ways To Overcome [issue]. 
- The one lesson I learned when [action]. 
- Do you think [topic] is [X]? Think again! 
- Hurry! [Name of the product/service] sale ends soon! 
- Do you want a [name/topic] template for free? 
- The [X] trends in [topic] that you need to watch out for. 
- Get [name of the product/service] now and be a part of [something special] 
- Make [outcome] happen in [time]. 
- I [action/decision] and it changed everything. 
- Top [number] lessons from [person/brand] to [action]. 
- I use this [name/topic] template to get [results] 
- [Activity] is way better than [activity]. 
- [X] simple ways to [action]. 
- What [target audience] MUST consider before [action]. 
- Here's why every [target audience] should care about [topic]. 
- How to use [resource] for maximum [outcome]. 
- [X] [topic] stats that'll blow your mind! 
- What no one tells you about [topic]. 
- If you are [target audience] looking to [outcome], this post is for you! 
- The most [adjective] thing that happened when I tried [strategy/tactic]. 
- You won't believe what [target audience] are saying about [product, service, etc.]! 
- How to [action] without sacrificing [activity]. 
- [X] [topic] mistakes you MUST avoid at all costs! 
- [Customer Review] 
- Try this next time when you [scenario]: 
- How to [skill] like a [expert]. 
- How to [outcome] with little to no [resource]. 
- Why I stopped [activity]. 
- Here's why [topic] isn't working for you. 
- Crazy results my clients/customers got from [activity]: 
- [X] reasons you're not [actioning]. 
- So many [target audience] get this wrong… Here’s the truth. 
- [X] Hacks To [outcome]. 
- The truth about [trend]. 
- The SECRET to [desired outcome]. 
- The [topic] Bible: The most important things you need to know. 
- Why [topic] is essential for [target audience]. 
- Get [name of the product/service] now and join the thousands of [target audience] who have achieved [result]. 
- If you’re serious about [goal], you must do this! 
- Reminder: [opposite of limiting belief]. 
- The [Number] BIGGEST trends to look out for in the [topic] industry. 
- [X] signs that you need to [action]. 
- Why [topic] is the hottest trend of [year]. 
- The Definitive Guide To [topic]. 
- I tried [strategy/tactic/approach], and here's what happened. 
- [Number] signs that [topic/trend] is changing rapidly. 
- The Ultimate [topic] Cheat Sheet. 
- How to [outcome] the RIGHT way! 
- The [topic or action] guide that'll [outcome]. 
- Did you know that [statistics]? 
- [X] things I wish someone told me about [topic/goal].`


// ----------- Start UseEffect to Fectch Hooks ---------------- //  
  {/*
useEffect(() => {
    const fetchHooks = async () => {

  // Get current user details
    const { data: { session } = {} } = await supabase.auth.getSession();
    const currentUserEmail = session?.user?.email;
    const currentUserId = session?.user?.id;

    if (!currentUserEmail || !currentUserId) {
      setError('User not authenticated. Cannot save progress.');
      return};

      setIsHooksLoading(true);
      setHooksError(null);

      try {
        // --- IMPORTANT NOTE: The 'content_hooks' table is NOT present in the provided database schema. ---
        // --- If you intend to store hooks in the database, you will need to create this table first. ---
        // --- This code assumes a 'content_hooks' table with a 'hooks' column exists. ---

        const { data, error } = await supabase
          .from('content_hooks')
          .select('hooks') // Assuming 'hooks' is a column containing an array of strings or a text field
          //.eq('user_email', userEmail) // Assuming hooks are user-specific
          .single(); // Assuming one row per user for hooks

        if (error && error.code !== 'PGRST116') { // PGRST116 means "No rows found"
          throw error; // Re-throw other errors
        }

        if (data && data.hooks) {
          // If 'hooks' column contains an array of strings (e.g., type text[])
          if (Array.isArray(data.hooks)) {
            setHooksData(data.hooks);
          } else if (typeof data.hooks === 'string') {
            // If hooks are stored as a single string (e.g., each hook on a new line), parse it
            setHooksData(data.hooks.split('\n').map(s => s.trim()).filter(s => s.length > 0));
          } else {
            console.warn('Fetched hooks data is not in expected array or string format:', data.hooks);
            setHooksData([]); // Fallback to empty array if format is unexpected
          }
        } else {
          // Fallback: If no hooks found in DB, or table doesn't exist, use hardcoded hooks
          console.warn('No hooks found in database. Using hardcoded hooks from gemini.ts as fallback.');
          setHooksData(hardcodedHooksString.split('\n').map(s => s.trim()).filter(s => s.length > 0));
        }
      } catch (err: any) {
        console.error('Error fetching hooks:', err);
        setHooksError(`Failed to load hooks: ${err.message}`);
        // Fallback to hardcoded hooks on error as well 
        setHooksData(hardcodedHooksString.split('\n').map(s => s.trim()).filter(s => s.length > 0));
      } finally {
        setIsHooksLoading(false);
      }
    };

    fetchHooks();
  }, []); // No dependency on email Re-fetch if userEmail changes  

*/}
  
//   -------- Start HandleForceClose ---------------  //

const handleForceClose = async () => {
  setIsLoading(true); // Start loading for the DB operation
  setError(null); // Clear previous errors

  try {
    // Get current user details
    const { data: { session } = {} } = await supabase.auth.getSession();
    const currentUserEmail = session?.user?.email;
    const currentUserId = session?.user?.id;

    if (!currentUserEmail || !currentUserId) {
      setError('User not authenticated. Cannot save progress.');
      return;
    }

    // Prepare the base data for the upsert/insert
    const baseData = {
      email: currentUserEmail,
      user_id: currentUserId,
      target_audience: audience, // From component state
      company_website: companyWebsite, // From component state
      in_progress: false,
      welcome_complete: true,
      close_guide: true,
      updated_at: new Date().toISOString(),
    };

    let operationPromise;

    if (postToUpdate?.id) {
      // Scenario 1: Existing record, perform upsert (update)
      console.log('Performing upsert for existing post idea:', postToUpdate.id);
      operationPromise = supabase
        .from('first_post_idea')
        .upsert({
          id: postToUpdate.id, // Use existing ID
          ...baseData,
          // Preserve existing topic, theme, content, and first_post from postToUpdate
          topic: postToUpdate.topic || null,
          theme: postToUpdate.theme || null,
          content: postToUpdate.content || null,
          first_post: postToUpdate.first_post || null,
        }, {
          onConflict: 'email', // Conflict resolution by ID
        });
    } else {
      // Scenario 2: No existing record, perform insert
      console.log('Performing insert for new post idea (guide closed early).');
      operationPromise = supabase
        .from('first_post_idea')
        .upsert({
          ...baseData,
          // For a new record when closing early, these might be null/empty
          topic: null,
          theme: null,
          content: null,
          first_post: null,
          created_at: new Date().toISOString(), // Add created_at for new inserts
        }, {
          onConflict: 'email', // Conflict resolution by ID
        });
    }

    const { error: dbError } = await operationPromise;

    if (dbError) {
      console.error('Error saving welcome guide progress:', dbError);
      setError('Failed to save progress. Please try again.');
    } else {
      console.log('Welcome guide progress saved successfully.');
      onClose(); // Close the modal after successful operation
    }
  } catch (err) {
    console.error('Unexpected error in handleForceClose:', err);
    setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setIsLoading(false);
  }
};
//   ------------    End HandleForceClose   ---------------   //
 

  const handleNext = () => {
    // This handler is for general "Next" buttons, not for the "Discover My Audience" flow initially

    if (currentSlide === 2) {
      // Logic for "Generate My First Post" button
      if (selectedContentIdea !== null && selectedSocialChannel !== null) {
        // Here you would integrate actual post generation, likely using another Gemini call
        setGeneratedPost(mockGeneratedPost); // Using mock for now
        setCurrentSlide(prev => prev + 1); // Move to slide 3
      }
    } else {
      // General next slide logic (e.g., from slide 1 to 2)
      setCurrentSlide(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
    setError(null); // Clear error when going back
  };

  const handleSelectContentIdea = (id: number) => {
    setSelectedContentIdea(id);
  };

  const handleSelectSocialChannel = (channel: 'Twitter' | 'LinkedIn' | 'Bluesky') => {
    setSelectedSocialChannel(channel);
  };

  const handleDiscoverAudience = async () => {
    if (!companyWebsite) {
      setError('Please enter a company website URL.');
      return;
    }

    setIsLoading(true); // Use isLoading for all async operations
    setInsights(null); // Clear previous insights
    setError(null); // Clear previous errors

    try {
      const result = await getCompanyProblemAndAudience(companyWebsite);
      setInsights(result); // This will trigger the useEffect to advance the slide and pre-fill fields
    } catch (err) {
      console.error('Error fetching company insights:', err);
      setError(`Failed to get insights: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  //slide 2 button onClick handler
  const handleContentIdeas = async () => {
  // 1. Determine currentUserEmail and currentUserId
  try {
    setIsGeneratingIdeas(true);
    setError(null);
    
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email || !session?.user?.id) {
      setError('User session not found. Please log in again.');
      return;
    }
    
    const currentUserEmail = session.user.email;
    const currentUserId = session.user.id;
    
    // 2. Retrieve problemStatement and audience from textareas
    if (!problemStatement || !audience) {
      setError('Please fill in both the problem statement and audience fields.');
      return;
    }
    
    // 3. Update user_preferences table with audience and problem
    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .upsert({
        company_website: companyWebsite,
        email: currentUserEmail,
        user_id: currentUserId,
        target_audience: audience,
        problem: problemStatement,
        timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });
      
    if (preferencesError) {
      console.error('Error updating user preferences:', preferencesError);
      // Continue anyway - this is not critical for the flow
    }
    
    // 4. Call generateFirstPostIdeas with the audience text
    const postIdeasResponse = await generateFirstPostIdeas(audience);


    
    if (postIdeasResponse.error) {
      setError(`Failed to generate post ideas: ${postIdeasResponse.error}`);
      return;
    }
    
    // Parse the JSON response from Gemini
    let postIdeas;
    try {
      // Look for JSON in the response text (it might be wrapped in markdown code blocks)
      const jsonMatch = postIdeasResponse.text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        postIdeas = JSON.parse(jsonMatch[1]);
      } else {
        // If no markdown block, try parsing the whole text
        postIdeas = JSON.parse(postIdeasResponse.text);
      }
      
      // Validate that we have an array with at least 2 items
      if (!Array.isArray(postIdeas) || postIdeas.length < 2) {
        throw new Error('Invalid post ideas format or insufficient ideas generated');
      }
    } catch (parseError) {
      console.error('Error parsing post ideas:', parseError, 'Raw text:', postIdeasResponse.text);
      setError('Failed to parse generated content ideas. Please try again.');
      return;
    }
    
    // 5. Populate first_post_idea table with 1 post idea
    const postIdeaInserts = postIdeas.slice(0, 1).map(idea => ({
      email: currentUserEmail,
      topic: idea.topic,
      theme: idea.theme,
      content: idea.content,
      user_id: currentUserId,
      target_audience: audience,
      in_progress: true,  
      welcome_complete: false,
      company_website: companyWebsite,
      created_at: new Date().toISOString()
    }));    

    const { data: upsertedIdeas, error: upsertError } = await supabase
      .from('first_post_idea')
      .upsert(postIdeaInserts, { onConflict: 'user_id' }) // <--- KEY CHANGE HERE
      .select('*'); // Keep .select('*') to get the returned (inserted or updated) row(s)

   if (upsertError) {
    console.error('Error upserting first post idea:', upsertError);
    // Handle error
    } else {
        console.log('First post idea upserted successfully:', upsertedIdeas);
        // Use upsertedIdeas (which will be an array containing the single post idea)
    }
    
    // 6. Proceed to Slide 3 and populate with the generated ideas
    // Update the state with the generated ideas

     // Use the 'upsertedIdeas' data which contains the database-generated IDs
   if (upsertedIdeas) {
        setContentIdeas(upsertedIdeas.map(idea => ({
            id: idea.id, // Use the ID from the database
            theme: idea.theme,
            topic: idea.topic,
            content: idea.content
        })));

        // --- PRECISELY HERE ---
        // Set selectedContentIdea with the ID of the single, pre-selected idea
        setSelectedContentIdea(upsertedIdeas[0].id);
        // --- END PRECISE LOCATION ---
     
    } else {
        // Fallback or error handling if insertedIdeas is null unexpectedly
        console.warn("No inserted ideas returned, but no insertError. Check Supabase RLS or insert config.");
        // Optionally, you might still use the original postIdeas with a temporary ID,
        // but it's better to rely on the database. For now, we'll keep it empty or error.
        setError('Failed to retrieve saved content ideas with their IDs.');
        return;
    }
    
    // Automatically advance to slide 3
    setCurrentSlide(2);
    
  } catch (err) {
    console.error('Error in handleContentIdeas:', err);
    setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setIsGeneratingIdeas(false);
  }
};

const handleGenerateContent = async () => {
  // 1. Identify the selected Content Idea and retrieve its associated attributes
  try {
    setIsGeneratingContent(true);
    setError(null);
    
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email || !session?.user?.id) {
      setError('User session not found. Please log in again.');
      return;
    }
    
    const currentUserEmail = session.user.email;
    const currentUserId = session.user.id;
    
    // Ensure a content idea and social channel are selected
    if (selectedContentIdea === null) {
      setError('Please select a content idea.');
      return;
    }
    
    if (selectedSocialChannel === null) {
      setError('Please select a social channel.');
      return;
    }
    
    // Retrieve the selected content idea from the first_post_idea table
    const { data: selectedIdeaData, error: ideaError } = await supabase
      .from('first_post_idea')
      .select('content, target_audience')
      .eq('email', currentUserEmail)
      .eq('id', selectedContentIdea)
      .single();
    
    if (ideaError || !selectedIdeaData) {
      console.error('Error fetching selected content idea:', ideaError);
      setError('Failed to retrieve the selected content idea.');
      return;
    }
    
    // 2. Determine character length based on selected social channel
    let charLength = '300'; // Default
    switch (selectedSocialChannel) {
      case 'Bluesky':
        charLength = '300';
        break;
      case 'Twitter':
        charLength = '280';
        break;
      case 'LinkedIn':
        charLength = '600';
        break;
    }
    
    // 3. Call generateFirstPost with the appropriate parameters
    const generatedPostResponse = await generateFirstPostWithRetry(
      //hooksData,
      selectedIdeaData.target_audience,
      selectedIdeaData.content,
      charLength
    );

     // 3. Call generateFirstPost with the appropriate parameters
    //const generatedPostResponse = await generateFirstPost(
     // selectedIdeaData.target_audience,
     // selectedIdeaData.content,
     // charLength
    //);

    
    
     if (generatedPostResponse.error) {
        // Check for specific 503 error from the proxy
        if (generatedPostResponse.error.includes('503') || generatedPostResponse.error.includes('Service Unavailable')) {
          setError("AI Model is busy, please try again later.");
        } else {
          setError(`Failed to generate post: ${generatedPostResponse.error}`);
        }
        return;
      }
    
    // 4. Update the first_post column in the first_post_idea table
    const { error: updateError } = await supabase
      .from('first_post_idea')
      .update({
        first_post: generatedPostResponse.text,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedContentIdea)
      .eq('email', currentUserEmail);
    
    if (updateError) {
      console.error('Error updating first post:', updateError);
      setError('Failed to save the generated post.');
      return;
    }
    
    // 5. Set the generated post in the state for display in the final slide
    setGeneratedPost(generatedPostResponse.text);
    
    // Advance to the next slide
    setCurrentSlide(prev => prev + 1);
    
   } catch (err: any) { // Explicitly type err as 'any' to access message property
      console.error('Error in handleGenerateContent:', err);
      // Check if the error object itself contains status information or a specific message
      if (err.message && (err.message.includes('503') || err.message.includes('Service Unavailable') || err.message.includes('AI Model is busy'))) {
        setError("AI Model is busy, please try again later.");
      } else {
        setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setIsGeneratingContent(false);
    }
  };

//--------- Start Handles for Connecting to Social Media ---------------//
  
// handle connect Twitter //
 const handleConnectTwitter = async () => {
  console.log('handleConnectTwitter: initiated');
  setTwitterLoading(true); // Start loading indicator

  try {
    // 1. Get current user's session to ensure we're authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('handleConnectTwitter: No authenticated user found or session error:', sessionError);
      return;
    }

    const currentUserId = session.user.id;
    const currentUserEmail = session.user.email;
    const frontendOrigin = window.location.origin;
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // 2. Generate PKCE code_verifier and code_challenge
    //    code_verifier: A high-entropy random string
    //    code_challenge: SHA256 hash of the verifier, base64url encoded
    const code_verifier = uuidv4() + uuidv4(); 
    const code_challenge = await generateCodeChallenge(code_verifier);

    // 3. Generate a unique state parameter for security (standard OAuth param)
    const uniqueState = uuidv4();

    // 4. Store the state AND the code_verifier in the database linked to the user ID
    //    The code_verifier is needed by the backend/Edge Function callback to exchange the code
    try {
      const { error: stateError } = await supabase
        .from('oauth_states') 
        .insert({
          state: uniqueState,
          code_verifier: code_verifier, // <--- Store the verifier!
          user_id: currentUserId,
          email: currentUserEmail,
          frontend_origin: frontendOrigin,
          user_timezone: userTimezone,
          // Add a timestamp and perhaps an expiry for cleanup
          created_at: new Date().toISOString(),
        });

      if (stateError) {
        console.error('handleConnectTwitter: Error storing OAuth state and code_verifier:', stateError);
        setTwitterLoading(false); 
       
        return;
      }

      console.log('handleConnectTwitter: OAuth state and code_verifier stored successfully:', uniqueState);

    } catch (dbError) {
      console.error('handleConnectTwitter: Unexpected error storing OAuth data:', dbError);
      setTwitterLoading(false); 
      
      return;
    }

    // 5. Define the required Twitter permissions (scopes)
    //    'offline.access' is usually needed to get a refresh token
    const twitterScopes = [
      'tweet.read',
      'users.read',
      'tweet.write', 
      'offline.access', // Required to get a refresh token for long-term access
      // Add other scopes as needed based on Twitter API docs
    ];
    const scopeParam = encodeURIComponent(twitterScopes.join(' ')); 
    // Twitter scopes are space-separated, not comma-separated

    // 6. Construct the Twitter (X) authorization URL (OAuth 2.0 endpoint)
    const authUrl = `https://twitter.com/i/oauth2/authorize?` +
                    `response_type=code&` +
                    `client_id=${encodeURIComponent(VITE_TWITTER_CLIENT_ID)}&` + 
                    `redirect_uri=${encodeURIComponent(VITE_TWITTER_REDIRECT_URI)}&` + 
                    `state=${encodeURIComponent(uniqueState)}&` + 
                    `scope=${scopeParam}&` + 
                    `code_challenge=${encodeURIComponent(code_challenge)}&` + 
                    `code_challenge_method=S256`; 

    console.log('handleConnectTwitter: Redirecting user to Twitter authorization URL:', authUrl);

    // 7. Redirect the user's browser to Twitter's authorization page
    window.location.href = authUrl;

  } catch (generalError) {
    // Catch any errors before the database save/redirect
    console.error('handleConnectTwitter: An unexpected error occurred before redirection:', generalError);
    setTwitterLoading(false); 
  }
};    

// ------ handle connect LinkedIn ------ //
  
  const handleConnectLinkedIn = async () => {
  console.log('Connecting to LinkedIn...');
  console.log('LinkedIn Client ID:', VITE_LINKEDIN_CLIENT_ID);
  console.log('LinkedIn Redirect URI:', VITE_LINKEDIN_REDIRECT_URI);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.error('No authenticated user found. User must be logged in to connect LinkedIn.');
      return;
    }
    console.log('Authenticated user ID:', session.user.id);

    const currentUserId = session.user.id;
    const currentUserEmail = session.user.email;
    const frontendOrigin = window.location.origin; 
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    const baseUniqueState = uuidv4();
    const contextIdentifier = 'welcome_guide';
    
    const uniqueState = `${baseUniqueState}_${contextIdentifier}`;

    try {
      const { error: stateError } = await supabase
        .from('oauth_states')
        .insert({
          state: uniqueState,
          user_id: currentUserId,
          email: currentUserEmail,
          frontend_origin: frontendOrigin,
          user_timezone: userTimezone,
        });

      if (stateError) {
        console.error('Error storing OAuth state:', stateError);
        return;
      }

      console.log('OAuth state stored successfully:', uniqueState);

    } catch (error) {
      console.error('Unexpected error storing OAuth state:', error);
      return;
    }

    const linkedinScopes = ['openid', 'profile', 'email', 'w_member_social'];
    const scopeParam = encodeURIComponent(linkedinScopes.join(' '));

    const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
                            `response_type=code&` +
                            `client_id=${encodeURIComponent(VITE_LINKEDIN_CLIENT_ID!)}&` +
                            `redirect_uri=${encodeURIComponent(VITE_LINKEDIN_REDIRECT_URI!)}&` +
                            `scope=${scopeParam}&` +
                            `state=${encodeURIComponent(uniqueState)}`;

    console.log('Redirecting user to LinkedIn authorization URL:', linkedInAuthUrl);

    window.location.href = linkedInAuthUrl;

  } catch (err) {
    console.error('Error connecting to LinkedIn:', err);
  }
};  

// ------ handle connect Bluesky ------ //  

    const handleConnectBluesky = () => {
    setIsBlueskyModalOpen(true);
      //onClose();
  };

  const handleCloseBlueskyModal = () => {
    setIsBlueskyModalOpen(false);

  };

  const handleConnectSocial = async () => {
  try {
    // 1. Identify the selectedSocialChannel and update the social_channel column
    if (!selectedSocialChannel) {
      setError('Please select a social channel first');
      return;
    }
    
    // Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email || !session?.user?.id) {
      setError('User session not found. Please log in again.');
      return;
    }
    
    // Update the first_post_idea table with the selected social channel
    if (selectedContentIdea !== null) {
      const { error: updateError } = await supabase
        .from('first_post_idea')
        .update({
          social_channel: selectedSocialChannel,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedContentIdea)
        .eq('email', session.user.email);
        
      if (updateError) {
        console.error('Error updating social channel:', updateError);
        setError('Failed to update social channel preference');
        return;
      }
    }
    
    // 2. Call the appropriate connection handler based on selectedSocialChannel
    switch (selectedSocialChannel) {
      case 'Bluesky':
        handleConnectBluesky();
        break;
      case 'LinkedIn':
        handleConnectLinkedIn();
        break;
      case 'Twitter':
        handleConnectTwitter();
        break;
      default:
        setError('Invalid social channel selected');
    }
    
  } catch (err) {
    console.error('Error in handleConnectSocial:', err);
    setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};


const handleSaveAndClose = async () => {
  try {
    // 1. Get the current user's session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email || !session?.user?.id) {
      setError('User session not found. Please log in again.');
      return;
    }
    
    // 2. Update the first_post_idea table with the required status changes
    if (selectedContentIdea !== null) {
      const { error: updateError } = await supabase
        .from('first_post_idea')
        .update({
          save_close: true,          // a) set save_close = true
          in_progress: false,        // b) set in_progress = false
          welcome_complete: true,    // c) set welcome_complete = true
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedContentIdea)
        .eq('email', session.user.email);
        
      if (updateError) {
        console.error('Error updating post status:', updateError);
        setError('Failed to save your progress. Please try again.');
        return;
      }
    }
    
    // 3. Close the WelcomeGuide modal
    onClose();
    
    // 4. Show notification message
    // This would typically be handled by a toast notification system
    // For this example, we'll assume you have a notification system in place
    // or you could implement a simple one using state in the parent component
    
    // Call onComplete with relevant data to notify the parent component
    onComplete({
      message: "Connect an Account to Generate and Schedule Posts",
      status: "success",
      selectedSocialChannel,
      contentGenerated: true,
      save_close: true
    });
    
  } catch (err) {
    console.error('Error in handleSaveAndClose:', err);
    setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

const handleBlueskyModalSuccess = () => {
    if (postToUpdate && postToUpdate.first_post) {
        onComplete({
            message: "Bluesky Account Connected!",
            status: "success",
            selectedSocialChannel: 'Bluesky',
            contentGenerated: true,
            save_close: false,
            postContent: postToUpdate.first_post,
            postContentId: postToUpdate.id
        });
    } else {
        onComplete({
            message: "Bluesky Account Connected!",
            status: "success",
            selectedSocialChannel: 'Bluesky',
            contentGenerated: true,
            save_close: false
        });
    }

    onClose();
};  
  

  

  // HELPER FUNCTION: Check if the current slide's required inputs are filled
  const isCurrentSlideInputsComplete = () => {
    switch (currentSlide) {
      case 0:
        // Slide 0 transition is handled by handleDiscoverAudience and useEffect.
        // The "Discover My Audience" button's disabled state already controls this.
        return true; // No general "Next" button on this slide
      case 1:
        return !!problemStatement && !!audience; // Both problemStatement and audience are required
      case 2:
        return selectedContentIdea !== null && selectedSocialChannel !== null; // Both content idea and social channel are required
      case 3:
        return true; // Last slide, no inputs needed to proceed
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SoSavvy! 👋</h2>
              <p className="text-lg text-gray-600 mb-6">Create your first social media post in 30 seconds!</p>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Start writing and scheduling engaging posts your audience will love ❤️
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="companyWebsite" className="block text-sm font-medium text-gray-700 mb-1">Your company website</label>
                <input
                  id="companyWebsite"
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="w-full px-4 py-4 border hover:border hover:border-blue-300 border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              
              
            </div>

            {/* NEW CTA BUTTON FOR SLIDE 0 */}
            <div className="text-center mt-8">
              <button
                onClick={handleDiscoverAudience}
                disabled={!companyWebsite || isLoading}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Globe className="w-5 h-5 mr-2" />
                )}
                <span>{isLoading ? "Discovering..." : "Discover My Audience"}</span>
              </button>
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center mt-4">{error}</p>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">We found your ideal customers!</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                We also understand the problem you solve and who you solve it for
              </p>
            </div>

            <div className="space-y-4">
            <div>
                <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1">Here's your ideal customer!</label>
                <textarea
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Your ideal customer is a marketer..."
                  className="w-full px-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 min-h-[100px]"
                />
              </div>
        
              <div>
                <label htmlFor="problemStatement" className="block text-sm font-medium text-gray-700 mb-1">This is the problem you're solving!</label>
                <textarea
                  id="problemStatement"
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  placeholder="Tell us the problem you're solving..."
                  className="w-full px-4 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 min-h-[100px]"
                />
              </div>

              
            </div>

        {/* --- ERROR DISPLAY AREA --- */}
            {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}
       {/* --- END ERROR DISPLAY AREA --- */}            

            <div className="text-center">
              <button
                //onClick={handleNext} // This button advances to slide 2 (content ideas)
                onClick={handleContentIdeas}
                disabled={!problemStatement || !audience}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >

                 {isGeneratingIdeas ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="w-5 h-5 mr-2" />
                )}
                <span>{isGeneratingIdeas ? "Generating..." : "Generate Content Ideas"}</span>
                
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <ThumbsUp className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Social Media Style</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Select a social channel style for your first post.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-normal text-gray-700 mb-2">Sample content idea 💡:</label>
              <div className="grid gap-3">
                {/*
                {contentIdeas.map(idea => (
                  <div
                    key={idea.id}
                    onClick={() => handleSelectContentIdea(idea.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      selectedContentIdea === idea.id
                        ? 'border border-blue-500 bg-blue-50'
                        : 'bg-gray-50 border hover:border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{idea.theme}</h3>
                        <p className="text-sm text-gray-700 mt-1">{idea.topic}</p>
                      </div>
                      {selectedContentIdea === idea.id && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}

                */}

                {/*Start Selecting The Only Content Idea*/}

                {contentIdeas.map(idea => {
    // Since there's always only one idea, we can consider it
    // inherently selected and not clickable.
    const isSelected = true; // This will always be true for the single idea

    return (
        <div
            key={idea.id}
            className={`p-4 rounded-lg transition-colors
                        ${
                          // Always apply the "selected" styles
                          'bg-gradient-to-r from-blue-50 to-white border border-blue-100'
                        }
                        // Explicitly remove cursor-pointer and hover effects
                        // 'cursor-default' can be used if you want to explicitly show it's not clickable
                        // Remove 'hover:border-blue-300 hover:bg-blue-50' as well
                       `}
        >
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-medium text-gray-900">{idea.theme}</h3>
                    <p className="text-sm text-gray-700 mt-1">{idea.topic}</p>
                </div>
                {/* Always show the checkmark for the single, pre-selected item */}
                {isSelected && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                )}
            </div>
        </div>
    );
})}


                {/*End Selecting The Only  Content Idea*/}
                
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-normal text-gray-700 mb-2">Select social channel style ✍️:</label>
              <div className="flex space-x-3">
               
                <button
                  onClick={() => handleSelectSocialChannel('Twitter')}
                  className={`flex-1 p-3 border rounded-lg flex justify-center flex-col items-center transition-colors ${
                    selectedSocialChannel === 'Twitter'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                <TooltipExtended text="Choose Twitter for short form content of 280 characters or less">
                  <div className="flex flex-col items-center">
                    <img src={XLogo} alt="Twitter/X" className="w-6 h-6 mb-2" />
                    <span className="text-sm font-medium">Twitter/X</span>
                  </div>
                </TooltipExtended>
                </button>
                

                
                <button
                  onClick={() => handleSelectSocialChannel('LinkedIn')}
                  className={`flex-1 p-3 border rounded-lg flex flex-col items-center transition-colors ${
                    selectedSocialChannel === 'LinkedIn'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                 <TooltipExtended text="Choose LinkedIn for medium form content of 600 characters or more"> 
                   <div className="flex flex-col items-center">
                      <img src={LinkedInLogo} alt="LinkedIn" className="w-6 h-6 mb-2" />
                      <span className="text-sm text-center font-medium">LinkedIn</span>
                   </div>
                 </TooltipExtended>
                </button>
                

                
                <button
                  onClick={() => handleSelectSocialChannel('Bluesky')}
                  className={`flex-1 p-3 border rounded-lg flex flex-col items-center transition-colors ${
                    selectedSocialChannel === 'Bluesky'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <TooltipExtended text="Choose Bluesky (similar to Twitter) 300 characters or less">
                    <div className="flex flex-col items-center">
                      <img src={BlueskyLogo} alt="Bluesky" className="w-6 h-6 mb-2" />
                      <span className="text-sm text-center font-medium">Bluesky</span>
                    </div>
                  </TooltipExtended>
                </button>
                
                
              </div>
            </div>

        {/* --- ERROR DISPLAY AREA --- */}
            {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}
       {/* --- END ERROR DISPLAY AREA --- */}

            <div className="text-center">
              <button
                onClick={handleGenerateContent} // This button advances to slide 3 (generated post)
                //disabled={selectedContentIdea === null || selectedSocialChannel === null}
                disabled={selectedContentIdea === null || selectedSocialChannel === null || isGeneratingContent} // Add isGeneratingContent to disabled
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >

                {isGeneratingContent ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                <span>{isGeneratingContent ? "Generating..." : "Generate My First Post"}</span>
            
              </button>
            </div>
          </div>
        );

      case 3:
        return  (
  <div className="space-y-8 flex-grow flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
 
    <div className="text-center flex-shrink-0">
        {/* The overall flex container to arrange icon and text */}
          <div className="flex items-center justify-center space-x-3 mb-4">
            {/* Icon (moved to be inline with text, slightly smaller mb) */}
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          {/* Congratulations text (now with a slightly smaller font size) */}
            <h2 className="text-xl font-bold text-gray-900">Congratulations! 🎉</h2>
          </div>
            {/* Sub-message remains centered, but might be slightly wider now */}
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Connect your social media accounts to schedule your Post.
              </p>
          </div>
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex-shrink-0">
      {/* This container for post details and buttons will also take its natural height and not compress. */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
            {selectedSocialChannel === 'Twitter' && <img src={XLogo} alt="Twitter" className="w-3 h-3" />}
            {selectedSocialChannel === 'LinkedIn' && <img src={LinkedInLogo} alt="LinkedIn" className="w-3 h-3" />}
            {selectedSocialChannel === 'Bluesky' && <img src={BlueskyLogo} alt="Bluesky" className="w-3 h-3" />}
          </div>
        </div>
        <div>
          <p className="font-medium text-gray-900">Your {selectedSocialChannel} Post</p>
          <p className="text-xs text-gray-500">Just now</p>
        </div>
      </div>

      {/* Primary change: Removed fixed max-height. */}
      {/* This div will now expand to show the full content of generatedPost by default. */}
      {/* overflow-y-auto will make it scrollable *only if* the content is too long for the available space. */}
      <div className="p-3 bg-gray-50 rounded-lg mb-4 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <p className="text-xs text-gray-700 whitespace-pre-line">{generatedPost}</p>
      </div>

      <div className="flex space-x-3 mt-6">
        {/* Buttons remain as they are, visible below the post content. */}
        <button
          onClick={handleConnectSocial}
          disabled={selectedContentIdea === null || selectedSocialChannel === null || isGeneratingContent || isConnectingAccount}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
          {isConnectingAccount ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          <span>{isConnectingAccount ? "Connecting..." : `Connect ${selectedSocialChannel} `}</span>
        </button>

        <button
          onClick={handleSaveAndClose}
          className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center">
          <FileText className="w-4 h-4 mr-2" />
          <span>Save & Close</span>
        </button>
      </div>
    </div>
  </div>
);
    default:
    return null;

         }
  };

    

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">

        {/* Close button */}
        <button
          //onClick={onClose}
          onClick={handleForceClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(currentSlide + 1) * 25}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {renderSlide()}
        </div>

        {/* Navigation - simplified as most transitions are now handled by specific buttons 
        <div className="px-8 py-4 bg-gray-50 flex justify-between">
          {currentSlide > 0 && currentSlide < 3 && ( // Only show back button if on slide 1 or 2
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back</span>
            </button>
          )}

          {/*
          {currentSlide === 3 && ( 
      // On last slide, provide a way to complete/close or go back if needed
             <button
              onClick={() => onComplete()}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <span>Complete Setup</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          )}
        */}

          {/* This empty div ensures spacing when there's no back button on slide 0,
              and when there's no generic "Next" button in the footer for slides 0 and 3. 
          {(currentSlide === 0 || currentSlide === 3) && <div />}
        </div>
      */}
        
      </div>

            <CreateBlueskyModal 
              isOpen={isBlueskyModalOpen}
              onClose={handleCloseBlueskyModal}
              onSuccess={handleBlueskyModalSuccess} 
            />
      
    </div>
  );
}

export default WelcomeGuide;