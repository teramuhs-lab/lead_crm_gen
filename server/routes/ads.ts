import { Router, Request, Response } from 'express';
import { eq, desc, sql, and, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { adCampaigns } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { requireQuota } from '../middleware/quota.js';
import { logUsage } from '../lib/usage.js';
import { generateJSON } from '../lib/gemini.js';

const router = Router();
router.use(requireAuth);

// ── GET / — List campaigns ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const rows = await db.select().from(adCampaigns)
      .where(eq(adCampaigns.subAccountId, subAccountId))
      .orderBy(desc(adCampaigns.createdAt));

    res.json(rows.map(c => ({
      ...c,
      adCopy: c.adCopy as Record<string, string>,
      targetingConfig: c.targetingConfig as Record<string, any>,
      startDate: c.startDate?.toISOString() ?? null,
      endDate: c.endDate?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })));
  } catch (err) {
    console.error('[ads] List error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// ── GET /stats — Aggregate stats ──
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const [row] = await db.select({
      totalSpend: sql<number>`coalesce(sum(${adCampaigns.spend}), 0)::int`,
      totalLeads: sql<number>`coalesce(sum(${adCampaigns.leads}), 0)::int`,
      avgRoas: sql<number>`coalesce(avg(${adCampaigns.roas}), 0)::int`,
    }).from(adCampaigns).where(eq(adCampaigns.subAccountId, subAccountId));

    const [activeRow] = await db.select({ count: count() }).from(adCampaigns)
      .where(and(eq(adCampaigns.subAccountId, subAccountId), eq(adCampaigns.status, 'active')));

    res.json({
      totalSpend: row?.totalSpend || 0,
      totalLeads: row?.totalLeads || 0,
      avgRoas: row?.avgRoas || 0,
      activeCampaigns: Number(activeRow?.count) || 0,
    });
  } catch (err) {
    console.error('[ads] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── POST / — Create campaign ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subAccountId, platform, name, budget, startDate, endDate } = req.body;
    if (!subAccountId || !platform || !name) {
      res.status(400).json({ error: 'subAccountId, platform, and name are required' });
      return;
    }

    const [created] = await db.insert(adCampaigns).values({
      subAccountId,
      platform,
      name,
      budget: budget || 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    }).returning();

    res.json({
      ...created,
      adCopy: created.adCopy as Record<string, string>,
      targetingConfig: created.targetingConfig as Record<string, any>,
      startDate: created.startDate?.toISOString() ?? null,
      endDate: created.endDate?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[ads] Create error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// ── PUT /:id — Update campaign ──
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, status, budget, spend, leads, impressions, clicks, roas, adCopy, startDate, endDate } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (budget !== undefined) updates.budget = budget;
    if (spend !== undefined) updates.spend = spend;
    if (leads !== undefined) updates.leads = leads;
    if (impressions !== undefined) updates.impressions = impressions;
    if (clicks !== undefined) updates.clicks = clicks;
    if (roas !== undefined) updates.roas = roas;
    if (adCopy !== undefined) updates.adCopy = adCopy;
    if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;

    const [updated] = await db.update(adCampaigns).set(updates)
      .where(eq(adCampaigns.id, req.params.id)).returning();

    if (!updated) { res.status(404).json({ error: 'Campaign not found' }); return; }

    res.json({
      ...updated,
      adCopy: updated.adCopy as Record<string, string>,
      targetingConfig: updated.targetingConfig as Record<string, any>,
      startDate: updated.startDate?.toISOString() ?? null,
      endDate: updated.endDate?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[ads] Update error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// ── DELETE /:id — Delete campaign ──
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(adCampaigns).where(eq(adCampaigns.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('[ads] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// ── POST /ai-creative — Generate AI ad copy ──
router.post('/ai-creative', requireQuota('ai_ad_creative'), async (req: Request, res: Response) => {
  try {
    const { platform, campaignName, goal } = req.body;

    const systemPrompt = `You are an expert digital advertising copywriter. Generate compelling ad copy for a ${platform || 'digital'} advertising campaign. The copy should be attention-grabbing, concise, and drive action. Return JSON with "headline" (max 30 chars), "description" (max 90 chars), and "callToAction" (max 15 chars).`;

    const userMessage = `Campaign: ${campaignName || 'Marketing Campaign'}\nGoal: ${goal || 'Generate leads and increase brand awareness'}`;

    const result = await generateJSON<{ headline: string; description: string; callToAction: string }>(
      systemPrompt,
      userMessage
    );

    const subAccountId = req.body.subAccountId as string;
    if (subAccountId) logUsage(subAccountId, 'ai_ad_creative').catch(console.error);
    res.json(result);
  } catch (err) {
    console.error('[ads] AI creative error:', err);
    res.status(500).json({ error: 'Failed to generate ad creative' });
  }
});

export default router;
