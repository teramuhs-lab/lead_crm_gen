import { Router, Request, Response } from 'express';
import { eq, sql, gte, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { saasPlans, subAccounts, usageLogs } from '../db/schema.js';
import { DEFAULT_QUOTAS } from '../lib/usage.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/saas/plans — list all plans
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(saasPlans);
    const result = rows.map(p => ({
      ...p,
      features: p.features as string[],
      createdAt: p.createdAt.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    console.error('Get SaaS plans error:', err);
    res.status(500).json({ error: 'Failed to fetch SaaS plans' });
  }
});

// POST /api/saas/plans — create plan
router.post('/plans', async (req: Request, res: Response) => {
  try {
    const { name, price, features, isDefault, rebillingMarkup, quotas } = req.body;
    const [plan] = await db.insert(saasPlans).values({
      name,
      price,
      features: features || [],
      isDefault: isDefault ?? false,
      rebillingMarkup: rebillingMarkup ?? 20,
      quotas: quotas ?? {},
    }).returning();

    res.json({
      ...plan,
      features: plan.features as string[],
      createdAt: plan.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('Create SaaS plan error:', err);
    res.status(500).json({ error: 'Failed to create SaaS plan' });
  }
});

// PUT /api/saas/plans/:id — update plan
router.put('/plans/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, price, features, isDefault, rebillingMarkup, stripePriceId, quotas } = req.body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (price !== undefined) updates.price = price;
    if (features !== undefined) updates.features = features;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    if (rebillingMarkup !== undefined) updates.rebillingMarkup = rebillingMarkup;
    if (stripePriceId !== undefined) updates.stripePriceId = stripePriceId;
    if (quotas !== undefined) updates.quotas = quotas;

    const [updated] = await db.update(saasPlans)
      .set(updates)
      .where(eq(saasPlans.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    res.json({
      ...updated,
      features: updated.features as string[],
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('Update SaaS plan error:', err);
    res.status(500).json({ error: 'Failed to update SaaS plan' });
  }
});

// DELETE /api/saas/plans/:id — delete plan
router.delete('/plans/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(saasPlans).where(eq(saasPlans.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete SaaS plan error:', err);
    res.status(500).json({ error: 'Failed to delete SaaS plan' });
  }
});

// GET /api/saas/economics — compute SaaS economics
router.get('/economics', async (_req: Request, res: Response) => {
  try {
    // Count sub-accounts grouped by plan
    const planCounts = await db
      .select({
        plan: subAccounts.plan,
        count: sql<number>`count(*)::int`,
      })
      .from(subAccounts)
      .groupBy(subAccounts.plan);

    // Load all SaaS plans
    const allPlans = await db.select().from(saasPlans);

    // Default price mapping for plan tiers
    const defaultPrices: Record<string, number> = {
      starter: 97,
      pro: 197,
      agency: 297,
    };

    // Build plan breakdown: match sub-account plan tiers to SaaS plan prices
    const planBreakdown: { plan: string; count: number; revenue: number }[] = [];
    let subscriptionRevenue = 0;
    let subAccountCount = 0;

    for (const { plan, count } of planCounts) {
      // Try to find a matching SaaS plan by name similarity (case-insensitive, contains tier name)
      const matchedPlan = allPlans.find(
        p => p.name.toLowerCase().includes(plan.toLowerCase())
      );
      const price = matchedPlan ? matchedPlan.price : (defaultPrices[plan] ?? 0);
      const revenue = price * count;

      planBreakdown.push({ plan, count, revenue });
      subscriptionRevenue += revenue;
      subAccountCount += count;
    }

    // Rebilling margin: estimate as 15% of subscription revenue
    const rebillingMargin = Math.round(subscriptionRevenue * 0.15 * 100) / 100;

    // Platform cost: fixed $497
    const platformCost = 497;

    // Net profit
    const netProfit = subscriptionRevenue + rebillingMargin - platformCost;

    res.json({
      subscriptionRevenue,
      rebillingMargin,
      platformCost,
      netProfit,
      subAccountCount,
      planBreakdown,
    });
  } catch (err) {
    console.error('Get SaaS economics error:', err);
    res.status(500).json({ error: 'Failed to compute SaaS economics' });
  }
});

// GET /api/saas/ai-usage — per-tenant AI usage overview
router.get('/ai-usage', async (_req: Request, res: Response) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Load all sub-accounts
    const allSubAccounts = await db.select().from(subAccounts);

    // For each sub-account, gather usage data
    const tenants: {
      subAccountId: string;
      subAccountName: string;
      plan: string;
      totalAiCalls: number;
      quotaUsedPercent: number;
      topFeature: string;
      callsByType: Record<string, number>;
    }[] = [];

    let totalCallsAllTenants = 0;
    let heaviestUser: { name: string; calls: number } | null = null;

    for (const account of allSubAccounts) {
      // Get usage grouped by type for this sub-account in the current month
      const usageRows = await db
        .select({
          type: usageLogs.type,
          count: sql<number>`count(*)::int`,
        })
        .from(usageLogs)
        .where(
          and(
            eq(usageLogs.subAccountId, account.id),
            gte(usageLogs.createdAt, monthStart),
          ),
        )
        .groupBy(usageLogs.type);

      const callsByType: Record<string, number> = {};
      let totalAiCalls = 0;
      let topFeature = 'N/A';
      let topFeatureCount = 0;

      for (const row of usageRows) {
        callsByType[row.type] = row.count;
        totalAiCalls += row.count;
        if (row.count > topFeatureCount) {
          topFeatureCount = row.count;
          topFeature = row.type;
        }
      }

      // Calculate quota used percent as average across all types
      const planQuotas = DEFAULT_QUOTAS[account.plan] || DEFAULT_QUOTAS.pro;
      let totalPercent = 0;
      let quotaCount = 0;

      for (const [type, limit] of Object.entries(planQuotas)) {
        if (limit === -1) continue; // unlimited
        const used = callsByType[type] ?? 0;
        totalPercent += (used / limit) * 100;
        quotaCount++;
      }

      const quotaUsedPercent = quotaCount > 0
        ? Math.round((totalPercent / quotaCount) * 100) / 100
        : 0;

      tenants.push({
        subAccountId: account.id,
        subAccountName: account.name,
        plan: account.plan,
        totalAiCalls,
        quotaUsedPercent,
        topFeature,
        callsByType,
      });

      totalCallsAllTenants += totalAiCalls;

      if (!heaviestUser || totalAiCalls > heaviestUser.calls) {
        heaviestUser = { name: account.name, calls: totalAiCalls };
      }
    }

    const avgCallsPerTenant = allSubAccounts.length > 0
      ? Math.round((totalCallsAllTenants / allSubAccounts.length) * 100) / 100
      : 0;

    res.json({
      tenants,
      aggregated: {
        totalCallsAllTenants,
        avgCallsPerTenant,
        heaviestUser: heaviestUser && heaviestUser.calls > 0 ? heaviestUser : null,
      },
    });
  } catch (err) {
    console.error('Get SaaS AI usage error:', err);
    res.status(500).json({ error: 'Failed to fetch AI usage data' });
  }
});

export default router;
