import { db } from '../db/index.js';
import { usageLogs, searchResults, subAccounts, saasPlans } from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

type UsageType =
  | 'ai_chat' | 'ai_draft_message' | 'ai_contact_insight' | 'ai_suggestions'
  | 'ai_briefing' | 'ai_generate_content' | 'ai_local_seo' | 'ai_market_research'
  | 'ai_proactive_insights' | 'ai_review_reply' | 'ai_social_caption' | 'ai_ad_creative'
  | 'ai_lead_enrichment' | 'ai_voice_call';

const DEFAULT_QUOTAS: Record<string, Record<UsageType, number>> = {
  starter: {
    ai_chat: 50, ai_draft_message: 25, ai_contact_insight: 25, ai_suggestions: 15,
    ai_briefing: 15, ai_generate_content: 25, ai_local_seo: 10, ai_market_research: 10,
    ai_proactive_insights: 10, ai_review_reply: 15, ai_social_caption: 15, ai_ad_creative: 10,
    ai_lead_enrichment: 10, ai_voice_call: 10,
  },
  pro: {
    ai_chat: 200, ai_draft_message: 100, ai_contact_insight: 100, ai_suggestions: 60,
    ai_briefing: 60, ai_generate_content: 100, ai_local_seo: 40, ai_market_research: 40,
    ai_proactive_insights: 40, ai_review_reply: 60, ai_social_caption: 60, ai_ad_creative: 40,
    ai_lead_enrichment: 500, ai_voice_call: 50,
  },
  agency: {
    ai_chat: -1, ai_draft_message: -1, ai_contact_insight: -1, ai_suggestions: -1,
    ai_briefing: -1, ai_generate_content: -1, ai_local_seo: -1, ai_market_research: -1,
    ai_proactive_insights: -1, ai_review_reply: -1, ai_social_caption: -1, ai_ad_creative: -1,
    ai_lead_enrichment: -1, ai_voice_call: -1,
  },
};

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getMonthEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function logUsage(
  subAccountId: string,
  type: UsageType,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.insert(usageLogs).values({
    subAccountId,
    type,
    metadata: metadata || {},
  });
}

export async function getMonthlyUsage(subAccountId: string): Promise<Record<string, number>> {
  const monthStart = getMonthStart();
  const rows = await db
    .select({ type: usageLogs.type, count: sql<number>`count(*)::int` })
    .from(usageLogs)
    .where(and(eq(usageLogs.subAccountId, subAccountId), gte(usageLogs.createdAt, monthStart)))
    .groupBy(usageLogs.type);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.type] = row.count;
  }
  return counts;
}

export async function getQuotaForPlan(plan: string): Promise<Record<string, number>> {
  const plans = await db.select().from(saasPlans).where(eq(saasPlans.isDefault, true)).limit(1);
  if (plans.length > 0) {
    const quotas = plans[0].quotas as Record<string, number> | null;
    if (quotas && Object.keys(quotas).length > 0) return quotas;
  }
  return DEFAULT_QUOTAS[plan] || DEFAULT_QUOTAS.pro;
}

export async function checkQuota(
  subAccountId: string,
  type: UsageType
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const account = await db.select({ plan: subAccounts.plan }).from(subAccounts).where(eq(subAccounts.id, subAccountId)).limit(1);
  const plan = account[0]?.plan || 'pro';

  const quotas = await getQuotaForPlan(plan);
  const limit = quotas[type] ?? DEFAULT_QUOTAS.pro[type] ?? 100;

  if (limit === -1) return { allowed: true, used: 0, limit: -1 };

  const monthStart = getMonthStart();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageLogs)
    .where(and(eq(usageLogs.subAccountId, subAccountId), eq(usageLogs.type, type), gte(usageLogs.createdAt, monthStart)));

  const used = rows[0]?.count || 0;
  return { allowed: used < limit, used, limit };
}

export async function saveSearchResult(
  subAccountId: string,
  searchType: 'local_seo' | 'market_research',
  query: string,
  result: unknown
): Promise<void> {
  await db.insert(searchResults).values({
    subAccountId,
    searchType,
    query,
    result: result as Record<string, unknown>,
  });
}

export async function getLastUsageTimestamp(
  subAccountId: string,
  type: UsageType
): Promise<Date | null> {
  const rows = await db
    .select({ createdAt: usageLogs.createdAt })
    .from(usageLogs)
    .where(and(eq(usageLogs.subAccountId, subAccountId), eq(usageLogs.type, type)))
    .orderBy(desc(usageLogs.createdAt))
    .limit(1);
  return rows[0]?.createdAt || null;
}

export function getMonthPeriod(): { periodStart: string; periodEnd: string } {
  return {
    periodStart: getMonthStart().toISOString(),
    periodEnd: getMonthEnd().toISOString(),
  };
}

export { type UsageType, DEFAULT_QUOTAS };
