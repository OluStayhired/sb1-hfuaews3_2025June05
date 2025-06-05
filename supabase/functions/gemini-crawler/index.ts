// supabase/functions/gemini-crawler/index.ts (NEW DEDICATED FUNCTION)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY'); // Still uses the same API key secret

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in environment variables for gemini-crawler');
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing Gemini API key' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  try {
    const requestData = await req.json();
    const { content } = requestData; // This is the markdown content from Firecrawl

    if (!content || typeof content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Content is required and must be a string for Gemini processing.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using your specified model

    // --- DEDICATED PROMPT FOR THIS FUNCTION ---
    {/* const prompt = `Analyze the following website content. Deduce and return, as a JSON object, the primary problem this company solves and the specific audience for whom they solve this problem.
    The JSON object MUST have two keys: "Problem" (string) and "Audience" (string). Ensure the output is *only* the JSON object, with no extra text or markdown formatting outside the JSON.

    Website Content:
    ${content}
    `;
    */}

    const prompt = `Analyze the following website content.

Deduce and return a JSON object with two keys:
1. "Problem" (string): The primary problem this company solves, presented as a value proposition statement.
2. "Audience" (string): The specific audience for whom they solve this problem.

--- Instructions for "Problem" Field ---
For the "Problem" field, formulate a concise, single sentence that encapsulates the company's value proposition.
This sentence MUST follow the structure: "We make it easy for [audience] to [achieve result] without [struggle] or [objection]".

* [audience] refers to the specific target demographic identified from the website.
* [achieve result] refers to the specific positive outcome or desired goal the company helps them attain.
* [struggle] refers to a key difficulty, pain point, or complexity that the company eliminates.
* [objection] refers to a common barrier, fear, or negative past experience the audience might have that the company mitigates.

Example "Problem" format: "We make it easy for busy small business owners to manage their accounting without manual data entry or the fear of tax season errors."

--- Instructions for "Audience" Field ---
For the "Audience" (String) field, craft a concise, single sentence that describes the target demographic and their current, specific struggle or pain point related to the problem. The sentence for the "Audience" field MUST start with "My ideal target audience are..." or "My target audience are..." and then directly state the demographic and their struggle.

Example of desired "Audience" format: "My ideal target audience are early-stage startup founders who are currently struggling with how to attract their ideal customers on social media using their founder brand."

 Ensure the output is *only* the JSON object, with no extra text or markdown formatting outside the JSON.

 Website Content:
  ${content}
`;

    console.log("Sending prompt to Gemini Crawler:", prompt.substring(0, 500) + "..."); // Log first 500 chars
    console.time('Gemini_Crawler_Inference_Time');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text(); // Get the raw text response from Gemini
    console.timeEnd('Gemini_Crawler_Inference_Time');

    console.log("Raw Gemini Crawler response text:", text);

    let extractedData;
    try {
        // Attempt to parse the text response as JSON
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
            extractedData = JSON.parse(jsonMatch[1]);
        } else {
            extractedData = JSON.parse(text); // Fallback: try parsing the whole text if no markdown block
        }
    } catch (parseError) {
        console.error('Failed to parse Gemini Crawler response as JSON:', parseError, 'Raw text:', text);
        return new Response(
            JSON.stringify({ error: 'Gemini did not return valid JSON for crawler task.', rawGeminiResponse: text }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
    }

    // Validate the extracted data against your expected interface
    if (typeof extractedData !== 'object' || extractedData === null || typeof extractedData.Problem !== 'string' || typeof extractedData.Audience !== 'string') {
        console.error("Gemini Crawler extracted data does not match expected schema or types:", extractedData);
        return new Response(
            JSON.stringify({ error: 'Gemini Crawler returned data with incorrect format, missing Problem/Audience keys, or incorrect types.', extractedData: extractedData }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
    }

    return new Response(
      JSON.stringify(extractedData), // Return the directly extracted JSON
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );

  } catch (error) {
    console.error('Error processing request in Gemini Crawler proxy:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
});