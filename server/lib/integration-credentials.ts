import { db } from '../db/index.js';
import { integrations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface ResendCredentials {
  apiKey: string;
}

/**
 * Fetch Twilio credentials from the integrations table for a given sub-account.
 * Returns null if not found or not connected.
 */
export async function getTwilioCredentials(subAccountId: string): Promise<TwilioCredentials | null> {
  try {
    const [row] = await db.select().from(integrations)
      .where(and(
        eq(integrations.subAccountId, subAccountId),
        eq(integrations.name, 'Twilio'),
        eq(integrations.status, 'connected'),
      ))
      .limit(1);

    if (!row) return null;
    const config = row.config as Record<string, string>;
    if (!config.accountSid || !config.authToken || !config.phoneNumber) return null;

    return {
      accountSid: config.accountSid,
      authToken: config.authToken,
      phoneNumber: config.phoneNumber,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch Resend credentials from the integrations table for a given sub-account.
 * Returns null if not found or not connected.
 */
export async function getResendCredentials(subAccountId: string): Promise<ResendCredentials | null> {
  try {
    const [row] = await db.select().from(integrations)
      .where(and(
        eq(integrations.subAccountId, subAccountId),
        eq(integrations.name, 'Resend'),
        eq(integrations.status, 'connected'),
      ))
      .limit(1);

    if (!row) return null;
    const config = row.config as Record<string, string>;
    if (!config.apiKey) return null;

    return { apiKey: config.apiKey };
  } catch {
    return null;
  }
}

export interface GoogleAICredentials {
  apiKey: string;
}

/**
 * Fetch Google AI (Gemini) credentials from the integrations table.
 * Returns null if not found or not connected.
 */
export async function getGoogleAICredentials(subAccountId: string): Promise<GoogleAICredentials | null> {
  try {
    const [row] = await db.select().from(integrations)
      .where(and(
        eq(integrations.subAccountId, subAccountId),
        eq(integrations.name, 'Google AI'),
        eq(integrations.status, 'connected'),
      ))
      .limit(1);

    if (!row) return null;
    const config = row.config as Record<string, string>;
    if (!config.apiKey) return null;

    return { apiKey: config.apiKey };
  } catch {
    return null;
  }
}

/**
 * Resolve the Gemini API key: env var first, then DB integration.
 */
export async function resolveGeminiApiKey(subAccountId?: string): Promise<string | null> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (!subAccountId) return null;
  const creds = await getGoogleAICredentials(subAccountId);
  return creds?.apiKey || null;
}
