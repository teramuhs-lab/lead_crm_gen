import { checkRateLimit, RateLimitError } from './gemini.js';

// ── Types ──

interface ResolveResult {
  website: string;
  source: 'places_api' | 'gemini_search' | 'none';
  durationMs: number;
}

// ── Strategy 1: Google Places Details API ──
// Uses the placeId from grounded search sources to get the website directly.
// Requires GOOGLE_PLACES_API_KEY (or falls through to Strategy 2).

async function tryPlacesApi(placeId: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    // Google Places API (New) — field mask for website only
    const cleanPlaceId = placeId.replace(/^places\//, '');
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${cleanPlaceId}?fields=websiteUri`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) return null;
    const data = await response.json() as any;
    return data.websiteUri || null;
  } catch {
    return null;
  }
}

// Extract placeId from a Google Maps URL or stored placeId
function extractPlaceId(googleMapsUrl: string): string | null {
  if (!googleMapsUrl) return null;

  // Direct placeId format: "places/ChIJ..."
  if (googleMapsUrl.startsWith('places/')) return googleMapsUrl;

  // From URL like: https://maps.google.com/?cid=12345
  // CID format doesn't directly give us a placeId, skip
  return null;
}

// ── Strategy 1b: Google Places Text Search API ──
// Uses business name + location to find the website via text search.
// Works when we don't have a placeId (which is most of the time since
// Google Maps grounding returns CID-format URIs, not places/ChIJ... format).

async function tryPlacesTextSearch(businessName: string, location: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.websiteUri',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        textQuery: `${businessName} in ${location}`,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json() as any;
    const website = data.places?.[0]?.websiteUri || null;
    if (website) {
      console.log(`[website-resolver] Text Search found: ${website}`);
    }
    return website;
  } catch {
    return null;
  }
}

// ── Strategy 2: Gemini Grounded Search for website ──
// Makes a focused Gemini call specifically to find the website URL.

async function tryGeminiWebsiteSearch(
  businessName: string,
  location: string,
): Promise<string | null> {
  try {
    checkRateLimit();

    const { groundedSearch } = await import('./gemini-grounded.js');

    const prompt = `What is the official website URL for "${businessName}" in ${location}?

Search Google for their website. Return ONLY the full URL (e.g., https://example.com).
If you cannot find a website, respond with exactly "NONE".
Do not return social media pages, directory listings, or Google Maps links.`;

    const result = await groundedSearch(prompt, {
      tools: [{ googleSearch: {} }],
    });

    const text = result.text.trim();

    // Check if Gemini found a URL
    if (text === 'NONE' || text.toLowerCase().includes('none') || text.toLowerCase().includes('not found')) {
      return null;
    }

    // Extract URL from response
    const urlMatch = text.match(/https?:\/\/[^\s"<>()]+/i);
    if (urlMatch) {
      let url = urlMatch[0].replace(/[.,;:!?)]+$/, ''); // trim trailing punctuation
      // Filter out directory/social media URLs
      const blocked = ['yelp.com', 'facebook.com', 'instagram.com', 'twitter.com',
        'linkedin.com', 'bbb.org', 'yellowpages.com', 'angieslist.com',
        'google.com/maps', 'maps.google.com', 'nextdoor.com', 'thumbtack.com',
        'homeadvisor.com', 'angi.com', 'tiktok.com', 'x.com',
        'vertexaisearch.cloud.google.com', 'googleapis.com/grounding'];
      const lowerUrl = url.toLowerCase();
      if (blocked.some(d => lowerUrl.includes(d))) {
        // For Google grounding redirects, try to follow the redirect to get the real URL
        if (lowerUrl.includes('vertexaisearch.cloud.google.com')) {
          try {
            const redirectResp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
            const finalUrl = redirectResp.url;
            if (finalUrl && !blocked.some(d => finalUrl.toLowerCase().includes(d))) {
              return finalUrl;
            }
          } catch { /* failed to follow redirect */ }
        }
        return null;
      }
      return url;
    }

    return null;
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.error('[website-resolver] Gemini search failed:', err);
    return null;
  }
}

// ── Main resolver ──

export async function resolveWebsite(input: {
  businessName: string;
  location: string;
  googleMapsUrl?: string;
  placeId?: string;
}): Promise<ResolveResult> {
  const start = Date.now();

  // Strategy 1a: Google Places Details API (if placeId available)
  const pid = input.placeId || extractPlaceId(input.googleMapsUrl || '');
  if (pid && process.env.GOOGLE_PLACES_API_KEY) {
    const website = await tryPlacesApi(pid);
    if (website) {
      console.log(`[website-resolver] Found via Places API: ${website}`);
      return { website, source: 'places_api', durationMs: Date.now() - start };
    }
  }

  // Strategy 1b: Google Places Text Search (no placeId needed — uses name + location)
  if (input.businessName && input.location && process.env.GOOGLE_PLACES_API_KEY) {
    const website = await tryPlacesTextSearch(input.businessName, input.location);
    if (website) {
      return { website, source: 'places_api', durationMs: Date.now() - start };
    }
  }

  // Strategy 2: Focused Gemini search (costs 1 API call)
  if (input.businessName && input.location) {
    const website = await tryGeminiWebsiteSearch(input.businessName, input.location);
    if (website) {
      console.log(`[website-resolver] Found via Gemini: ${website}`);
      return { website, source: 'gemini_search', durationMs: Date.now() - start };
    }
  }

  return { website: '', source: 'none', durationMs: Date.now() - start };
}
