// supabase/functions/gemini-proxy/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabase } from './lib/supabaseClient.ts';

// Get the Gemini API key from environment variables (Supabase Secrets)
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Define CORS headers for cross-origin requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // In production, replace with your frontend origin
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Gemini API endpoint
//const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

// Rate limiting helper
const rateLimiter = {
  lastCall: 0,
  minInterval: 1000, // 1 second between calls
  checkAndWait: async () => {
    const now = Date.now();
    const timeToWait = rateLimiter.lastCall + rateLimiter.minInterval - now;
    if (timeToWait > 0) {
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    rateLimiter.lastCall = Date.now();
  }
};

// Optional: Simple caching mechanism
const responseCache = new Map<string, { response: any, timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Validate API key
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing API key' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }

  try {
    // Parse request body
    const requestData = await req.json();
    const { prompt, model = 'gemini-2.0-flash', cacheKey = null } = requestData;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    // Check cache if cacheKey is provided
    if (cacheKey) {
      const cachedResponse = responseCache.get(cacheKey);
      if (cachedResponse && (Date.now() - cachedResponse.timestamp < CACHE_DURATION)) {
        console.log('Cache hit for key:', cacheKey);
        return new Response(
          JSON.stringify(cachedResponse.response),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
          }
        );
      }
    }

    // Apply rate limiting
    await rateLimiter.checkAndWait();

    // Optional: Log request for monitoring (consider removing sensitive data)
    console.log(`Processing Gemini request for model: ${model}`);
    
    // Optional: Log user ID if available from auth
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId) {
      console.log(`Request from user: ${userId}`);
      
      // Optional: Log usage to Supabase for tracking
      await supabase
        .from('gemini_usage_logs')
        .insert({
          user_id: userId,
          model: model,
          prompt_length: prompt.length,
          timestamp: new Date().toISOString(),
        })
        .catch(err => console.error('Error logging Gemini usage:', err));
    }

    // Prepare request to Gemini API
    const geminiRequestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Make request to Gemini API
    const geminiResponse = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequestBody),
      }
    );

    // Process Gemini API response
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json();
      console.error('Gemini API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Error from Gemini API', 
          details: errorData 
        }),
        {
          status: geminiResponse.status,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    
    // Process and format the response
    let responseText = '';
    let safetyRatings = null;
    
    if (geminiData.candidates && geminiData.candidates.length > 0) {
      const candidate = geminiData.candidates[0];
      
      // Extract text from content parts
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        responseText = candidate.content.parts.map((part: any) => part.text).join('');
      }
      
      // Extract safety ratings if present
      if (candidate.safetyRatings) {
        safetyRatings = candidate.safetyRatings;
      }
    }

    // Format the response to match the expected structure in gemini.ts
    const formattedResponse = {
      text: responseText,
      safetyRatings: safetyRatings,
    };

    // Cache the response if cacheKey is provided
    if (cacheKey) {
      responseCache.set(cacheKey, {
        response: formattedResponse,
        timestamp: Date.now()
      });
    }

    // Return the formatted response
    return new Response(
      JSON.stringify(formattedResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      }
    );
  }
});
