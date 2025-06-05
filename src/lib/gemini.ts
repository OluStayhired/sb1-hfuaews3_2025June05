// src/lib/gemini.ts
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';

// --- REMOVE THE API KEY HERE ---
// const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // This line should be removed or commented out

// This variable will now *always* be used for secure calls
const GEMINI_PROXY_EDGE_FUNCTION_URL = import.meta.env.VITE_GEMINI_PROXY_EDGE_FUNCTION_URL;

// --- IMPORTANT: Adjust the error handling and initialization ---
if (!GEMINI_PROXY_EDGE_FUNCTION_URL) {
  // If the proxy URL isn't set, then we have a critical configuration error.
  // There should be no fallback to a direct API key if the key isn't here.
  throw new Error('GEMINI_PROXY_EDGE_FUNCTION_URL is not defined. Secure LLM access is not configured.');
}

// Initialize GoogleGenerativeAI with an empty string or null for apiKey,
// as it will only be used if GEMINI_PROXY_EDGE_FUNCTION_URL is NOT present.
// In your secure setup, it will always be present, so this 'genAI' instance
// will effectively become a fallback or unused path.
const genAI = new GoogleGenerativeAI('', { // Pass an empty string or null, as the key won't be used here
  apiVersion: 'v1beta' // Add explicit API version
});

// Create a reusable model instance with correct model name
// This 'model' instance will only be used if the GEMINI_PROXY_EDGE_FUNCTION_URL is NOT available,
// which, in your secure setup, should ideally never happen.
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Rest of the file remains the same...

export interface GeminiResponse {
  text: string;
  error?: string;
  safetyRatings?: any[];
}

async function processResponse(result: GenerateContentResult): Promise<GeminiResponse> {
  const response = await result.response;
  return {
    text: response.text(),
    safetyRatings: response.promptFeedback?.safetyRatings
  };
}

// Add at top of file
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

// Add at top of file
const calendarCache = new Map<string, {
  response: GeminiResponse;
  timestamp: number;
}>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function generateContent(prompt: string): Promise<GeminiResponse> {
  try {
    // We are now always using the Edge Function if GEMINI_PROXY_EDGE_FUNCTION_URL is available
    // and it should always be available in your secure setup.
    // The previous 'if (GEMINI_PROXY_EDGE_FUNCTION_URL)' check
    // combined with the initial error ensures this path is taken.

    // Use the Edge Function instead of direct API call
    const response = await fetch(GEMINI_PROXY_EDGE_FUNCTION_URL, { // This now *must* be defined
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: 'gemini-2.0-flash', // Pass the model name to the Edge Function if it's dynamic
        // Optional: Add a cache key for the Edge Function to use
        cacheKey: prompt.substring(0, 50) // Use first 50 chars as cache key
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from Gemini proxy:', errorData);
      return {
        text: '',
        error: errorData.error || `Failed to generate content: ${response.status}`
      };
    }

    // Parse the response from the Edge Function
    const data = await response.json();
    return {
      text: data.text || '',
      safetyRatings: data.safetyRatings
    };
  } catch (error) {
    console.error('Error generating content:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Failed to generate content'
    };
  }
}

export async function improveComment(comment: string): Promise<GeminiResponse> {
  const prompt = `Improve this comment to make it more engaging while maintaining its core message:
    "${comment}"
    
    Make it:
    1. More conversational and natural.
    2. Add a hook that never starts with a question.
    3. Keep the same key points and intent
    4. Ensure it stays under 300 characters
    5. Make it more likely to encourage interaction

Ensure that:

* Every sentence starts on a separate line

* There is a space between each sentence for readability

* There are no hashtags   
  `;

  return generateContent(prompt);
}


export async function turnCommentToPost(comment: string): Promise<GeminiResponse> {
  const prompt = `
use your deep experience and knowledge in copywriting and content creation to turn this message into a post that stands by itself while maintaining its core message: 
    "${comment}"
    
    Make it:
    1. Conversational and natural but keep it to 30 words.
    2. Add a hook that never starts with a question.
    3. Add storytelling that shares a personal experience in first person.
    4. Use clear and concise language. Use simple language 
    5. Avoid using unnecessary jargon.
    6. Make it more likely to inspire and encourage interaction 
    7. Share simple actionable advice in a natural conversational style    
  `;

  return generateContent(prompt);
}

export async function generatePostIdeas(topic: string, count: number = 3): Promise<GeminiResponse> {
  const prompt = `
    Generate ${count} engaging post ideas about ${topic} for Bluesky.
    Each post should:
    1. Be conversational and engaging
    2. Include relevant emojis
    3. Be under 300 characters
    4. Encourage discussion and interaction
    5. Be unique and thought-provoking
    6. Feel natural and authentic
    7. Be relevant to the Bluesky community

    Format each post idea on a new line starting with a bullet point.
  `;

  return generateContent(prompt);
}

export async function enhanceEngagement(text: string): Promise<GeminiResponse> {
  const prompt = `
    Enhance this text to maximize engagement while keeping the core message:
    "${text}"

    Guidelines:
    1. Keep it authentic and genuine
    2. Add a hook or interesting opener
    3. Include a clear call-to-action or question
    4. Use appropriate emojis naturally
    5. Stay under 300 characters
    6. Maintain the original voice and tone
    7. Make it shareable and relatable
  `;

  return generateContent(prompt);
}

export async function generateThreadIdeas(topic: string): Promise<GeminiResponse> {
  const prompt = `
    Generate a Bluesky thread outline about ${topic}.
    
    Guidelines:
    1. Create 3-5 connected posts that flow naturally
    2. Each post should be under 300 characters
    3. Start with a strong hook
    4. Build the narrative progressively
    5. End with engagement prompt
    6. Include relevant emojis
    7. Make it informative yet conversational
    
    Format as:
    • Post 1: [hook/intro]
    • Post 2: [development]
    • Post 3: [insights]
    • Post 4: [conclusion/call-to-action]
  `;

  return generateContent(prompt);
}

{/*
export async function generateCalendar(calendar_info: string): Promise<GeminiResponse> {
  const prompt = `
   Act as an experienced social media content marketer. You have 10 years experience writing highly-engaging content for your clients on platforms like twitter. You have research capabilities and fully understand how to create a social media calendar that groups social media topics into categories. Using the information ${calendar_info}, reverse engineer the fears, wants and major pain points of the ideal target audience to create a 30 day Content Calendarin a table with the columns  Day Of Week, Day, Theme, Topic, Call To Action, Notes. 

Format as an output to be sent into a table.
  `;

  return generateContent(prompt);
}
*/}

export async function generateFirstPostIdeas(content_audience: string):Promise<GeminiResponse> {

//Check cache
const cacheKey = JSON.stringify(content_audience);
const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

  // More structured prompt to prevent recursion
  const prompt = `
    As an experienced social media content marketer with 10 years experience, create 2 content pieces based on this information: ${content_audience}

    Requirements:
    1. Create exactly 2 pieces of content.
    2. Focus on the target audience's pain points
    3. Ensure each content has a unique theme
    4. Keep topics concise and actionable
    5. Include clear calls to action
    6. Limit response to one complete table
    7. Do not include any follow-up questions or suggestions
    8. Notes provide context or tips
    9. Content is engaging and platform appropriate
    10. Remove hashtags and generic content 

    Generate 2 pieces of content in valid JSON format. 
Provide the output as a JSON array with exactly 2 objects containing:
    {
      "theme": (theme for the day),
      "topic": (specific topic),
      "content": (actual post content)
    }

    Example of the first object in the JSON array:
    {
      "theme": "...",
      "topic": "...",
      "content": "..."
    }    

Ensure that:
* All string values (theme, topic, content) are enclosed in double quotes.

* Any special characters within string values (e.g., forward slashes / , backslashes and [ and ] should be properly escaped to prevent JSON parsing errors.

* Specifically, square brackets [ and ] should be escaped as \[ and \].`;

 try {
    const response = await generateContent(prompt);
    
    // Cache the result
    calendarCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    return response;
  } catch (error) {
    console.error('Calendar generation error:', error);
    return {
      text: '',
      error: 'Failed to generate calendar'
    };
  }
}


export async function generateCalendar(calendar_info: string, startDayofWeek: string): Promise<GeminiResponse> {
  // Check cache
  const cacheKey = JSON.stringify(calendar_info, startDayofWeek);
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

const getWeekday = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

  console.log('startDayofWeek :', {startDayofWeek});
  
  // Rate limiting
  await rateLimiter.checkAndWait();

  // More structured prompt to prevent recursion
  const prompt = `
    As an experienced social media content marketer with 10 years experience, create a 30-day content calendar  based on this information: ${calendar_info}

This content calendar MUST start with the day of the week as ${startDayofWeek}.    

    Requirements:
    1. Create exactly 30 days of content, starting with the first day's day_of_week being "${startDayofWeek}".
    2. Focus on the target audience's pain points
    3. Ensure each day has a unique theme
    4. Keep topics concise and actionable
    5. Include clear calls to action
    6. Limit response to one complete table
    7. Do not include any follow-up questions or suggestions
    8. Notes provide context or tips
    9. Content is engaging and platform appropriate
    10. Remove hashtags and generic content 

Generate a 30-day content calendar in valid JSON format. 
The first day in the calendar MUST have "day_of_week": "${startDayofWeek}".
Provide the output as a JSON array with exactly 30 objects each containing:
    {
      "day":(number 1-30),
      "day_of_week": (full day name e.g. "Monday"),
      "theme": (theme for the day),
      "topic": (specific topic),
      "content": (actual post content),
      "call_to_action": (specific CTA),
      "notes": (additional notes or tips)
      
    }

Example of the first object in the JSON array:
    {
      "day": 1,
      "day_of_week": "${startDayofWeek}",
      "theme": "...",
      "topic": "...",
      "content": "...",
      "call_to_action": "...",
      "notes": "..."
    }    

Ensure that:

* All string values (day_of_week, theme, topic, content, call_to_action, notes) are enclosed in double quotes.

* Any special characters within string values (e.g., forward slashes / , backslashes and [ and ] should be properly escaped to prevent JSON parsing errors.

* Specifically, square brackets [ and ] should be escaped as \[ and \].
  `;

  try {
    const response = await generateContent(prompt);
    
    // Cache the result
    calendarCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    return response;
  } catch (error) {
    console.error('Calendar generation error:', error);
    return {
      text: '',
      error: 'Failed to generate calendar'
    };
  }
}
// Prompt to Generate List Focused Posts

export async function generateListPost(theme: string, topic: string, target_audience: string, content: string, call_to_action: string): Promise<GeminiResponse> {
  // Check cache
 const cacheKey = JSON.stringify({ theme, topic, target_audience, content, call_to_action }); // Include all variables
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

  //console.log('theme : ', theme);
  //console.log('topic : ', topic);
  //console.log('content : ', content);
  //console.log('audience : ', target_audience);
  // More structured prompt to prevent recursion
  const prompt = `
Act as an experienced social media content creator who specializes in creating practical, actionable, and repeatable content strategies about ${theme}.

Analyze deeply the information in the ${content}, the ${theme} and ${topic} parameters to identify the most pressing and fears, wants and aspirations for ${target_audience} regarding ${topic} and ${theme}. Use your experience to focus on either the fears, frustrations, aspirations or wants for this post.

Create a post that resonates with ${target_audience} about ${topic} based on ${content}.

Use the ${content} as a guide, starting with a hook followed by a personal story.

Use a copywriting framework similar to the [framework] below:

[framework]:
start with a hook that is a **declarative statement**, directly describing a personal feeling or the action causing the pain point related to the identified key pain point within the ${topic} and ${target_audience}, and uses personal pronouns and conversational language to convey deep emotional resonance appropriate to the context. **The hook must follow the structure of "Subject + Verb + Object" or "Subject + Verb + Adjective" and must not contain any interrogative words or phrasing.**

keep the hook directly related to the identified key pain point and actionable, emphasizing a repeatable process or transformation.

then, transform the ${content} into a deeply relatable story to the audience ${target_audience}.

conclude with a simple, conversational question that encourages engagement, but does not demand work from the user.

follow the AIDA copywriting framework, emphasizing action and implementation.

Follow the [Rules] below:

[Rules]:
- Keep to 300 Characters in total
- Use a first person singular grammar.
- Keep to impactful and meaningful sentences, focusing on actionable advice.
- Place each sentence in the post on a new line.
- Start with a Hook that is a **declarative statement** directly describing a feeling or action related to the identified key pain point, using personal pronouns and conversational language. **Do not use any interrogative words or phrasing in the hook.**
- Provide simple, conversational language.
- Ban Generic Content
- Ban hashtags
- Ban bullet points.
- Keep it natural
  `;

  try {
    const response = await generateContent(prompt);
    
    // Cache the result
    calendarCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    return response;
  } catch (error) {
    console.error('Calendar generation error:', error);
    return {
      text: '',
      error: 'Failed to generate calendar'
    };
  }
}

export async function generateFirstPost(target_audience: string, content: string, char_length: string): Promise<GeminiResponse> {
  // Check cache
 const cacheKey = JSON.stringify({ target_audience, content }); // Include all variables
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

  const prompt = `
Act as an experienced social media content creator who specializes in creating practical, actionable, and repeatable content that resonate with ${target_audience}.

Analyze deeply the information in the ${content} to identify the most pressing fears, wants and aspirations for ${target_audience}. Use your experience to focus on either the fears, frustrations, aspirations or wants for this post.

Starting with a hook, improve the post so that it resonates with ${target_audience} while keeping to the key message in ${content}.

Use a copywriting framework similar to the [framework] below:

[framework]:
start with a hook that is a **declarative statement**, directly describing a personal feeling or the action causing the pain point related to the identified key pain point within the ${target_audience}, and use personal pronouns and conversational language to convey deep emotional resonance appropriate to the context. **The hook must follow the structure of "Subject + Verb + Object" or "Subject + Verb + Adjective" and must not contain any interrogative words or phrasing.**

keep the hook directly related to the identified key pain point and actionable, emphasizing a repeatable process or transformation.

then, transform the ${content} into a deeply relatable story to the audience ${target_audience}.

conclude with a simple, conversational question that encourages engagement, but does not demand work from the user.

follow the AIDA copywriting framework, emphasizing action and implementation.

Follow the [Rules] below:

[Rules]:
- Keep to ${char_length} Characters in total
- Use a first person singular grammar.
- Keep to impactful and meaningful sentences, focusing on actionable advice.
- Place each sentence in the post on a new line.
- Add a space after each line. 
- Start with a Hook that is a **declarative statement** directly describing a feeling or action related to the identified key pain point, using personal pronouns and conversational language. **Do not use any interrogative words or phrasing in the hook.**
- Provide simple, conversational language.
- Ban Generic Content
- Ban hashtags
- Ban bullet points.
- Keep it natural
  `;

  try {
    const response = await generateContent(prompt);
    
    // Cache the result
    calendarCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    return response;
  } catch (error) {
    console.error('Calendar generation error:', error);
    return {
      text: '',
      error: 'Failed to generate calendar'
    };
  }
}