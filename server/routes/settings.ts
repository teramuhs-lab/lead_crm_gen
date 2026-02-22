import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agencySettings, customFieldDefinitions, smartLists, workflowLogs } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/settings
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(agencySettings).limit(1);
    if (rows.length === 0) {
      res.json({ platformName: 'Nexus CRM', logoUrl: '', primaryColor: '#6366f1', customDomain: '' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const existing = await db.select().from(agencySettings).limit(1);

    if (existing.length === 0) {
      const [created] = await db.insert(agencySettings).values({
        platformName: data.platformName,
        logoUrl: data.logoUrl || '',
        primaryColor: data.primaryColor || '#6366f1',
        customDomain: data.customDomain || '',
      }).returning();
      res.json(created);
    } else {
      const [updated] = await db.update(agencySettings).set({
        platformName: data.platformName,
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
        customDomain: data.customDomain,
      }).where(eq(agencySettings.id, existing[0].id)).returning();
      res.json(updated);
    }
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /api/field-definitions?subAccountId=X
router.get('/field-definitions', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    const rows = subAccountId
      ? await db.select().from(customFieldDefinitions).where(eq(customFieldDefinitions.subAccountId, subAccountId))
      : await db.select().from(customFieldDefinitions);
    res.json(rows);
  } catch (err) {
    console.error('Get field definitions error:', err);
    res.status(500).json({ error: 'Failed to fetch field definitions' });
  }
});

// POST /api/field-definitions
router.post('/field-definitions', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [fd] = await db.insert(customFieldDefinitions).values({
      label: data.label,
      type: data.type,
      options: data.options,
      subAccountId: data.subAccountId,
    }).returning();
    res.json(fd);
  } catch (err) {
    console.error('Create field definition error:', err);
    res.status(500).json({ error: 'Failed to create field definition' });
  }
});

// DELETE /api/field-definitions/:id
router.delete('/field-definitions/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete field definition error:', err);
    res.status(500).json({ error: 'Failed to delete field definition' });
  }
});

// GET /api/smart-lists
router.get('/smart-lists', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(smartLists);
    res.json(rows.map(s => ({ ...s, conditions: s.conditions as any[] })));
  } catch (err) {
    console.error('Get smart lists error:', err);
    res.status(500).json({ error: 'Failed to fetch smart lists' });
  }
});

// GET /api/workflow-logs
router.get('/workflow-logs', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(workflowLogs);
    res.json(rows.map(l => ({ ...l, timestamp: l.timestamp.toISOString() })));
  } catch (err) {
    console.error('Get workflow logs error:', err);
    res.status(500).json({ error: 'Failed to fetch workflow logs' });
  }
});

export default router;
