// supabase/functions/webcrawler-bot/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabase } from './lib/supabaseClient.ts';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

// CORS headers for cross-origin requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Function to extract text content from HTML
function extractTextFromHTML(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    // Remove script and style elements
    const scripts = doc.querySelectorAll('script, style, noscript, iframe');
    scripts.forEach(script => script.remove());

    // Extract text from specific elements that typically contain main content
    const mainContentSelectors = [
      'main',
      'article',
      '#content',
      '.content',
      '.main-content',
      '.post-content',
      '.article-content',
      '.entry-content',
    ];

    let mainContent = '';
    for (const selector of mainContentSelectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent) {
        mainContent += element.textContent.trim() + '\n\n';
      }
    }

    // If no main content found, fall back to body text
    if (!mainContent) {
      const body = doc.querySelector('body');
      if (body) {
        mainContent = body.textContent || '';
      }
    }

    // Clean up the text
    return mainContent
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n')  // Replace multiple newlines with double newlines
      .trim();
  } catch (error) {
    console.error('Error extracting text from HTML:', error);
    return '';
  }
}

// Function to extract meta data from HTML
function extractMetaData(html: string): Record<string, string> {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    const metaData: Record<string, string> = {};
    
    // Get page title
    const title = doc.querySelector('title');
    if (title) {
      metaData.title = title.textContent || '';
    }
    
    // Get meta description
    const metaDescription = doc.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaData.description = metaDescription.getAttribute('content') || '';
    }
    
    // Get Open Graph meta tags
    const ogTags = doc.querySelectorAll('meta[property^="og:"]');
    ogTags.forEach(tag => {
      const property = tag.getAttribute('property');
      const content = tag.getAttribute('content');
      if (property && content) {
        metaData[property] = content;
      }
    });
    
    return metaData;
  } catch (error) {
    console.error('Error extracting meta data from HTML:', error);
    return {};
  }
}

// Main handler function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Parse URL from query parameters
  const url = new URL(req.url).searchParams.get('url');
  
  if (!url) {
    return new Response(
      JSON.stringify({ error: 'URL parameter is required' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  }

  try {
    console.log(`Crawling URL: ${url}`);
    
    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract text and metadata
    const text = extractTextFromHTML(html);
    const metadata = extractMetaData(html);
    
    // Optional: Log crawl activity to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase
        .from('crawl_logs')
        .insert({
          user_id: session.user.id,
          url: url,
          crawled_at: new Date().toISOString(),
          success: true,
          text_length: text.length,
        })
        .catch(err => console.error('Error logging crawl activity:', err));
    }

    // Return the extracted text and metadata
    return new Response(
      JSON.stringify({
        text,
        metadata,
        url,
        crawled_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    
    // Log the error to Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase
        .from('crawl_logs')
        .insert({
          user_id: session.user.id,
          url: url,
          crawled_at: new Date().toISOString(),
          success: false,
          error_message: error.message || 'Unknown error',
        })
        .catch(err => console.error('Error logging crawl error:', err));
    }
    
    return new Response(
      JSON.stringify({
        error: `Failed to crawl website: ${error.message}`,
        url,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  }
});