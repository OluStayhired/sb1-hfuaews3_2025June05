// src/lib/firecrawl.ts

export interface CompanyInsightsResponse {
  Problem: string;
  Audience: string;
}

const FIRECRAWL_PROXY_URL = import.meta.env.VITE_FIRECRAWL_PROXY_EDGE_FUNCTION_URL || 'YOUR_DEFAULT_FIRECRAWL_PROXY_URL';
const GEMINI_CRAWLER_URL = import.meta.env.VITE_GEMINI_CRAWLER_EDGE_FUNCTION_URL || 'YOUR_DEFAULT_GEMINI_CRAWLER_URL';

export async function getCompanyProblemAndAudience(url: string): Promise<CompanyInsightsResponse> {
  if (!FIRECRAWL_PROXY_URL || !GEMINI_CRAWLER_URL) { // Corrected typo FIRECRAWW_PROXY_URL to FIRECRAWL_PROXY_URL
    throw new Error("API proxy URLs are not configured. Please check your environment variables.");
  }

  // Step 1: Call Firecrawl proxy to scrape content
  console.log("Calling Firecrawl proxy to scrape URL:", url);
  let firecrawlResponse: Response;
  try {
    firecrawlResponse = await fetch(FIRECRAWL_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
  } catch (fetchError) {
    console.error('Network error calling Firecrawl proxy:', fetchError);
    throw new Error(`Network error during scraping: ${fetchError instanceof Error ? fetchError.message : 'Unknown network error'}`);
  }

  if (!firecrawlResponse.ok) {
    const errorData = await firecrawlResponse.json().catch(() => ({ error: 'Failed to parse error response from Firecrawl' }));
    console.error('Firecrawl scraping failed:', errorData);
    throw new Error(`Firecrawl scraping failed: ${errorData.error || errorData.message || 'Unknown error'} (Status: ${firecrawlResponse.status})`);
  }

  const { markdownContent } = await firecrawlResponse.json();
  console.log("Received markdown from Firecrawl (first 500 chars):", markdownContent?.substring(0, 500) + "...");


  if (!markdownContent || typeof markdownContent !== 'string') {
    throw new Error('Firecrawl did not return valid markdown content.');
  }

  // Step 2: Call the NEW Gemini Crawler function to extract insights from scraped content
  console.log("Calling Gemini Crawler to extract insights...");
  let geminiCrawlerResponse: Response;
  try {
    geminiCrawlerResponse = await fetch(GEMINI_CRAWLER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: markdownContent }), // Send the scraped markdown
    });
  } catch (fetchError) {
    console.error('Network error calling Gemini Crawler:', fetchError);
    throw new Error(`Network error during deduction: ${fetchError instanceof Error ? fetchError.message : 'Unknown network error'}`);
  }


  if (!geminiCrawlerResponse.ok) {
    const errorData = await geminiCrawlerResponse.json().catch(() => ({ error: 'Failed to parse error response from Gemini Crawler' }));
    console.error('Gemini Crawler extraction failed:', errorData);
    throw new Error(`Gemini Crawler extraction failed: ${errorData.error || errorData.message || 'Unknown error'} (Status: ${geminiCrawlerResponse.status})`);
  }

  // --- CRITICAL CHANGE HERE: Parse response from gemini-crawler ---
  const geminiResponseText = await geminiCrawlerResponse.text(); // Get as raw text first
  console.log("Raw text response from gemini-crawler:", geminiResponseText); // Log raw text for debugging

  let extractedInsights: CompanyInsightsResponse;
  try {
    // Robustly find JSON within the text received from the proxy,
    // in case the proxy itself (or Gemini) added ```json ``` markdown
    const jsonMatch = geminiResponseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      extractedInsights = JSON.parse(jsonMatch[1]);
    } else {
      // If no markdown block, try parsing the whole text
      extractedInsights = JSON.parse(geminiResponseText);
    }
  } catch (parseError) {
    console.error('Failed to parse Gemini Crawler response as JSON:', parseError, 'Raw text:', geminiResponseText);
    throw new Error(`Failed to parse Gemini response: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}. Raw: ${geminiResponseText}`);
  }

  // Add validation on the frontend side for good measure, mirroring the proxy's validation
  if (typeof extractedInsights.Problem !== 'string' || typeof extractedInsights.Audience !== 'string') {
    console.error("Gemini extracted data does not match expected schema types on frontend:", extractedInsights);
    throw new Error("Gemini returned data in an unexpected format or with incorrect types for Problem/Audience.");
  }


  console.log("Received extracted insights from Gemini Crawler:", extractedInsights);

  return extractedInsights;
}