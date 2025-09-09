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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

const toneOptions = [
  'optimistic',
  'thought-provoking',
  'action-oriented',
  'empathetic',
  'witty',
  'authoritative',
  'inspirational',
  'bold',
  'concise'
  // Add more as desired
];

const getRandomTone = (excludeTones: string[] = []) => {
  const availableTones = toneOptions.filter(tone => !excludeTones.includes(tone));
  if (availableTones.length === 0) {
    // Fallback: if all tones are excluded (e.g., if you later implement tracking
    // and all tones are in `excludeTones`), reset or pick from the full list.
    // For now, this branch won't be hit with `getRandomTone()`
    return toneOptions[Math.floor(Math.random() * toneOptions.length)];
  }
  const randomIndex = Math.floor(Math.random() * availableTones.length);
  return availableTones[randomIndex];
};


const hooks = `
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

// --- Define hook archetypes and helper function here (as shown above) ---
const hookArchetypes = [
    {
        name: "Problem-Solution Hook",
        description: "Start by vividly describing a common pain point or challenge faced by the target audience related to the topic, then hint at a desirable solution or outcome that the post will explore. Make it relatable."
    },
    {
        name: "Intriguing Question Hook",
        description: "Pose a thought-provoking, open-ended question that directly relates to the topic or a core aspect of the content, compelling the reader to seek the answer. Ensure the question creates curiosity."
    },
    {
        name: "Counter-Intuitive/Myth-Busting Hook",
        description: "Begin with a statement that challenges a commonly held belief, presents a surprising fact, or reveals a hidden truth about the topic that will immediately grab attention and make the reader question their assumptions."
    },
    {
        name: "Benefit-Driven Hook",
        description: "Immediately state a clear, tangible benefit, advantage, or transformation the target audience can expect to gain by understanding or applying the information in the post. Focus on a strong positive outcome."
    },
    {
        name: "Curiosity Gap Hook",
        description: "Create a sense of suspense or an unanswered question that makes the reader instinctively want to know 'what happened next?' or 'how did they do it?'. Open a loop that the post will close."
    },
      // Newly Suggested Archetypes
    {
        name: "Personal Journey/Vulnerability Hook",
        description: "Start by sharing a relatable personal experience, a past mistake, a significant challenge overcome, or a key lesson learned related to the topic. Emphasize authenticity, vulnerability, or a surprising personal insight that resonates with the target audience's own journey."
    },
    {
        name: "Social Proof/Credibility Hook",
        description: "Begin with a compelling statistic, a powerful client testimonial, a success story, or evidence that validates a claim related to the topic. Focus on demonstrating tangible results or widespread acceptance from reliable sources (clients, data, experts) to build immediate trust and interest for the target audience."
    },
    {
        name: "Urgent Warning/Mistake Prevention Hook",
        description: "Start by issuing a direct warning or highlighting a common, critical mistake the target audience might be making or about to make related to the topic. Emphasize potential pitfalls, misconceptions, or actions to avoid, creating a sense of urgency to learn the correct path."
    },
    {
        name: "Trend/Future-Gazing Hook",
        description: "Open by identifying a current or emerging trend, a significant shift, or a future prediction related to the topic. Frame it in a way that positions the reader as either someone who needs to be aware of this change or someone who can leverage it for future advantage."
    },
    {
        name: "Direct Offer/Call-to-Action Hook",
        description: "Immediately present a clear, compelling offer, a free resource, a limited-time opportunity, or a direct call for the target audience to take a specific action. Focus on a clear value proposition and a sense of urgency or exclusivity where appropriate."
    }
  ,
    {
        name: "Comparison/Contrast Hook",
        description: "Start by drawing a direct comparison or stark contrast between two related ideas, approaches, or states (e.g., 'old vs new,' 'this vs that,' 'common vs effective'). Highlight the difference or the implied superiority of one over the other to pique the target audience's interest and signify a valuable distinction."
    },
    {
        name: "Practical Resource/Shortcut Hook",
        description: "Open by offering a direct, actionable resource, a proven checklist, a template, a specific number of methods, or a 'shortcut' that promises to help the target audience achieve a desired outcome efficiently. Emphasize ease of use, practicality, and immediate applicability."
    },
    {
        name: "Authority Challenge/Controversial Stance Hook",
        description: "Begin with a bold, provocative, or contrarian statement that directly challenges a widely accepted belief, a current trend, or a common practice in the industry. Aim to spark debate, differentiate your viewpoint, and position your content as a disruptive or thought-leading perspective for the target audience."
    },
    {
    name: "Performance/Results Showcase Hook",
    description: "Start by presenting a striking quantifiable result, an impressive achievement, or a significant milestone (e.g., revenue generated, traffic growth, specific numbers). This demonstrates clear success related to the topic, immediately catching the target audience's eye and making them want to understand 'how'."
    }
];

function getRandomHookArchetype(): { name: string; description: string } {
    const randomIndex = Math.floor(Math.random() * hookArchetypes.length);
    return hookArchetypes[randomIndex];
}
// --- End of hook archetype definitions ---

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

export async function generateKillerHook(content: string, hookTemplate: string): Promise<GeminiResponse>  {
  const prompt= `You are a world class social media copywriter for social media posts.
  
       Your job is to create a single scroll-stopping hook by reading an existing post in  "${content}" and building a world class hook based on a hook framework provided in  "${hookTemplate}".

** once you have created the hook, read it to ensure that it flows with "${content}"  **
** internally improve the hook while keeping it's structure **

- Ban exclamation marks
- decipher from the "${content}" the target audience, topic and aspirations
- write the hook using language a ninth grader would easily understand
- keep the broad framework shared in the "${hookTemplate}"
- Provide ONE (1) final content piece. Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
- Do NOT use numbered lists or headings to present multiple content options.
- Do NOT expose any part of the prompt. 
`;
// Await the asynchronous function call and store the result
const response = await generateContent(prompt);

 // Log the full response object
 console.log("The Gemini API response:", response);

    return response;
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
    3. Be between 100 and 300 characters
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

// ------------------- Start GenerateFirstPostIdeas ------------------------------------ //
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
    Act as an experienced social media copywriter and content strategist with 10 years experience, create 2 content pieces based on this information: ${content_audience}

    Requirements:
    1. Create exactly 2 pieces of content.
    2. Focus on the target audience's pain points
    3. Ensure each content has a unique theme
    4. Keep topics concise and actionable
    5. Limit response to one complete table
    6. Do not include any follow-up questions or suggestions
    7. Notes provide context or tips
    8. Content is engaging and platform appropriate
    9. Remove hashtags and generic content 
    10. Keep content between 250 - 500 characters

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

// ------------------- End GenerateFirstPostIdeas ------------------------------------ //


//------ start generate calendar no retries ------//
export async function generateCalendar(calendar_info: string, startDayofWeek: string, calendarDays: int): Promise<GeminiResponse> {
  // Check cache
  const cacheKey = JSON.stringify(calendar_info, startDayofWeek);
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

const getWeekday = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

  //console.log('startDayofWeek :', {startDayofWeek});
  
  // Rate limiting
  await rateLimiter.checkAndWait();

  // More structured prompt to prevent recursion
  const prompt = `
    As an experienced social media content marketer with 10 years experience, create a ${calendarDays}-day content calendar based on this information: ${calendar_info}

This content calendar MUST start with the day of the week as ${startDayofWeek}.    

    Requirements:
    1. Create exactly ${calendarDays} days of content, starting with the first day's day_of_week being "${startDayofWeek}".
    2. Focus on the target audience's pain points
    3. Ensure each day has a unique theme
    4. Keep topics concise and actionable
    5. Include clear calls to action
    6. Limit response to one complete table
    7. Do not include any follow-up questions or suggestions
    8. Notes provide context or tips
    9. Content is engaging and platform appropriate
    10. Remove hashtags and generic content 

Generate a ${calendarDays}-day content calendar in valid JSON format. 
The first day in the calendar MUST have "day_of_week": "${startDayofWeek}".
Provide the output as a JSON array with exactly ${calendarDays} objects each containing:
    {
      "day":(number 1-${calendarDays}),
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
//------ end generate calendar no retries ------//


//------ start generate calendar with retries (active) ------//
export async function generateCalendarWithRetry(
  calendar_info: string, 
  startDayofWeek: string, 
  calendarDays: number,
  maxRetries: number = 5,
  initialDelayMs: number = 1000
): Promise<GeminiResponse> {
  
  // Check cache
  const cacheKey = JSON.stringify({ calendar_info, startDayofWeek, calendarDays });
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    //console.log('Returning calendar from cache.');
    return cached.response;
  }

const getWeekday = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

  //console.log('startDayofWeek :', {startDayofWeek});
  
  // Rate limiting
  //await rateLimiter.checkAndWait();

  // More structured prompt to prevent recursion
  const prompt = `
    Act as a world class social media copywriter and content strategist with 10 years experience. 
    
    Your job is to write high-performing content for ${calendar_info}
    
    Create a ${calendarDays}-day content calendar based on this information: ${calendar_info}

This content calendar MUST start with the day of the week as ${startDayofWeek}.    

    Requirements:
    1. Create exactly ${calendarDays} days of content, starting with the first day's day_of_week being "${startDayofWeek}".
    2. Focus on the target audience's pain points
    3. Ensure each day has a unique theme
    4. Keep topics concise and actionable
    5. Include clear calls to action
    6. Limit response to one complete table
    7. Do not include any follow-up questions or suggestions
    8. Notes provide context or tips
    9. Content is engaging and platform appropriate
    10. Remove hashtags and generic content 
    11. Keep content to 400 characters

Generate a ${calendarDays}-day content calendar in valid JSON format. 
The first day in the calendar MUST have "day_of_week": "${startDayofWeek}".
Provide the output as a JSON array with exactly ${calendarDays} objects each containing:
    {
      "day":(number 1-${calendarDays}),
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

  let currentRetry = 0;
  let delayTime = initialDelayMs;

  while (currentRetry < maxRetries) {
    try {
      await rateLimiter.checkAndWait();

      //const response = await model.generateContent(prompt);
      
      const response = await generateContent(prompt);
      
      calendarCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;

    } catch (error: any) {
      const isRetryableError =
        error.status === 503 ||
        error.status === 429 ||
        (error.message && (error.message.includes('503') || error.message.includes('429')));
      const isNetworkError = error.message && error.message.includes('Failed to fetch');

      if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
        currentRetry++;
        console.warn(
          `Gemini API call failed (Error: ${error.status || error.message}). ` +
          `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
        );
        await sleep(delayTime);
        delayTime *= 2;
        delayTime = delayTime * (1 + Math.random() * 0.2);
        delayTime = Math.min(delayTime, 30000);
      } else {
        console.error(`Calendar generation failed after ${currentRetry} retries:`, error);
        throw new Error(`Failed to generate calendar: ${error.message || 'Unknown error occurred.'}`);
      }
    }
  }

  throw new Error("Max retries exhausted for calendar generation (wait 5 mins and try again).");
}
//------ end generate calendar with retries ------//


// Prompt to Generate List Focused Posts

export async function generateListPost(theme: string, topic: string, target_audience: string, content: string, call_to_action: string): Promise<GeminiResponse> {
  // Check cache
 const cacheKey = JSON.stringify({ theme, topic, target_audience, content, call_to_action }); // Include all variables
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Choose a random hook 
  const chosenHookArchetype = getRandomHookArchetype();
  
  // Rate limiting
  await rateLimiter.checkAndWait();

  const selectedTone = getRandomTone(); // Ensure this function correctly returns a valid tone string
  
  // More structured prompt to prevent recursion
  const prompt = `
Act as an experienced social media content creator who specializes in creating practical, actionable, and repeatable content strategies about ${theme}.

Analyze deeply the information in the ${content}, the ${theme} and ${topic} parameters to identify the most pressing and fears, wants and aspirations for ${target_audience} regarding ${topic} and ${theme}. Use your experience to focus on either the fears, frustrations, aspirations or wants for this post.

Create a post that resonates with ${target_audience} about ${topic} based on ${content}.

Tailor the language, tone, and examples to resonate deeply with a ${target_audience} audience about ${topic} based on ${content} , and maintain an **${selectedTone}** tone throughout the post.

Use the ${content} as a guide, starting with a hook followed by a personal story.

Use a copywriting framework similar to the [framework] below:

[framework]:
start with a hook that is a **declarative statement**, directly describing a personal feeling or the action causing the pain point related to the identified key pain point within the ${topic} and ${target_audience}, and uses personal pronouns and conversational language to convey deep emotional resonance appropriate to the context. **The hook must follow the structure of "Subject + Verb + Object" or "Subject + Verb + Adjective" and must not contain any interrogative words or phrasing.**

keep the hook directly related to the identified key pain point and actionable, emphasizing a repeatable process or transformation.

then, transform the ${content} into a deeply relatable story to the audience ${target_audience}.

follow the AIDA copywriting framework, emphasizing action and implementation.

Follow the [Rules] below:

[Rules]:
- Keep to 300 Characters in total
- Use a first person singular grammar.
- Keep to impactful and meaningful sentences, focusing on actionable advice.
- Place each sentence in the post on a new line.
- Add a space after each line. 
- Start with a Hook that is a **declarative statement** directly describing a feeling or action related to the identified key pain point, using personal pronouns and conversational language. **Do not use any interrogative words or phrasing in the hook.**
- Provide simple, conversational language.
- Ban Generic Content
- Ban hashtags
- Ban bullet points.
- Ban Generic Conversational Questions at the end
- Keep it natural
  `;
//Removed conveersational question 
//conclude with a simple, conversational question that encourages engagement, but does not demand work from the user.
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


export async function generateFirstPost
  (
    
    target_audience: string, 
    content: string, 
    char_length: string
    
  
  ): Promise<GeminiResponse> {
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


// ------------- Start Generate First Post With Retry ------------------------ //


export async function generateFirstPostWithRetry(
  //hooksData: string[],
  target_audience: string,
  theme: string,
  topic: string,
  content: string, 
  char_length: string,
  maxRetries: number = 5,
  initialDelayMs: number = 1000
): Promise<GeminiResponse> {
  // Check cache
 const cacheKey = JSON.stringify({ target_audience, content }); // Include all variables
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();
  const selectedTone = getRandomTone();  

  const prompt = `Act a world-class copywriter and social media content strategist. 
  
Your job is to write high-performing content for ${content} 

Details:

- Target audience: [${target_audience}]
- Platform: [LinkedIn or X]
- Content type: [viral social media thread]
- Goal: [engagement, clicks, conversions or leads]

Instructions:

Deeply analyze the provided ${topic}, ${theme}, and ${content} to deduce the most fitting writing approach

Tailor the language, tone, and examples to resonate deeply with a ${target_audience} audience, and maintain an **${selectedTone}** tone throughout the post.

1. Start with a scroll-stopping hook, 
2. Focus on pain point related to ${target_audience}
3. Use clear, concise, natural language that a ninth grader could understand
4. Apply storytelling, persuasion, and value delivery
5. Follow proven frameworks (AIDA, PAS, Hook-Point-Action, etc.)
6. Keep to ${char_length} Characters in total
7. End with a strong CTA that is non-salesy

Write like a human. No fluff. No cringe. Make it hit.

Follow the [Rules] below:

[Rules]:

- Place each sentence in the post on a new line.
- Add a space after each line.
- **Write in a clear, straightforward manner that a ninth grader could easily understand.**
- Ban Generic Content
- Ban hashtags
- Ban bullet points.
- Provide ONE (1) final content piece. Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
- Do NOT use numbered lists or headings to present multiple content options.
  `;

  let currentRetry = 0;
  let delayTime = initialDelayMs;

  while (currentRetry < maxRetries) {
    try {
      await rateLimiter.checkAndWait();

      //const response = await model.generateContent(prompt);
      
      const response = await generateContent(prompt);
      
      calendarCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;

    } catch (error: any) {
      const isRetryableError =
        error.status === 503 ||
        error.status === 429 ||
        (error.message && (error.message.includes('503') || error.message.includes('429')));
      const isNetworkError = error.message && error.message.includes('Failed to fetch');

      if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
        currentRetry++;
        console.warn(
          `Gemini API call failed (Error: ${error.status || error.message}). ` +
          `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
        );
        await sleep(delayTime);
        delayTime *= 2;
        delayTime = delayTime * (1 + Math.random() * 0.2);
        delayTime = Math.min(delayTime, 30000);
      } else {
        console.error(`Post generation failed after ${currentRetry} retries:`, error);
        throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
      }
    }
  }

  throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}


// -------------- End Generate First Post WIth Retry ------------------------ //



// -------------- Start Generate LinkedIn Post With Hook -------------------- //

export async function generateHookPost(
    theme: string, 
    topic: string, 
    target_audience: string,
    content: string, 
    char_length: string,
    maxRetries: number = 5,
    initialDelayMs: number = 1000
): Promise<GeminiResponse> {
  // Check cache
 const cacheKey = JSON.stringify({ target_audience, content }); // Include all variables
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

const prompt = `Act as an experienced social media copywriter with many years of creating content for social media. You specialize in writing hooks and bridges to draw your audience in and make them want to read and enjoy your content. Read all the hooks in ${hooks} and use the best hook for the ${content}, build on this content idea ${content} that touches on subject ${theme} specifically about ${topic} and improve it so that it's an ${char_length} character content utilizing one of the hooks into the content. for the hook, create a bridge statement that naturally connects the hook to the content. follow these rules in [Rules]

Follow the [Rules] below:  

[Rules]: 
- Keep to ${char_length} Characters in total 
- Place each sentence in the post on a new line. 
- Provide simple, conversational language. 
- Ban Generic Content 
- Ban hashtags 
- Ban bullet points. 
- Keep it natural  
- Provide ONE (1) final content piece. Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
- Do NOT use numbered lists or headings to present multiple content options.

Ensure that:

* Every sentence starts on a separate line

* There is a space between each sentence for readability
  `;

   let currentRetry = 0;
  let delayTime = initialDelayMs;

  while (currentRetry < maxRetries) {
    try {
      await rateLimiter.checkAndWait();

      //const response = await model.generateContent(prompt);
      
      const response = await generateContent(prompt);
      
      calendarCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;

    } catch (error: any) {
      const isRetryableError =
        error.status === 503 ||
        error.status === 429 ||
        (error.message && (error.message.includes('503') || error.message.includes('429')));
      const isNetworkError = error.message && error.message.includes('Failed to fetch');

      if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
        currentRetry++;
        console.warn(
          `Gemini API call failed (Error: ${error.status || error.message}). ` +
          `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
        );
        await sleep(delayTime);
        delayTime *= 2;
        delayTime = delayTime * (1 + Math.random() * 0.2);
        delayTime = Math.min(delayTime, 30000);
      } else {
        console.error(`Post generation failed after ${currentRetry} retries:`, error);
        throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
      }
    }
  }

  throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}


// ------ Generate Hook Post 2 With Hooks from content_hooks table ------------- //
export async function generateHookPostV2(
    hooksData: string[],
    theme: string, 
    topic: string, 
    target_audience: string,
    content: string, 
    char_length: string,
    maxRetries: number = 5,
    initialDelayMs: number = 1000
): Promise<GeminiResponse> {
  // Check cache
 const cacheKey = JSON.stringify({ target_audience, content }); // Include all variables
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

// Rate limiting
await rateLimiter.checkAndWait();

const selectedTone = getRandomTone();  

const prompt = `Act as an experienced social media copywriter with many years of creating content for social media. You specialize in writing hooks to draw your audience in and make them want to read and enjoy your content.

From the provided list of hooks in ${hooksData}, **randomly select ONE (1) hook to begin the post.** Ensure that the chosen hook has not been frequently used in recent generations for this user.

**If the selected hook contains a placeholder like "[activity]", "[topic]", "[goal]", "[commonly held belief]" or similar bracketed terms, deduce the most relevant concept from the provided ${topic}, ${theme}, and ${content} and replace the placeholder accordingly.**

Now, build on the content idea ${content} that touches on subject ${theme} specifically about ${topic} and improve it so that it's an ${char_length} character content. 

**Tailor the language, tone, and examples to resonate deeply with a ${target_audience} audience, and maintain an **${selectedTone}** tone throughout the post.**

Follow the [Rules] below:

[Rules]:
- Keep to ${char_length} Characters in total
- Place each sentence in the post on a new line.
- Provide simple, conversational language.
- **Write in a clear, straightforward manner that a ninth grader could easily understand.**
- Ban Generic Content
- Ban hashtags
- Ban bullet points.
- Keep it natural
- Provide ONE (1) final content piece. Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
- Do NOT use numbered lists or headings to present multiple content options.
- Ensure that:
  * There is a space between each sentence for readability
  `;

   let currentRetry = 0;
  let delayTime = initialDelayMs;

  while (currentRetry < maxRetries) {
    try {
      await rateLimiter.checkAndWait();

      //const response = await model.generateContent(prompt);
      
      const response = await generateContent(prompt);
      
      calendarCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;

    } catch (error: any) {
      const isRetryableError =
        error.status === 503 ||
        error.status === 429 ||
        (error.message && (error.message.includes('503') || error.message.includes('429')));
      const isNetworkError = error.message && error.message.includes('Failed to fetch');

      if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
        currentRetry++;
        console.warn(
          `Gemini API call failed (Error: ${error.status || error.message}). ` +
          `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
        );
        await sleep(delayTime);
        delayTime *= 2;
        delayTime = delayTime * (1 + Math.random() * 0.2);
        delayTime = Math.min(delayTime, 30000);
      } else {
        console.error(`Post generation failed after ${currentRetry} retries:`, error);
        throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
      }
    }
  }

  throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}

//------- start generateHooksPostV3_old without HooksData -------------//

export async function generateHookPostV3_old(
    theme: string,
    topic: string,
    target_audience: string,
    content: string,
    char_length: string,
    maxRetries: number = 5,
    initialDelayMs: number = 1000
): Promise<GeminiResponse> {

  // Choose a random hook 
  const chosenHookArchetype = getRandomHookArchetype();
  
    // Cache key now depends only on inputs that define the desired output
    const cacheKey = JSON.stringify({ target_audience, content, theme, topic, char_length });
    const cached = calendarCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.response;
    }

    // Rate limiting
    await rateLimiter.checkAndWait();

    const selectedTone = getRandomTone(); // Ensure this function correctly returns a valid tone string

    // The refined prompt that guides the LLM to create its own hook
const prompt = `Act as an experienced social media copywriter with many years of creating content for social media. You specialize in crafting highly engaging hooks that immediately capture attention and make the audience eager to read the full post.

**Your primary task is to generate a single, complete social media post.** This post MUST begin with a compelling, original hook that is seamlessly integrated.

**Based on the provided content idea (${content}), subject (${theme}), and specific topic (${topic}), generate a unique and effective hook.**

**Crucially, the hook MUST be generated using the following archetype description:**

**Archetype: ${chosenHookArchetype.name}**
**Description: ${chosenHookArchetype.description.replace('target audience', target_audience).replace('topic', topic).replace('content', content)}**

**The hook should:**
- Be the very first sentence of your output.
- Be concise (ideally 1-2 sentences).
- Directly relevant to the ${topic}, ${theme}, and ${content}.
- Be designed to stop the scroll and encourage further reading.
- NOT contain bracketed placeholders like "[activity]" or "[goal]". You must deduce and integrate the relevant concepts directly.

After generating the hook, seamlessly transition into and build upon the content idea "${content}" that touches on subject "${theme}" specifically about "${topic}". Improve it so that the total output (hook + body) is an ${char_length} character content.

**Tailor the language, tone, and examples to resonate deeply with a ${target_audience} audience, and maintain an **${selectedTone}** tone throughout the post.**

Follow the [Rules] below:

[Rules]:
- Keep to ${char_length} Characters in total (including the hook).
- Place each sentence in the post on a new line.
- Provide simple, conversational language.
- **Write in a clear, straightforward manner that a ninth grader could easily understand.**
- Ban Generic Content.
- Ban hashtags.
- Ban bullet points.
- Keep it natural and engaging.
- Provide ONE (1) final content piece. Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
- Do NOT use numbered lists or headings to present multiple content options.
- Ensure that:
    * There is a space between each sentence for readability.
    * The first sentence is the generated hook.
`;

   let currentRetry = 0;
  let delayTime = initialDelayMs;

  while (currentRetry < maxRetries) {
    try {
      await rateLimiter.checkAndWait();

      //const response = await model.generateContent(prompt);
      
      const response = await generateContent(prompt);
      
      calendarCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;

    } catch (error: any) {
      const isRetryableError =
        error.status === 503 ||
        error.status === 429 ||
        (error.message && (error.message.includes('503') || error.message.includes('429')));
      const isNetworkError = error.message && error.message.includes('Failed to fetch');

      if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
        currentRetry++;
        console.warn(
          `Gemini API call failed (Error: ${error.status || error.message}). ` +
          `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
        );
        await sleep(delayTime);
        delayTime *= 2;
        delayTime = delayTime * (1 + Math.random() * 0.2);
        delayTime = Math.min(delayTime, 30000);
      } else {
        console.error(`Post generation failed after ${currentRetry} retries:`, error);
        throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
      }
    }
  }

  throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}

//------- End generateHooksPostV3_old without HooksData -------------//


// ------- Start Improve Existing Comment for LinkedIn (ImprovePostforLinkedIn) -------//

export async function rewritePostForLinkedIn(
  
  content: string,  
  char_length: string,
  maxRetries: number = 5,
  initialDelayMs: number = 1000

): Promise<GeminiResponse> {

// Choose a random hook 
const chosenHookArchetype = getRandomHookArchetype();

  // Cache key now depends only on inputs that define the desired output
  const cacheKey = JSON.stringify({ content });
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

  const selectedTone = getRandomTone(); // Ensure this function correctly returns a valid tone string
  const prompt = `You are a world-class copywriter and social media content strategist. Your job is to read short-form posts and Improve them significantly while maintaining the core message:
  
**IMPORTANT: The information in the 'Details' section below is for your internal processing and understanding only. Do NOT include any part of this 'Details' section or its contents in your final output.**

Your task is to write high-performing content for ${content} 

- Platform: [LinkedIn]
- Content type: [viral social media thread]
- Goal: [engagement, clicks, conversions or leads]

Instructions:

**Beyond surface-level analysis, deeply dissect** the content provided in ${content} deduce and extract its overarching **business objective** and the **psychological triggers**. Create not just a fitting, but the **most strategically impactful** writing approach that subtly guides the reader towards a specific Goal you've decided upon based on [Details].

**Crucially, the hook MUST be generated using the following archetype description, ensuring it immediately captures attention and sets the stage for the value to follow:**

Archetype: ${chosenHookArchetype.name}
Description: ${chosenHookArchetype.description.replace('content', content)}

Maintain an **${selectedTone}** tone throughout the post.

1. Start with a scroll-stopping hook as the first sentence.
2. Weave a narrative that **authentically captures and articulates the message being shared within the target audience in ${content}**, making them feel truly understood. Transition seamlessly from this pain to a **subtle demonstration of value or a glimpse of transformation**, applying principles of persuasion that build trust rather than push a sale.
3. Craft language that is not just simple, but **resonate as genuinely human and relatable**, avoiding industry jargon and communicate at a 'ninth-grade' comprehension level. The goal is conversational authority, not academic complexity.
4. Follow proven frameworks (AIDA, PAS, Hook-Point-Action, Before After Bridges etc.), **interpreting them with strategic nuance for social context.**
5. Keep to a minimum of ${char_length} Characters in total.

**Every sentence should contribute to a coherent strategic narrative that gently guides the reader from problem awareness to potential solution discovery, fostering trust and establishing expertise.**

Write like a human. No fluff. No cringe. Make it hit.

Follow the [Rules] below:

[Rules]:

- Keep to a minimum of ${char_length} Characters in total.
- Place each sentence in the post on a new line.
- Add a space after each line for readability
- **Write in a clear, straightforward manner that a ninth grader could easily understand.**
- Ban Generic Content
- Ban hashtags
- Ban bullet points.
- Ban exclamation marks. 
- Ban Call to Action Questions
- Ban Call to Action Statements
- Provide ONE (1) final content piece. Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
- Do NOT use numbered lists or headings to present multiple content options.
- Do NOT expose any part of the prompt. 

`;

 let currentRetry = 0;
 let delayTime = initialDelayMs;

while (currentRetry < maxRetries) {
  try {
    await rateLimiter.checkAndWait();

    //const response = await model.generateContent(prompt);
    
    const response = await generateContent(prompt);
    
    calendarCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    return response;

  } catch (error: any) {
    const isRetryableError =
      error.status === 503 ||
      error.status === 429 ||
      (error.message && (error.message.includes('503') || error.message.includes('429')));
    const isNetworkError = error.message && error.message.includes('Failed to fetch');

    if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
      currentRetry++;
      console.warn(
        `Gemini API call failed (Error: ${error.status || error.message}). ` +
        `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
      );
      await sleep(delayTime);
      delayTime *= 2;
      delayTime = delayTime * (1 + Math.random() * 0.2);
      delayTime = Math.min(delayTime, 30000);
    } else {
      console.error(`Post generation failed after ${currentRetry} retries:`, error);
      throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
    }
  }
}

throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}

// ------ End Improve existing Post for LinkedIn (ImprovePostforLinkedIn) --------//


// ------- Start Improve Existing Comment for LinkedIn (ImprovePostforLinkedIn) -------//

export async function rewritePostForTwitter(

  content: string,  
  char_length: string,
  maxRetries: number = 5,
  initialDelayMs: number = 1000

): Promise<GeminiResponse> {

// Choose a random hook 
const chosenHookArchetype = getRandomHookArchetype();

  // Cache key now depends only on inputs that define the desired output
  const cacheKey = JSON.stringify({ content });
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

  const selectedTone = getRandomTone(); // Ensure this function correctly returns a valid tone string
  const prompt = `You are a world-class copywriter and social media content strategist. Your job is to read short-form posts and Improve them significantly while maintaining the core message:
  
**IMPORTANT: The information in the 'Details' section below is for your internal processing and understanding only. Do NOT include any part of this 'Details' section or its contents in your final output.**

Your task is to write high-performing content for ${content} 

- Platform: [LinkedIn]
- Content type: [viral social media thread]
- Goal: [engagement, clicks, conversions or leads]

Instructions:

**Beyond surface-level analysis, deeply dissect** the content provided in ${content} deduce and extract its overarching **business objective** and the **psychological triggers**. Create not just a fitting, but the **most strategically impactful** writing approach that subtly guides the reader towards a specific Goal you've decided upon based on [Details].

**Crucially, the hook MUST be generated using the following archetype description, ensuring it immediately captures attention and sets the stage for the value to follow:**

Archetype: ${chosenHookArchetype.name}
Description: ${chosenHookArchetype.description.replace('content', content)}

Maintain an **${selectedTone}** tone throughout the post.

1. Start with a scroll-stopping hook as the first sentence.
2. Weave a narrative that **authentically captures and articulates the message being shared within the target audience in ${content}**, making them feel truly understood. Transition seamlessly from this pain to a **subtle demonstration of value or a glimpse of transformation**, applying principles of persuasion that build trust rather than push a sale.
3. Craft language that is not just simple, but **resonate as genuinely human and relatable**, avoiding industry jargon and communicate at a 'ninth-grade' comprehension level. The goal is conversational authority, not academic complexity.
4. Follow proven frameworks (AIDA, PAS, Hook-Point-Action, Before After Bridges etc.), **interpreting them with strategic nuance for social context.**
5. Keep to a maximum of ${char_length} Characters in total.

**Every sentence should contribute to a coherent strategic narrative that gently guides the reader from problem awareness to potential solution discovery, fostering trust and establishing expertise.**

Write like a human. No fluff. No cringe. Make it hit.

Follow the [Rules] below:

[Rules]:

- Keep to a maximum of ${char_length} Characters in total.
- Place each sentence in the post on a new line.
- Add a space after each line for readability
- **Write in a clear, straightforward manner that a ninth grader could easily understand.**
- Ban Generic Content
- Ban hashtags
- Ban bullet points.
- Ban exclamation marks. 
- Ban Call to Action Questions
- Ban Call to Action Statements
- Provide ONE (1) final content piece. Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
- Do NOT use numbered lists or headings to present multiple content options.
- Do NOT expose any part of the prompt. 

`;

 let currentRetry = 0;
 let delayTime = initialDelayMs;

while (currentRetry < maxRetries) {
  try {
    await rateLimiter.checkAndWait();

    //const response = await model.generateContent(prompt);
    
    const response = await generateContent(prompt);
    
    calendarCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    return response;

  } catch (error: any) {
    const isRetryableError =
      error.status === 503 ||
      error.status === 429 ||
      (error.message && (error.message.includes('503') || error.message.includes('429')));
    const isNetworkError = error.message && error.message.includes('Failed to fetch');

    if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
      currentRetry++;
      console.warn(
        `Gemini API call failed (Error: ${error.status || error.message}). ` +
        `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
      );
      await sleep(delayTime);
      delayTime *= 2;
      delayTime = delayTime * (1 + Math.random() * 0.2);
      delayTime = Math.min(delayTime, 30000);
    } else {
      console.error(`Post generation failed after ${currentRetry} retries:`, error);
      throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
    }
  }
}

throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}

// ------ End Improve existing Post for Twitter (ImprovePostforTwitter) --------//


//------- start generateHooksPostV3 without HooksData -------------//

export async function generateHookPostV3(
  theme: string,
  topic: string,
  target_audience: string,
  content: string,
  char_length: string,
  maxRetries: number = 5,
  initialDelayMs: number = 1000
): Promise<GeminiResponse> {

// Choose a random hook 
const chosenHookArchetype = getRandomHookArchetype();

  // Cache key now depends only on inputs that define the desired output
  const cacheKey = JSON.stringify({ target_audience, content, theme, topic, char_length });
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

  const selectedTone = getRandomTone(); // Ensure this function correctly returns a valid tone string

  // The refined prompt that guides the LLM to create its own hook
const prompt = `Act a world-class copywriter and social media content strategist. 

**IMPORTANT: The information in the 'Details' section below is for your internal processing and understanding only. Do NOT include any part of this 'Details' section or its contents in your final output.**

Your job is to write high-performing content for ${content} 

[Details]:
- Target audience: [${target_audience}]
- Platform: [LinkedIn or X]
- Content type: [viral social media thread]
- Goal: [engagement, clicks, conversions or leads]

Instructions:

**Beyond surface-level analysis, deeply dissect** the provided ${topic}, ${theme}, and ${content}, considering the overarching **business objective** and the **psychological triggers** within the ${target_audience}. Deduce not just a fitting, but the **most strategically impactful** writing approach that subtly guides the reader towards the specific Goal expressed in [Details].

**Crucially, the hook MUST be generated using the following archetype description, ensuring it immediately captures attention by tapping into a core pain point or aspiration of the ${target_audience}, and sets the stage for the value to follow:**

Archetype: ${chosenHookArchetype.name}
Description: ${chosenHookArchetype.description.replace('target audience', target_audience).replace('topic', topic).replace('content', content)}

Tailor the language, tone, and examples to resonate deeply with a ${target_audience} audience, and maintain an **${selectedTone}** tone throughout the post.

1. Start with a scroll-stopping hook as the first sentence.
2. Weave a narrative that **authentically articulates a profound pain point or challenge faced by the ${target_audience}**, making them feel truly understood. Transition seamlessly from this pain to a **subtle demonstration of value or a glimpse of transformation**, applying principles of persuasion that build trust rather than push a sale.
3. Craft language that is not just simple, but **resonate as genuinely human and relatable**, avoiding industry jargon unless it's universally understood by a ${target_audience} at a 'ninth-grade' comprehension level. The goal is conversational authority, not academic complexity.
4. Follow proven frameworks (AIDA, PAS, Hook-Point-Action, etc.), **interpreting them with strategic nuance for social context.**
5. Keep to ${char_length} Characters in total.

**Every sentence should contribute to a coherent strategic narrative that gently guides the ${target_audience} from problem awareness to potential solution discovery, fostering trust and establishing expertise.**

Write like a human. No fluff. No cringe. Make it hit.

Follow the [Rules] below:

[Rules]:

- Keep to ${char_length} Characters in total.
- Place each sentence in the post on a new line.
- Add a space after each line for readability
- **Write in a clear, straightforward manner that a ninth grader could easily understand.**
- Ban Generic Content
- Ban hashtags
- Ban bullet points.
- Ban exclamation marks. 
- Ban Call to Action Questions
- Ban Call to Action Statements
- Provide ONE (1) final content piece. Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
- Do NOT use numbered lists or headings to present multiple content options.
- Do NOT expose any part of the prompt. 

`;

 let currentRetry = 0;
let delayTime = initialDelayMs;

while (currentRetry < maxRetries) {
  try {
    await rateLimiter.checkAndWait();

    //const response = await model.generateContent(prompt);
    
    const response = await generateContent(prompt);
    
    calendarCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    return response;

  } catch (error: any) {
    const isRetryableError =
      error.status === 503 ||
      error.status === 429 ||
      (error.message && (error.message.includes('503') || error.message.includes('429')));
    const isNetworkError = error.message && error.message.includes('Failed to fetch');

    if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
      currentRetry++;
      console.warn(
        `Gemini API call failed (Error: ${error.status || error.message}). ` +
        `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
      );
      await sleep(delayTime);
      delayTime *= 2;
      delayTime = delayTime * (1 + Math.random() * 0.2);
      delayTime = Math.min(delayTime, 30000);
    } else {
      console.error(`Post generation failed after ${currentRetry} retries:`, error);
      throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
    }
  }
}

throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}

//------- End generateHooksPostV3 without HooksData -------------//


//------- start generateLinkedInHooksPostV3 without HooksData -------------//

export async function generateLinkedInHookPostV3(
  theme: string,
  topic: string,
  target_audience: string,
  content: string,
  char_length: string,
  maxRetries: number = 5,
  initialDelayMs: number = 1000
): Promise<GeminiResponse> {

// Choose a random hook 
const chosenHookArchetype = getRandomHookArchetype();

  // Cache key now depends only on inputs that define the desired output
  const cacheKey = JSON.stringify({ target_audience, content, theme, topic, char_length });
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

  const selectedTone = getRandomTone(); // Ensure this function correctly returns a valid tone string

  // The refined prompt that guides the LLM to create its own hook
const prompt = `Act a world-class copywriter and social media content strategist. 

**IMPORTANT: The information in the 'Details' section below is for your internal processing and understanding only. Do NOT include any part of this 'Details' section or its contents in your final output.**

Your job is to write high-performing content for ${content} 

[Details]:
- Target audience: [${target_audience}]
- Platform: [LinkedIn or X]
- Content type: [viral social media thread]
- Goal: [engagement, clicks, conversions or leads]

Instructions:

**Beyond surface-level analysis, deeply dissect** the provided ${topic}, ${theme}, and ${content}, considering the overarching **business objective** and the **psychological triggers** within the ${target_audience}. Deduce not just a fitting, but the **most strategically impactful** writing approach that subtly guides the reader towards the specific Goal expressed in [Details].

**Crucially, the hook MUST be generated using the following archetype description, ensuring it immediately captures attention by tapping into a core pain point or aspiration of the ${target_audience}, and sets the stage for the value to follow:**

Archetype: ${chosenHookArchetype.name}
Description: ${chosenHookArchetype.description.replace('target audience', target_audience).replace('topic', topic).replace('content', content)}

Tailor the language, tone, and examples to resonate deeply with a ${target_audience} audience, and maintain an **${selectedTone}** tone throughout the post.

1. Start with a scroll-stopping hook as the first sentence.
2. Weave a narrative that **authentically articulates a profound pain point or challenge faced by the ${target_audience}**, making them feel truly understood. Transition seamlessly from this pain to a **subtle demonstration of value or a glimpse of transformation**, applying principles of persuasion that build trust rather than push a sale.
3. Craft language that is not just simple, but **resonate as genuinely human and relatable**, avoiding industry jargon unless it's universally understood by a ${target_audience} at a 'ninth-grade' comprehension level. The goal is conversational authority, not academic complexity.
4. Follow proven frameworks (AIDA, PAS, Hook-Point-Action, etc.), **interpreting them with strategic nuance for social context.**
5. Keep to a minimum of ${char_length} Characters in total.

**Every sentence should contribute to a coherent strategic narrative that gently guides the ${target_audience} from problem awareness to potential solution discovery, fostering trust and establishing expertise.**

Write like a human. No fluff. No cringe. Make it hit.

Follow the [Rules] below:

[Rules]:

- Keep to a minimum of ${char_length} Characters in total.
- Place each sentence in the post on a new line.
- Add a space after each line for readability
- **Write in a clear, straightforward manner that a ninth grader could easily understand.**
- Ban Generic Content
- Ban hashtags
- Ban bullet points.
- Ban exclamation marks. 
- Ban Call to Action Questions
- Ban Call to Action Statements
- Provide ONE (1) final content piece. Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
- Do NOT use numbered lists or headings to present multiple content options.
- Do NOT expose any part of the prompt. 

`;

 let currentRetry = 0;
let delayTime = initialDelayMs;

while (currentRetry < maxRetries) {
  try {
    await rateLimiter.checkAndWait();

    //const response = await model.generateContent(prompt);
    
    const response = await generateContent(prompt);
    
    calendarCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });

    return response;

  } catch (error: any) {
    const isRetryableError =
      error.status === 503 ||
      error.status === 429 ||
      (error.message && (error.message.includes('503') || error.message.includes('429')));
    const isNetworkError = error.message && error.message.includes('Failed to fetch');

    if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
      currentRetry++;
      console.warn(
        `Gemini API call failed (Error: ${error.status || error.message}). ` +
        `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
      );
      await sleep(delayTime);
      delayTime *= 2;
      delayTime = delayTime * (1 + Math.random() * 0.2);
      delayTime = Math.min(delayTime, 30000);
    } else {
      console.error(`Post generation failed after ${currentRetry} retries:`, error);
      throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
    }
  }
}

throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}

//------- End generateLinkedInHooksPostV3 without HooksData -------------//


//------- start generate name and description for campaign -------- //

export async function generateCampaignName(
    target_audience: string,
    problem: string,
    campaign_theme: string,
    char_length: string,
    maxRetries: number = 5,
    initialDelayMs: number = 1000
): Promise<GeminiResponse> {
  // Check cache
 const cacheKey = JSON.stringify({ target_audience, problem }); // Include all variables
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

const prompt = `Act as a world class copywriter and social media content strategist, you have deep knowledge of creating marketing campaigns and you have many years experience naming the campaigns and describing them in very simple and easy to understand language. Using the customer type ${target_audience} and the problem that my service or product solution solves in ${problem} to construct a title for my content campaign that will initially focus on ${campaign_theme} through content that appeal to my ${target_audience}. Add a 15 word description for the first campaign based on the rules. 

Generate a title and description in valid JSON format. 

Follow the rules in [Rules]

[Rules]: 
1. Use the writing formula to write the description in the style "Content ideas to achieve result" 
2. Include an Action Verb in the Campaign title 
3. **Ensure the Campaign title has between 4 and 6 words** 
4. **Generate a new Campaign title each time using similar words**
5. Provide the output as a JSON array with exactly 2 objects each containing:
      { 
        title: "...." 
        description: "...." 
      } 

Ensure that:

* All string values (title, description) are enclosed in double quotes.

* Any special characters within string values (e.g., forward slashes / , backslashes and [ and ] should be properly escaped to prevent JSON parsing errors.

* Specifically, square brackets [ and ] should be escaped as \[ and \].      
  `;

   let currentRetry = 0;
   let delayTime = initialDelayMs;

  while (currentRetry < maxRetries) {
    try {
      await rateLimiter.checkAndWait();

      //const response = await model.generateContent(prompt);
      
      const response = await generateContent(prompt);
      
      calendarCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;

    } catch (error: any) {
      const isRetryableError =
        error.status === 503 ||
        error.status === 429 ||
        (error.message && (error.message.includes('503') || error.message.includes('429')));
      const isNetworkError = error.message && error.message.includes('Failed to fetch');

      if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
        currentRetry++;
        console.warn(
          `Gemini API call failed (Error: ${error.status || error.message}). ` +
          `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
        );
        await sleep(delayTime);
        delayTime *= 2;
        delayTime = delayTime * (1 + Math.random() * 0.2);
        delayTime = Math.min(delayTime, 30000);
      } else {
        console.error(`Post generation failed after ${currentRetry} retries:`, error);
        throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
      }
    }
  }

  throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}
//------- end generate name and description for campaign -------- //

// ------- Start generate enhance target audience ------------- //
export async function generateTargetAudience(
    target_audience: string,
    char_length: string = "500",
    maxRetries: number = 5,
    initialDelayMs: number = 1000
): Promise<GeminiResponse> {
  // Check cache
 const cacheKey = JSON.stringify({ target_audience }); // Include all variables
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }

  // Rate limiting
  await rateLimiter.checkAndWait();

const prompt = `
Act as an experienced Researcher with a deep knowledge of identifying pain points for ${target_audience}. You want to append to the existing challenges faced by ${target_audience} exactly the style already used. Deduce from their current struggle based on your insights and knowlegde determine 2 other highly critical problems they struggle with as a result of the listed struggle. Follow the rules below

[Rules]: 

- Keep to ${char_length} Characters in total 
- Use simple language an 8th grader would understand
- Append your answer to existing ${target_audience}
- Ban Generic Content 
- Provide ONE (1) final content piece to include ${target_audience}
- Do NOT offer variations or alternative options.
- Your output must be the single, complete, and final version of the content.
- Directly output the generated content, without any introductory or concluding remarks, explanations, or alternative suggestions.
 `;

   let currentRetry = 0;
   let delayTime = initialDelayMs;

  while (currentRetry < maxRetries) {
    try {
      await rateLimiter.checkAndWait();

      //const response = await model.generateContent(prompt);
      
      const response = await generateContent(prompt);
      
      calendarCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;

    } catch (error: any) {
      const isRetryableError =
        error.status === 503 ||
        error.status === 429 ||
        (error.message && (error.message.includes('503') || error.message.includes('429')));
      const isNetworkError = error.message && error.message.includes('Failed to fetch');

      if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
        currentRetry++;
        console.warn(
          `Gemini API call failed (Error: ${error.status || error.message}). ` +
          `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
        );
        await sleep(delayTime);
        delayTime *= 2;
        delayTime = delayTime * (1 + Math.random() * 0.2);
        delayTime = Math.min(delayTime, 30000);
      } else {
        console.error(`Post generation failed after ${currentRetry} retries:`, error);
        throw new Error(`Failed to generate first post: ${error.message || 'Unknown error occurred.'}`);
      }
    }
  }

  throw new Error("Max retries exhausted for first post generation (wait 5 mins and try again).");
}

// -------- End enhance target audience ------------- //

// ------- Start Generate Calendar With Retry With Hooks ------------ //
export async function generateCalendarWithHooksRetry(
  hooksData: string[],
  calendar_info: string, 
  startDayofWeek: string, 
  calendarDays: number,
  maxRetries: number = 5,
  initialDelayMs: number = 1000
): Promise<GeminiResponse> {
  
  // Check cache
  const cacheKey = JSON.stringify({ calendar_info, startDayofWeek, calendarDays });
  const cached = calendarCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    //console.log('Returning calendar from cache.');
    return cached.response;
  }

const getWeekday = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

  //console.log('startDayofWeek :', {startDayofWeek});
  
  // Rate limiting
  //await rateLimiter.checkAndWait();

  // More structured prompt to prevent recursion
  const prompt = `
   Act as an experienced social media content marketer with 10 years experience, create a ${calendarDays}-day content calendar based on this information: ${calendar_info}

This content calendar MUST start with the day of the week as ${startDayofWeek}.    

    Requirements:
    1. Create exactly ${calendarDays} days of content, starting with the first day's day_of_week being "${startDayofWeek}".
    2. Focus on the target audience's pain points
    3. Ensure each day has a unique theme
    4. Keep topics concise and actionable
    5. Include clear calls to action
    6. Limit response to one complete table
    7. Do not include any follow-up questions or suggestions
    8. Notes provide context or tips
    9. Content is engaging and platform appropriate
    10. Remove hashtags and generic content 
    11. Place each sentence in the post on a new line.
    12. Add a space after each line for readability

Generate a ${calendarDays}-day content calendar in valid JSON format. 
The first day in the calendar MUST have "day_of_week": "${startDayofWeek}".
Provide the output as a JSON array with exactly ${calendarDays} objects each containing:
    {
      "day":(number 1-${calendarDays}),
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

  let currentRetry = 0;
  let delayTime = initialDelayMs;

  while (currentRetry < maxRetries) {
    try {
      await rateLimiter.checkAndWait();

      //const response = await model.generateContent(prompt);
      
      const response = await generateContent(prompt);
      
      calendarCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      return response;

    } catch (error: any) {
      const isRetryableError =
        error.status === 503 ||
        error.status === 429 ||
        (error.message && (error.message.includes('503') || error.message.includes('429')));
      const isNetworkError = error.message && error.message.includes('Failed to fetch');

      if ((isRetryableError || isNetworkError) && currentRetry < maxRetries - 1) {
        currentRetry++;
        console.warn(
          `Gemini API call failed (Error: ${error.status || error.message}). ` +
          `Retrying in ${delayTime / 1000}s... (Attempt ${currentRetry}/${maxRetries})`
        );
        await sleep(delayTime);
        delayTime *= 2;
        delayTime = delayTime * (1 + Math.random() * 0.2);
        delayTime = Math.min(delayTime, 30000);
      } else {
        console.error(`Calendar generation failed after ${currentRetry} retries:`, error);
        throw new Error(`Failed to generate calendar: ${error.message || 'Unknown error occurred.'}`);
      }
    }
  }

  throw new Error("Max retries exhausted for calendar generation (wait 5 mins and try again).");
}
// ------- End Generate Calendar With Retry With Hooks ------------ //