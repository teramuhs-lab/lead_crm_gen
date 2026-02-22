import { GoogleGenerativeAI } from '@google/generative-ai';

const envKey = process.env.GEMINI_API_KEY || '';
const genAI = envKey ? new GoogleGenerativeAI(envKey) : null;

// ── DB key cache (auto-resolve from integrations table when env var is missing) ──
let dbKeyCache: { key: string; ts: number } | null = null;
const DB_KEY_CACHE_TTL = 60_000; // 60s

async function resolveDbKey(): Promise<string | null> {
  if (dbKeyCache && Date.now() - dbKeyCache.ts < DB_KEY_CACHE_TTL) {
    return dbKeyCache.key;
  }
  try {
    // Lazy import to avoid circular dependency at module load
    const { db } = await import('../db/index.js');
    const { integrations } = await import('../db/schema.js');
    const { eq, and } = await import('drizzle-orm');
    const [row] = await db.select().from(integrations)
      .where(and(
        eq(integrations.name, 'Google AI'),
        eq(integrations.status, 'connected'),
      ))
      .limit(1);
    if (row) {
      const config = row.config as Record<string, string>;
      if (config.apiKey) {
        dbKeyCache = { key: config.apiKey, ts: Date.now() };
        return config.apiKey;
      }
    }
  } catch { /* silent */ }
  return null;
}

// Returns a client using: explicit key > env key > DB-cached key
async function resolveClient(runtimeApiKey?: string): Promise<GoogleGenerativeAI> {
  if (runtimeApiKey) return new GoogleGenerativeAI(runtimeApiKey);
  if (genAI) return genAI;
  // No env key — try DB
  const dbKey = await resolveDbKey();
  if (dbKey) return new GoogleGenerativeAI(dbKey);
  // Last resort — empty key (will fail on API call, not on client creation)
  return new GoogleGenerativeAI('');
}

export function isGeminiConfigured(): boolean {
  return !!envKey;
}

/**
 * Check if Gemini is available (env var OR DB integration).
 * Async because it may need a DB lookup.
 */
export async function isGeminiAvailable(): Promise<boolean> {
  if (envKey) return true;
  const dbKey = await resolveDbKey();
  return !!dbKey;
}

// ── Rate Limiter (15 req/min free tier) ──
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12; // stay under 15 to leave buffer
const requestTimestamps: number[] = [];

function checkRateLimit(): void {
  const now = Date.now();
  // Remove timestamps older than the window
  while (requestTimestamps.length && requestTimestamps[0] < now - RATE_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const waitMs = requestTimestamps[0] + RATE_WINDOW_MS - now;
    throw new RateLimitError(`Rate limit: max ${MAX_REQUESTS_PER_WINDOW} requests/min. Try again in ${Math.ceil(waitMs / 1000)}s.`, waitMs);
  }
  requestTimestamps.push(now);
}

class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// ── Response Cache (5-minute TTL) ──
const CACHE_TTL_MS = 5 * 60_000;
const responseCache = new Map<string, { data: string; timestamp: number }>();

function getCacheKey(prefix: string, prompt: string, message: string): string {
  // Simple hash: prefix + first 200 chars of each
  return `${prefix}:${prompt.slice(0, 200)}:${message.slice(0, 200)}`;
}

function getCached(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: string): void {
  responseCache.set(key, { data, timestamp: Date.now() });
  // Evict old entries if cache gets large
  if (responseCache.size > 100) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
}

// ── Retry with Exponential Backoff ──
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
      if (is429 && attempt < maxRetries) {
        const backoffMs = Math.min(2000 * Math.pow(2, attempt), 30_000);
        console.log(`[gemini] 429 hit, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

// ── Public API ──

export async function chat(
  systemPrompt: string,
  userMessage: string,
  history?: { role: string; content: string }[],
  runtimeApiKey?: string,
): Promise<string> {
  // Skip cache for chat (conversations are contextual)
  checkRateLimit();
  const client = await resolveClient(runtimeApiKey);

  return withRetry(async () => {
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const historyFormatted = (history || []).map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const chatSession = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
        ...historyFormatted,
      ],
    });

    const result = await chatSession.sendMessage(userMessage);
    return result.response.text();
  });
}

export async function generateJSON<T>(systemPrompt: string, userMessage: string, runtimeApiKey?: string): Promise<T> {
  const cacheKey = getCacheKey('json', systemPrompt, userMessage);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[gemini] Cache hit for generateJSON');
    return JSON.parse(cached) as T;
  }

  checkRateLimit();
  const client = await resolveClient(runtimeApiKey);

  return withRetry(async () => {
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const chatSession = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: '{"acknowledged": true}' }] },
      ],
    });

    const result = await chatSession.sendMessage(userMessage);
    const text = result.response.text();
    setCache(cacheKey, text);
    return JSON.parse(text) as T;
  });
}

export { RateLimitError, checkRateLimit };
