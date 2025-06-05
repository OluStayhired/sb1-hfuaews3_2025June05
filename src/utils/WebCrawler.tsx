import React, { useState, useEffect } from 'react';

interface WebCrawlerProps {
  url: string;
  onTextExtracted: (text: string | null, error: string | null) => void;
}

export function WebCrawler({ url, onTextExtracted }: WebCrawlerProps) {
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      onTextExtracted(null, 'No URL provided');
      return;
    }

    const crawlWebsite = async () => {
      setLoading(true);
      setError(null);
      setExtractedText(null);

      try {
        // Call the Supabase Edge Function for web crawling
        const response = await fetch(`https://selrznkggmoxbpflzwjz.supabase.co/functions/v1/webcrawler-bot?url=${encodeURIComponent(url)}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.text) {
          setExtractedText(data.text);
          onTextExtracted(data.text, null);
        } else {
          throw new Error('No text found on the page.');
        }
      } catch (err: any) {
        console.error('WebCrawler error:', err);
        setError(err.message || 'Failed to crawl website');
        onTextExtracted(null, err.message || 'Failed to crawl website');
      } finally {
        setLoading(false);
      }
    };

    crawlWebsite();
  }, [url, onTextExtracted]);

  // This component doesn't render anything visible itself, it's purely for logic.
  // You would typically show loading/error states in the parent component that uses this.
  return null;
}

export default WebCrawler;