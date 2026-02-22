import { Router, Request, Response } from 'express';
import { eq, desc, sql, count, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { affiliates } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ── GET / — List affiliates ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const rows = await db.select().from(affiliates)
      .where(eq(affiliates.subAccountId, subAccountId))
      .orderBy(desc(affiliates.totalEarned));

    res.json(rows.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })));
  } catch (err) {
    console.error('[affiliates] List error:', err);
    res.status(500).json({ error: 'Failed to fetch affiliates' });
  }
});

// ── GET /stats — Aggregate stats ──
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const [row] = await db.select({
      totalAffiliates: count(),
      totalEarned: sql<number>`coalesce(sum(${affiliates.totalEarned}), 0)::int`,
      totalReferrals: sql<number>`coalesce(sum(${affiliates.referrals}), 0)::int`,
    }).from(affiliates).where(eq(affiliates.subAccountId, subAccountId));

    const [pendingRow] = await db.select({
      unpaid: sql<number>`coalesce(sum(${affiliates.totalEarned}), 0)::int`,
    }).from(affiliates).where(
      sql`${affiliates.subAccountId} = ${subAccountId} AND ${affiliates.payoutStatus} = 'pending'`
    );

    res.json({
      totalAffiliates: Number(row?.totalAffiliates) || 0,
      totalEarned: Number(row?.totalEarned) || 0,
      totalReferrals: Number(row?.totalReferrals) || 0,
      unpaidCommissions: Number(pendingRow?.unpaid) || 0,
    });
  } catch (err) {
    console.error('[affiliates] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── POST / — Create affiliate ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subAccountId, name, email, commissionRate } = req.body;
    if (!subAccountId || !name) {
      res.status(400).json({ error: 'subAccountId and name are required' });
      return;
    }

    const [created] = await db.insert(affiliates).values({
      subAccountId,
      name,
      email: email || '',
      commissionRate: commissionRate || 10,
    }).returning();

    res.json({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[affiliates] Create error:', err);
    res.status(500).json({ error: 'Failed to create affiliate' });
  }
});

// ── PUT /:id — Update affiliate ──
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { name, email, commissionRate, totalEarned, referrals, status, payoutStatus } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (commissionRate !== undefined) updates.commissionRate = commissionRate;
    if (totalEarned !== undefined) updates.totalEarned = totalEarned;
    if (referrals !== undefined) updates.referrals = referrals;
    if (status !== undefined) updates.status = status;
    if (payoutStatus !== undefined) updates.payoutStatus = payoutStatus;

    const [updated] = await db.update(affiliates).set(updates)
      .where(eq(affiliates.id, req.params.id)).returning();

    if (!updated) { res.status(404).json({ error: 'Affiliate not found' }); return; }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[affiliates] Update error:', err);
    res.status(500).json({ error: 'Failed to update affiliate' });
  }
});

// ── DELETE /:id — Delete affiliate ──
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(affiliates).where(eq(affiliates.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('[affiliates] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete affiliate' });
  }
});

export default router;
