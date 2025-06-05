// supabase/functions/firecrawl-proxy/index.ts (ADAPTED FOR SCRAPE ONLY)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Use the /v1/scrape endpoint for general scraping
const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v1/scrape';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!FIRECRAWL_API_KEY) {
    console.error('FIRECRAWL_API_KEY is not set in environment variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Missing Firecrawl API key' }),
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
    const { url } = requestData;

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required in the request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // --- REVISED PAYLOAD FOR /v1/scrape ---
    const firecrawlPayload = {
      url: url, // Single URL for /scrape endpoint
      formats: ['markdown'], // Request content in markdown format
      // You can add pageOptions like onlyMainContent: true if you want to filter noise
      // pageOptions: {
      //   onlyMainContent: true
      // }
    };

    const firecrawlResponse = await fetch(
      FIRECRAWL_SCRAPE_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify(firecrawlPayload),
      }
    );

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl API error (status):', firecrawlResponse.status);
      console.error('Firecrawl API error (response text):', errorText);

      let errorDetails: any = { message: errorText };
      try {
          errorDetails = JSON.parse(errorText);
      } catch (e) {}

      return new Response(
        JSON.stringify({
          error: 'Error from Firecrawl API',
          details: errorDetails,
          statusCode: firecrawlResponse.status
        }),
        { status: firecrawlResponse.status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const firecrawlData = await firecrawlResponse.json();
    console.log("Raw Firecrawl /v1/scrape response:", firecrawlData);

    // --- Extracted markdown content from /v1/scrape response ---
    // The structure for /scrape is typically data.markdown
    const scrapedMarkdown = firecrawlData?.data?.markdown;

    if (!scrapedMarkdown) {
      console.warn('Firecrawl did not return expected markdown content from /v1/scrape:', firecrawlData);
      return new Response(
        JSON.stringify({ error: 'Firecrawl failed to scrape markdown content.', rawResponse: firecrawlData }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Return the scraped markdown content to your frontend
    return new Response(
      JSON.stringify({
        markdownContent: scrapedMarkdown // Renamed to clearly indicate it's markdown
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );

  } catch (error) {
    console.error('Error processing request in Firecrawl proxy:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
});