/**
 * Interface for a Bluesky Rich Text Facet for a Link.
 * This structure is required by the Bluesky API to define clickable links.
 */
interface BlueskyLinkFacet {
    index: {
        byteStart: number;
        byteEnd: number;
    };
    features: Array<{
        $type: 'app.bsky.richtext.facet#link';
        uri: string;
    }>;
}

/**
 * Processes post content to ensure URLs have 'https://' prefix and generates
 * Bluesky link facets for them.
 *
 * @param content The raw string content of the post.
 * @returns An object containing the processed content string and an array of BlueskyLinkFacet objects.
 */
export function generateBlueskyFacetsForLinks(content: string): { processedContent: string; facets: BlueskyLinkFacet[] } {
    const facets: BlueskyLinkFacet[] = [];
    // The content string is not modified by this function, only analyzed for facets.
    const originalContent = content;

    // Revised Regex: All internal groups are now non-capturing (?:...)
    // This ensures that the 'match', 'offset', and 'string' parameters in the replace callback
    // are correctly aligned, as there are no 'p1', 'p2', etc. capturing groups.
    const urlRegex = /(?:https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|(?:www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,})|(?:https?:\/\/[a-zA-Z0-9]+\.[^\s]{2,})|(?:[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+(?:\/[^\s]*)?))/g;

    const encoder = new TextEncoder();

    // Iterate through matches to build facets
    // The callback signature is now (match, offset, string) because there are no capturing groups
    originalContent.replace(urlRegex, (match, offset, string) => {
        // 'match' is the full matched URL string
        // 'offset' is the numerical index of the match within the original string
        // 'string' is the original string itself (content)

        // Ensure the URI for the facet has a schema
        let uri = match;
        if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
            uri = `https://${uri}`;
        }

        // Calculate byte offsets for the facet using the correct 'string' parameter
        const textBeforeMatch = string.substring(0, offset);
        const byteStart = encoder.encode(textBeforeMatch).length;
        const byteEnd = byteStart + encoder.encode(match).length;

        facets.push({
            index: {
                byteStart: byteStart,
                byteEnd: byteEnd,
            },
            features: [
                {
                    $type: 'app.bsky.richtext.facet#link',
                    uri: uri,
                },
            ],
        });

        return match; // Return the original match to keep the string content unchanged
    });

    return { processedContent: originalContent, facets }; // Return original content and generated facets
}

// Example Usage:
// const rawPostContent1 = "Check out my new article at example.com or visit www.mysite.net/blog. Already formatted: https://formatted.com";
// const { processedContent: pc1, facets: f1 } = generateBlueskyFacetsForLinks(rawPostContent1);
// console.log("Content 1:", pc1);
// console.log("Facets 1:", JSON.stringify(f1, null, 2));
/* Expected Facets 1 (byteStart/End might vary slightly based on exact regex/content):
[
  {
    "index": { "byteStart": 30, "byteEnd": 41 }, // example.com
    "features": [ { "$type": "app.bsky.richtext.facet#link", "uri": "https://example.com" } ]
  },
  {
    "index": { "byteStart": 54, "byteEnd": 74 }, // www.mysite.net/blog
    "features": [ { "$type": "app.bsky.richtext.facet#link", "uri": "https://www.mysite.net/blog" } ]
  },
  {
    "index": { "byteStart": 94, "byteEnd": 113 }, // https://formatted.com
    "features": [ { "$type": "app.bsky.richtext.facet#link", "uri": "https://formatted.com" } ]
  }
]
*/

// const rawPostContent2 = "Visit my site at example.org and also check out https://blog.test.co/post?id=123";
// const { processedContent: pc2, facets: f2 } = generateBlueskyFacetsForLinks(rawPostContent2);
// console.log("Content 2:", pc2);
// console.log("Facets 2:", JSON.stringify(f2, null, 2));