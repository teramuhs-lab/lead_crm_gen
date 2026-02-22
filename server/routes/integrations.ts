import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { integrations } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ── GET / — List integrations for sub-account ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const rows = await db.select().from(integrations)
      .where(eq(integrations.subAccountId, subAccountId));

    res.json(rows.map(i => ({
      ...i,
      config: i.config as Record<string, any>,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })));
  } catch (err) {
    console.error('[integrations] List error:', err);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// ── POST / — Create or update integration (upsert by name+subAccountId) ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subAccountId, name, type, config, status } = req.body;
    if (!subAccountId || !name || !type) {
      res.status(400).json({ error: 'subAccountId, name, and type are required' });
      return;
    }

    // Check if integration already exists
    const [existing] = await db.select().from(integrations)
      .where(and(eq(integrations.subAccountId, subAccountId), eq(integrations.name, name)))
      .limit(1);

    if (existing) {
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (config !== undefined) updates.config = config;
      if (status !== undefined) updates.status = status;

      const [updated] = await db.update(integrations).set(updates)
        .where(eq(integrations.id, existing.id)).returning();

      res.json({
        ...updated,
        config: updated.config as Record<string, any>,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } else {
      const [created] = await db.insert(integrations).values({
        subAccountId,
        name,
        type,
        config: config || {},
        status: status || 'disconnected',
      }).returning();

      res.json({
        ...created,
        config: created.config as Record<string, any>,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
    }
  } catch (err) {
    console.error('[integrations] Upsert error:', err);
    res.status(500).json({ error: 'Failed to save integration' });
  }
});

// ── DELETE /:id — Remove integration ──
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(integrations).where(eq(integrations.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('[integrations] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

export default router;
