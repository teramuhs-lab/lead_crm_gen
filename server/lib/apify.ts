/**
 * Apify integration — Google Maps scraper + Web page scraper.
 * Google Maps: compass/crawler-google-places actor
 * Web scraper: apify/web-scraper actor (headless Chrome, bypasses Cloudflare)
 */

// ── Types ──

export interface ApifyPlace {
  title: string;
  totalScore: number | null;
  reviewsCount: number | null;
  address: string;
  street: string;
  city: string;
  state: string;
  countryCode: string;
  phone: string | null;
  website: string | null;
  url: string;
  categoryName: string;
  categories: string[];
}

interface SearchInput {
  query: string;
  maxResults: number;
}

interface SearchResult {
  places: ApifyPlace[];
  durationMs: number;
}

const ACTOR_ID = 'compass~crawler-google-places';
const BASE_URL = 'https://api.apify.com/v2/acts';

// ── Main search function ──

export async function searchGoogleMaps(input: SearchInput): Promise<SearchResult> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return { places: [], durationMs: 0 };
  }

  const start = Date.now();
  const max = Math.min(Math.max(input.maxResults, 1), 500);

  const url = `${BASE_URL}/${ACTOR_ID}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchStringsArray: [input.query],
      maxCrawledPlacesPerSearch: max,
      maxCrawledPlaces: max,
      language: 'en',
      maxReviews: 0,
      maxImages: 0,
      includeHistogram: false,
      includeOpeningHours: false,
      includePeopleAlsoSearch: false,
      additionalInfo: false,
      proxyConfig: { useApifyProxy: true },
    }),
    signal: AbortSignal.timeout(10 * 60 * 1000), // 10 min (large result sets need more time)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[apify] Actor run failed: ${response.status} ${body.slice(0, 200)}`);
    return { places: [], durationMs: Date.now() - start };
  }

  const raw = await response.json() as any[];

  const places: ApifyPlace[] = (raw || []).map((item: any) => ({
    title: item.title || '',
    totalScore: item.totalScore ?? null,
    reviewsCount: item.reviewsCount ?? null,
    address: item.address || '',
    street: item.street || '',
    city: item.city || '',
    state: item.state || '',
    countryCode: item.countryCode || '',
    phone: item.phone || null,
    website: item.website || null,
    url: item.url || '',
    categoryName: item.categoryName || '',
    categories: Array.isArray(item.categories) ? item.categories : [],
  }));

  console.log(`[apify] Found ${places.length} places in ${Date.now() - start}ms`);
  return { places, durationMs: Date.now() - start };
}

// ── Web Page Scraper (headless Chrome — bypasses Cloudflare) ──

const WEB_SCRAPER_ACTOR = 'apify~web-scraper';

export async function scrapeWebPage(targetUrl: string): Promise<string | null> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.log('[apify-scraper] No APIFY_TOKEN, skipping');
    return null;
  }

  const start = Date.now();
  console.log(`[apify-scraper] Scraping ${targetUrl} via headless Chrome...`);

  const url = `${BASE_URL}/${WEB_SCRAPER_ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: targetUrl }],
        pageFunction: `async function pageFunction(context) {
          return {
            url: context.request.url,
            html: document.documentElement.outerHTML,
          };
        }`,
        proxyConfiguration: { useApifyProxy: true },
        maxRequestsPerCrawl: 1,
        maxPagesPerCrawl: 1,
      }),
      signal: AbortSignal.timeout(60_000), // 60s timeout for single page
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[apify-scraper] Failed: ${response.status} ${body.slice(0, 200)}`);
      return null;
    }

    const results = await response.json() as any[];
    const html = results?.[0]?.html;

    if (html) {
      console.log(`[apify-scraper] Got ${html.length} chars in ${Date.now() - start}ms`);
      return html;
    }

    console.log(`[apify-scraper] No HTML returned in ${Date.now() - start}ms`);
    return null;
  } catch (err: any) {
    console.error(`[apify-scraper] Error: ${err.message}`);
    return null;
  }
}
