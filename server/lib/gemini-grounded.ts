import { GoogleGenAI } from '@google/genai';
import { checkRateLimit, RateLimitError } from './gemini.js';

const envKey = process.env.GEMINI_API_KEY || '';
const ai = envKey ? new GoogleGenAI({ apiKey: envKey }) : null;

// Lazy DB key resolution (shares cache pattern with gemini.ts)
let dbKeyCache: { key: string; ts: number } | null = null;
const DB_KEY_CACHE_TTL = 60_000;

async function resolveGroundedClient(): Promise<GoogleGenAI> {
  if (ai) return ai;
  // Try DB
  if (!dbKeyCache || Date.now() - dbKeyCache.ts > DB_KEY_CACHE_TTL) {
    try {
      const { db } = await import('../db/index.js');
      const { integrations } = await import('../db/schema.js');
      const { eq, and } = await import('drizzle-orm');
      const [row] = await db.select().from(integrations)
        .where(and(eq(integrations.name, 'Google AI'), eq(integrations.status, 'connected')))
        .limit(1);
      if (row) {
        const config = row.config as Record<string, string>;
        if (config.apiKey) dbKeyCache = { key: config.apiKey, ts: Date.now() };
      }
    } catch { /* silent */ }
  }
  if (dbKeyCache?.key) return new GoogleGenAI({ apiKey: dbKeyCache.key });
  return new GoogleGenAI({ apiKey: '' });
}

// ── Response Cache (5-minute TTL, same pattern as gemini.ts) ──
const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { data: { text: string; sources: any[]; placeIds: Array<{ title: string; placeId: string }> }; ts: number }>();

export async function groundedSearch(
  prompt: string,
  options: {
    tools: any[];
    toolConfig?: any;
    model?: string;
  }
): Promise<{ text: string; sources: any[]; placeIds: Array<{ title: string; placeId: string }> }> {
  const cacheKey = `grounded:${prompt.slice(0, 200)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.log('[gemini-grounded] Cache hit');
    return cached.data;
  }

  // Shared rate limiter with gemini.ts
  checkRateLimit();

  const client = await resolveGroundedClient();
  const response = await client.models.generateContent({
    model: options.model || 'gemini-2.0-flash',
    contents: prompt,
    config: {
      tools: options.tools,
      ...(options.toolConfig ? { toolConfig: options.toolConfig } : {}),
    },
  });

  const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const result = {
    text: response.text || '',
    sources: groundingChunks,
    // Extract placeIds from Maps grounding chunks (format: "places/ChIJ...")
    placeIds: groundingChunks
      .filter((c: any) => c.maps?.uri?.startsWith('places/'))
      .map((c: any) => ({ title: c.maps?.title || '', placeId: c.maps.uri as string })),
  };

  cache.set(cacheKey, { data: result, ts: Date.now() });
  if (cache.size > 50) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }

  return result;
}

export { RateLimitError };
