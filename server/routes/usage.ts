import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { usageLogs, searchResults } from '../db/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getMonthlyUsage, getQuotaForPlan, getMonthPeriod, DEFAULT_QUOTAS, type UsageType } from '../lib/usage.js';
import { subAccounts } from '../db/schema.js';

const router = Router();
router.use(requireAuth);

const ALL_TYPES: UsageType[] = [
  'ai_chat', 'ai_draft_message', 'ai_contact_insight', 'ai_suggestions',
  'ai_briefing', 'ai_generate_content', 'ai_local_seo', 'ai_market_research',
  'ai_proactive_insights', 'ai_review_reply', 'ai_social_caption', 'ai_ad_creative',
  'ai_lead_enrichment',
];

// GET /api/usage?subAccountId=X — Usage overview for current month
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    // Get the sub-account's plan
    const account = await db.select({ plan: subAccounts.plan }).from(subAccounts).where(eq(subAccounts.id, subAccountId)).limit(1);
    const plan = account[0]?.plan || 'pro';

    // Get quota limits and current usage
    const quotaLimits = await getQuotaForPlan(plan);
    const usage = await getMonthlyUsage(subAccountId);
    const { periodStart, periodEnd } = getMonthPeriod();

    // Build quota array
    const quotas = ALL_TYPES.map(type => {
      const used = usage[type] || 0;
      const limit = quotaLimits[type] ?? DEFAULT_QUOTAS.pro[type] ?? 100;
      return {
        type,
        used,
        limit,
        percentUsed: limit === -1 ? 0 : Math.round((used / limit) * 100),
      };
    });

    const totalCalls = Object.values(usage).reduce((sum, n) => sum + n, 0);

    res.json({ quotas, totalCalls, periodStart, periodEnd });
  } catch (err) {
    console.error('[usage] overview error:', err);
    res.status(500).json({ error: 'Failed to load usage data' });
  }
});

// GET /api/usage/history?subAccountId=X&type=Y&limit=50 — Recent usage logs
router.get('/history', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const type = req.query.type as string | undefined;
    const limitParam = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const conditions = [eq(usageLogs.subAccountId, subAccountId)];
    if (type) {
      conditions.push(eq(usageLogs.type, type as UsageType));
    }

    const logs = await db
      .select()
      .from(usageLogs)
      .where(and(...conditions))
      .orderBy(desc(usageLogs.createdAt))
      .limit(limitParam);

    res.json(logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })));
  } catch (err) {
    console.error('[usage] history error:', err);
    res.status(500).json({ error: 'Failed to load usage history' });
  }
});

// GET /api/usage/searches?subAccountId=X&limit=20 — Saved search results
router.get('/searches', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const limitParam = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const results = await db
      .select()
      .from(searchResults)
      .where(eq(searchResults.subAccountId, subAccountId))
      .orderBy(desc(searchResults.createdAt))
      .limit(limitParam);

    res.json(results.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    console.error('[usage] searches error:', err);
    res.status(500).json({ error: 'Failed to load search results' });
  }
});

export default router;
