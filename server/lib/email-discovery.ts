import * as cheerio from 'cheerio';
import dns from 'dns';
import { scrapeWebPage } from './apify.js';

// ── Types ──

type EmailSource = 'website_scrape' | 'pattern_guess' | 'hunter_api';
type EmailConfidence = 'high' | 'medium' | 'low';

interface EmailCandidate {
  email: string;
  source: EmailSource;
  confidence: EmailConfidence;
  page?: string;
}

interface StrategyResult {
  name: string;
  attempted: boolean;
  durationMs: number;
  result: 'found' | 'not_found' | 'error' | 'skipped';
  error?: string;
}

export interface EmailDiscoveryResult {
  email: string;
  allCandidates: EmailCandidate[];
  strategies: StrategyResult[];
  totalDurationMs: number;
  businessData?: {
    ownerName: string;
    services: string;
    painPoints: string;
    socialLinks: string;
  };
}

export interface EmailDiscoveryInput {
  businessName: string;
  website: string;
  location?: string;
  industry?: string;
  skipGemini?: boolean;
  includeBusinessData?: boolean;
}

// ── Helpers ──

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EXCLUDED_PREFIXES = ['noreply', 'no-reply', 'mailer-daemon', 'webmaster', 'postmaster', 'daemon'];
const GENERIC_PREFIXES = ['info', 'contact', 'hello', 'office', 'admin', 'support', 'help', 'sales', 'team', 'service', 'enquiries', 'inquiries', 'mail'];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isExcluded(email: string): boolean {
  const prefix = email.split('@')[0].toLowerCase();
  return EXCLUDED_PREFIXES.includes(prefix);
}

const JUNK_DOMAINS = [
  'example.com', 'example.org', 'test.com', 'sentry.io', 'wixpress.com',
  'yourdomain.com', 'domain.com', 'email.com', 'yoursite.com', 'company.com',
  'placeholder.com', 'changeme.com', 'cloudfront.net', 'googleapis.com', 'gstatic.com',
];

function isJunkDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  if (JUNK_DOMAINS.includes(domain)) return true;
  // Image filename patterns (e.g., image@2x.png)
  if (/^\d/.test(email.split('@')[0]) && /^\dx\./.test(domain)) return true;
  return false;
}

// Cloudflare email protection decoder — XOR-based hex encoding
function decodeCfEmail(encoded: string): string {
  if (!encoded || encoded.length < 4) return '';
  try {
    const key = parseInt(encoded.substring(0, 2), 16);
    let email = '';
    for (let i = 2; i < encoded.length; i += 2) {
      email += String.fromCharCode(parseInt(encoded.substring(i, i + 2), 16) ^ key);
    }
    return email.toLowerCase();
  } catch {
    return '';
  }
}

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.match(/^https?:\/\//)) url = 'https://' + url;
  return url.replace(/\/+$/, '');
}

function extractDomain(website: string): string {
  try {
    const url = new URL(normalizeUrl(website));
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'no-cache',
};

function isCloudflareChallenge(html: string): boolean {
  return html.includes('<title>Just a moment...</title>')
    || html.includes('cf-browser-verification')
    || html.includes('challenge-platform');
}

interface FetchResult {
  html: string | null;
  cloudflareBlocked: boolean;
}

async function fetchPage(url: string, timeoutMs = 10000): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: 'follow',
    });
    if (!response.ok) return { html: null, cloudflareBlocked: false };
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return { html: null, cloudflareBlocked: false };
    const text = await response.text();
    const html = text.slice(0, 2_000_000);
    if (isCloudflareChallenge(html)) {
      console.log(`[email-discovery] Cloudflare challenge detected for ${url}`);
      return { html: null, cloudflareBlocked: true };
    }
    return { html, cloudflareBlocked: false };
  } catch {
    return { html: null, cloudflareBlocked: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPageWithApifyFallback(url: string): Promise<string | null> {
  const result = await fetchPage(url);
  if (result.html) return result.html;

  // Cloudflare blocked → try Apify headless Chrome
  if (result.cloudflareBlocked) {
    console.log(`[email-discovery] Retrying ${url} via Apify headless Chrome...`);
    const apifyHtml = await scrapeWebPage(url);
    if (apifyHtml) {
      console.log(`[email-discovery] Apify fallback succeeded for ${url}`);
      return apifyHtml;
    }
    console.log(`[email-discovery] Apify fallback also failed for ${url}`);
  }

  return null;
}

function confidenceScore(c: EmailCandidate, siteDomain?: string): number {
  let score = 0;
  if (c.source === 'website_scrape') score += 50;
  else if (c.source === 'hunter_api') score += 40;
  else if (c.source === 'pattern_guess') score += 10;

  if (c.confidence === 'high') score += 30;
  else if (c.confidence === 'medium') score += 15;
  else score += 5;

  const prefix = c.email.split('@')[0].toLowerCase();
  if (!GENERIC_PREFIXES.includes(prefix)) score += 10;

  // Domain mismatch penalty: scraped email doesn't match the website domain
  if (siteDomain && !emailDomainMatchesSite(c.email, siteDomain)) {
    score -= 20;
  }

  return score;
}

function selectBestCandidate(candidates: EmailCandidate[], siteDomain?: string): string {
  if (candidates.length === 0) return '';
  const unique = new Map<string, EmailCandidate>();
  for (const c of candidates) {
    const existing = unique.get(c.email);
    if (!existing || confidenceScore(c, siteDomain) > confidenceScore(existing, siteDomain)) {
      unique.set(c.email, c);
    }
  }
  const sorted = [...unique.values()].sort((a, b) => confidenceScore(b, siteDomain) - confidenceScore(a, siteDomain));
  return sorted[0]?.email || '';
}

// ── Strategy 1: Website Scraping ──

function extractEmailsFromHtml(html: string, baseDomain: string, pageUrl?: string): EmailCandidate[] {
  const $ = cheerio.load(html);
  const candidates: EmailCandidate[] = [];
  const seen = new Set<string>();

  const addCandidate = (email: string, confidence: EmailConfidence) => {
    const e = email.toLowerCase().trim();
    if (isValidEmail(e) && !isExcluded(e) && !isJunkDomain(e) && !seen.has(e)) {
      seen.add(e);
      candidates.push({ email: e, source: 'website_scrape', confidence, page: pageUrl });
    }
  };

  // 1. mailto: links — highest confidence (decode URL-encoded emails like %40)
  $('a[href^="mailto:"], a[href^="MAILTO:"]').each((_, el) => {
    try {
      const href = decodeURIComponent($(el).attr('href') || '');
      const email = href.replace(/^mailto:/i, '').split('?')[0].trim();
      addCandidate(email, 'high');
    } catch { /* malformed URI */ }
  });

  // 2. Schema.org JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '');
      for (const email of extractEmailsFromJsonLd(json)) {
        addCandidate(email, 'high');
      }
    } catch { /* malformed JSON-LD */ }
  });

  // 3. Cloudflare email protection — data-cfemail XOR-encoded
  $('[data-cfemail]').each((_, el) => {
    const encoded = $(el).attr('data-cfemail') || '';
    const decoded = decodeCfEmail(encoded);
    addCandidate(decoded, 'high');
  });

  // 4. Microdata / schema.org itemprop="email"
  $('[itemprop="email"]').each((_, el) => {
    const content = $(el).attr('content') || $(el).attr('href')?.replace(/^mailto:/i, '') || $(el).text();
    addCandidate(content, 'high');
  });

  // 5. vCard / hCard microformat
  $('.vcard .email, .h-card .p-email, [class*="vcard"] [class*="email"]').each((_, el) => {
    const email = $(el).attr('href')?.replace(/^mailto:/i, '') || $(el).text();
    addCandidate(email, 'high');
  });

  // 6. Data attributes: data-email, data-mail, data-contact, data-address
  $('[data-email], [data-mail], [data-contact], [data-address]').each((_, el) => {
    for (const attr of ['data-email', 'data-mail', 'data-contact', 'data-address']) {
      const val = $(el).attr(attr) || '';
      if (val.includes('@')) addCandidate(val, 'high');
    }
  });

  // 7. Meta tags: og:email, business:contact_data:email, author
  $('meta[property="og:email"], meta[property="business:contact_data:email"], meta[name="email"], meta[name="contact:email"]').each((_, el) => {
    const content = $(el).attr('content') || '';
    addCandidate(content, 'high');
  });
  // Author meta (sometimes contains email)
  $('meta[name="author"]').each((_, el) => {
    const content = $(el).attr('content') || '';
    if (content.includes('@')) addCandidate(content, 'medium');
  });

  // 8. Text content scan with HTML entity decoding
  $('script, style, noscript').remove();
  const rawText = $.text();

  // Decode common HTML entities that hide @ and .
  const textContent = rawText
    .replace(/&#64;|&#x40;/gi, '@')
    .replace(/&#46;|&#x2[eE];/gi, '.')
    .replace(/&commat;/gi, '@')
    .replace(/&period;/gi, '.');

  const textEmails = textContent.match(EMAIL_REGEX) || [];
  for (const raw of textEmails) {
    addCandidate(raw, 'medium');
  }

  // 9. Broad obfuscation patterns: [at], (at), {at}, <at>, AT, [dot], (dot), etc.
  const broadObfuscated = /[\w.+-]+\s*(?:[\[\({<]?\s*(?:at)\s*[\]\)}>]?)\s*[\w.-]+\s*(?:[\[\({<]?\s*(?:dot)\s*[\]\)}>]?)\s*\w+/gi;
  const obfuscated = textContent.match(broadObfuscated) || [];
  for (const raw of obfuscated) {
    const email = raw
      .replace(/\s*[\[\({<]?\s*(?:at)\s*[\]\)}>]?\s*/i, '@')
      .replace(/\s*[\[\({<]?\s*(?:dot)\s*[\]\)}>]?\s*/gi, '.');
    addCandidate(email, 'medium');
  }

  // 10. HTML comment scanning (some sites hide emails in comments)
  const fullHtml = $.html() || html;
  const commentRegex = /<!--([\s\S]*?)-->/g;
  let commentMatch;
  while ((commentMatch = commentRegex.exec(fullHtml)) !== null) {
    const commentEmails = commentMatch[1].match(EMAIL_REGEX) || [];
    for (const raw of commentEmails) {
      addCandidate(raw, 'low');
    }
  }

  return candidates;
}

function emailDomainMatchesSite(email: string, siteDomain: string): boolean {
  const emailDomain = email.split('@')[1];
  if (!emailDomain || !siteDomain) return false;
  return emailDomain === siteDomain
    || siteDomain.endsWith('.' + emailDomain)
    || emailDomain.endsWith('.' + siteDomain);
}

function extractEmailsFromJsonLd(obj: any): string[] {
  const emails: string[] = [];
  if (!obj || typeof obj !== 'object') return emails;

  if (typeof obj.email === 'string' && isValidEmail(obj.email)) {
    emails.push(obj.email.toLowerCase());
  }
  if (typeof obj.contactPoint?.email === 'string' && isValidEmail(obj.contactPoint.email)) {
    emails.push(obj.contactPoint.email.toLowerCase());
  }
  if (Array.isArray(obj.contactPoint)) {
    for (const cp of obj.contactPoint) {
      if (typeof cp.email === 'string' && isValidEmail(cp.email)) {
        emails.push(cp.email.toLowerCase());
      }
    }
  }
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      emails.push(...extractEmailsFromJsonLd(item));
    }
  }

  return emails;
}

function findContactPageUrl(html: string, baseUrl: string): string | null {
  const $ = cheerio.load(html);
  const contactKeywords = /contact|get.in.touch|reach.us|email.us|connect|enquir|inquir|let.?s.talk|write.to|speak.with/i;
  const aboutKeywords = /about/i;

  let contactLink: string | null = null;
  let aboutLink: string | null = null;

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text() || '';
    const combined = href + ' ' + text;

    try {
      const resolved = new URL(href, baseUrl).href;
      if (new URL(resolved).hostname !== new URL(baseUrl).hostname) return;

      if (contactKeywords.test(combined) && !contactLink) {
        contactLink = resolved;
      } else if (aboutKeywords.test(combined) && !aboutLink) {
        aboutLink = resolved;
      }
    } catch { /* invalid URL */ }
  });

  return contactLink || aboutLink;
}

async function scrapeWebsiteForEmails(website: string): Promise<EmailCandidate[]> {
  const baseUrl = normalizeUrl(website);
  const domain = extractDomain(website);
  if (!domain) return [];

  // Fetch homepage (with Apify fallback for Cloudflare)
  const homepageHtml = await fetchPageWithApifyFallback(baseUrl);
  if (!homepageHtml) return [];

  let candidates = extractEmailsFromHtml(homepageHtml, domain, baseUrl);

  // If we found high-confidence emails, return early
  if (candidates.some(c => c.confidence === 'high')) return candidates;

  // Try to find and fetch the contact page
  const contactUrl = findContactPageUrl(homepageHtml, baseUrl);
  if (contactUrl && contactUrl !== baseUrl) {
    const contactHtml = await fetchPageWithApifyFallback(contactUrl);
    if (contactHtml) {
      const contactEmails = extractEmailsFromHtml(contactHtml, domain, contactUrl);
      candidates = [...candidates, ...contactEmails];
    }
  }

  // If still nothing, try common contact page paths
  if (candidates.length === 0) {
    const commonPaths = ['/contact', '/contact-us', '/about', '/about-us', '/reach-us', '/get-in-touch', '/connect', '/support', '/info'];
    for (const path of commonPaths) {
      const url = baseUrl + path;
      const result = await fetchPage(url); // Regular fetch for subpages (Apify only for homepage/contact Cloudflare blocks)
      if (result.html) {
        const pathEmails = extractEmailsFromHtml(result.html, domain, url);
        if (pathEmails.length > 0) {
          candidates = [...candidates, ...pathEmails];
          break;
        }
      }
    }
  }

  return candidates;
}

// ── Strategy 2: Common Pattern + MX Check ──

async function checkMxRecords(domain: string): Promise<boolean> {
  try {
    const records = await dns.promises.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

async function tryCommonPatterns(domain: string): Promise<EmailCandidate[]> {
  const hasMx = await checkMxRecords(domain);
  if (!hasMx) return [];

  const prefixes = ['info', 'contact', 'hello', 'office', 'admin', 'support', 'sales'];
  return prefixes.map(prefix => ({
    email: `${prefix}@${domain}`,
    source: 'pattern_guess' as const,
    confidence: 'low' as const,
  }));
}

// ── Strategy 3: Gemini Business Data Enrichment (NO email guessing) ──

interface GeminiBusinessData {
  ownerName: string;
  services: string;
  painPoints: string;
  socialLinks: string;
}

async function tryGeminiBusinessData(
  businessName: string,
  website: string,
  location: string,
): Promise<GeminiBusinessData | undefined> {
  const { groundedSearch } = await import('./gemini-grounded.js');

  // Business data only — NO email search (emails must come from real scraping)
  const prompt = `Find business information for "${businessName}".
${website ? `Website: ${website}.` : ''} ${location ? `Located in: ${location}.` : ''}

Return in labeled format:
1. **Owner Name** — the owner or manager's name if publicly available. If not found, write "Not found"
2. **Services** — a comma-separated list of their main services
3. **Pain Points** — specific areas where this business could improve their online presence
4. **Social Media** — links to their social media profiles

Do NOT include any email addresses.`;

  const result = await groundedSearch(prompt, { tools: [{ googleSearch: {} }] });
  const text = result.text;

  const cleanValue = (v?: string) =>
    v?.trim().replace(/^not found$/i, '').replace(/^n\/a$/i, '').replace(/^none$/i, '') || '';

  const ownerMatch = text.match(/\*?\*?Owner(?:\s*Name)?\*?\*?\s*[:\s—-]+\s*([^\n*]+)/i);
  const servicesMatch = text.match(/\*?\*?Services\*?\*?\s*[:\s—-]+\s*([^\n*]+)/i);
  const painMatch = text.match(/\*?\*?Pain Points?\*?\*?\s*[:\s—-]+\s*([^\n*]+)/i);
  const socialMatch = text.match(/\*?\*?Social Media\*?\*?\s*[:\s—-]+\s*([\s\S]*?)(?=\n\n|\n\d\.|\*\*|$)/i);

  let ownerRaw = cleanValue(ownerMatch?.[1]);
  if (ownerRaw.toLowerCase().startsWith('name:')) ownerRaw = ownerRaw.slice(5).trim();

  return {
    ownerName: cleanValue(ownerRaw),
    services: cleanValue(servicesMatch?.[1]),
    painPoints: cleanValue(painMatch?.[1]),
    socialLinks: cleanValue(socialMatch?.[1]),
  };
}

// ── Strategy 4: Hunter.io (optional) ──

async function tryHunterApi(domain: string): Promise<EmailCandidate[]> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(apiKey)}&limit=5`
    );
    if (!response.ok) return [];
    const data = await response.json() as any;

    return (data.data?.emails || []).map((e: any) => ({
      email: (e.value as string).toLowerCase(),
      source: 'hunter_api' as const,
      confidence: (e.confidence > 80 ? 'high' : 'medium') as EmailConfidence,
    }));
  } catch {
    return [];
  }
}

// ── Main Pipeline ──

export async function discoverEmail(input: EmailDiscoveryInput): Promise<EmailDiscoveryResult> {
  const startTime = Date.now();
  const allCandidates: EmailCandidate[] = [];
  const strategies: StrategyResult[] = [];
  const domain = extractDomain(input.website);

  // ── Strategy 1: Website Scraping ──
  if (input.website) {
    const s1Start = Date.now();
    try {
      const scraped = await scrapeWebsiteForEmails(input.website);
      allCandidates.push(...scraped);
      strategies.push({
        name: 'website_scrape',
        attempted: true,
        durationMs: Date.now() - s1Start,
        result: scraped.length > 0 ? 'found' : 'not_found',
      });
      // Early exit if we found a high-confidence email from the website
      const highConfidence = scraped.find(c => c.confidence === 'high');
      if (highConfidence) {
        return {
          email: highConfidence.email,
          allCandidates,
          strategies,
          totalDurationMs: Date.now() - startTime,
        };
      }
    } catch (err: any) {
      strategies.push({
        name: 'website_scrape',
        attempted: true,
        durationMs: Date.now() - s1Start,
        result: 'error',
        error: err.message,
      });
    }
  } else {
    strategies.push({ name: 'website_scrape', attempted: false, durationMs: 0, result: 'skipped' });
  }

  // ── Strategy 2: Pattern + MX Check ──
  if (domain) {
    const s2Start = Date.now();
    try {
      const patterns = await tryCommonPatterns(domain);
      allCandidates.push(...patterns);
      strategies.push({
        name: 'pattern_mx',
        attempted: true,
        durationMs: Date.now() - s2Start,
        result: patterns.length > 0 ? 'found' : 'not_found',
      });
    } catch (err: any) {
      strategies.push({
        name: 'pattern_mx',
        attempted: true,
        durationMs: Date.now() - s2Start,
        result: 'error',
        error: err.message,
      });
    }
  } else {
    strategies.push({ name: 'pattern_mx', attempted: false, durationMs: 0, result: 'skipped' });
  }

  // ── Strategy 3: Gemini Business Data Only (NO email guessing) ──
  // Gemini is only used for business intelligence (owner, services, pain points).
  // Emails must come from real scraping — never from AI guesses.
  let businessData: EmailDiscoveryResult['businessData'];

  if (!input.skipGemini && input.includeBusinessData) {
    const s3Start = Date.now();
    try {
      businessData = await tryGeminiBusinessData(
        input.businessName,
        input.website,
        input.location || '',
      );
      strategies.push({
        name: 'gemini_business_data',
        attempted: true,
        durationMs: Date.now() - s3Start,
        result: businessData?.ownerName || businessData?.services ? 'found' : 'not_found',
      });
    } catch (err: any) {
      strategies.push({
        name: 'gemini_business_data',
        attempted: true,
        durationMs: Date.now() - s3Start,
        result: 'error',
        error: err.message,
      });
    }
  } else {
    strategies.push({ name: 'gemini_business_data', attempted: false, durationMs: 0, result: 'skipped' });
  }

  // ── Strategy 4: Hunter.io (optional) ──
  if (process.env.HUNTER_API_KEY && domain) {
    const s4Start = Date.now();
    try {
      const hunterResults = await tryHunterApi(domain);
      allCandidates.push(...hunterResults);
      strategies.push({
        name: 'hunter_api',
        attempted: true,
        durationMs: Date.now() - s4Start,
        result: hunterResults.length > 0 ? 'found' : 'not_found',
      });
    } catch (err: any) {
      strategies.push({
        name: 'hunter_api',
        attempted: true,
        durationMs: Date.now() - s4Start,
        result: 'error',
        error: err.message,
      });
    }
  }

  // ── Select best candidate ──
  const best = selectBestCandidate(allCandidates, domain);
  return {
    email: best,
    allCandidates,
    strategies,
    totalDurationMs: Date.now() - startTime,
    businessData,
  };
}
