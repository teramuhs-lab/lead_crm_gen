import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { subAccounts } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/sub-accounts
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(subAccounts);
    const result = rows.map(s => ({
      ...s,
      twilio: s.twilioConfig as { isVerified?: boolean } | null,
      createdAt: s.createdAt.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    console.error('Get sub-accounts error:', err);
    res.status(500).json({ error: 'Failed to fetch sub-accounts' });
  }
});

// POST /api/sub-accounts
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [sa] = await db.insert(subAccounts).values({
      name: data.name,
      domain: data.domain || '',
      status: data.status || 'active',
      plan: data.plan || 'pro',
      leadValue: data.leadValue || 500,
    }).returning();

    res.json({ ...sa, twilio: null, createdAt: sa.createdAt.toISOString() });
  } catch (err) {
    console.error('Create sub-account error:', err);
    res.status(500).json({ error: 'Failed to create sub-account' });
  }
});

// PUT /api/sub-accounts/:id
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const [updated] = await db.update(subAccounts).set({
      name: data.name,
      domain: data.domain,
      status: data.status,
      plan: data.plan,
      leadValue: data.leadValue,
    }).where(eq(subAccounts.id, id)).returning();

    if (!updated) {
      res.status(404).json({ error: 'Sub-account not found' });
      return;
    }

    res.json({ ...updated, twilio: updated.twilioConfig, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    console.error('Update sub-account error:', err);
    res.status(500).json({ error: 'Failed to update sub-account' });
  }
});

// DELETE /api/sub-accounts/:id
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(subAccounts).where(eq(subAccounts.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete sub-account error:', err);
    res.status(500).json({ error: 'Failed to delete sub-account' });
  }
});

export default router;
