import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { workflows, workflowSteps, workflowLogs } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { executeWorkflow } from '../lib/workflow-engine.js';

const router = Router();
router.use(requireAuth);

// GET /api/workflows
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(workflows);
    const allSteps = await db.select().from(workflowSteps);

    const result = rows.map(w => ({
      ...w,
      steps: allSteps
        .filter(s => s.workflowId === w.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(s => ({ id: s.id, type: s.type, config: s.config })),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get workflows error:', err);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// POST /api/workflows
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, trigger, isActive, steps } = req.body;
    if (!name || !trigger) {
      res.status(400).json({ error: 'name and trigger are required' });
      return;
    }

    const [created] = await db.insert(workflows).values({
      name,
      trigger,
      isActive: isActive ?? false,
    }).returning();

    let createdSteps: any[] = [];
    if (steps && steps.length > 0) {
      createdSteps = await db.insert(workflowSteps).values(
        steps.map((s: any, i: number) => ({
          workflowId: created.id,
          type: s.type,
          config: s.config || {},
          sortOrder: i,
        }))
      ).returning();
    }

    res.status(201).json({
      ...created,
      steps: createdSteps.map(s => ({ id: s.id, type: s.type, config: s.config })),
    });
  } catch (err) {
    console.error('Create workflow error:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// PUT /api/workflows/:id
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const [updated] = await db.update(workflows).set({
      name: data.name,
      trigger: data.trigger,
      isActive: data.isActive,
    }).where(eq(workflows.id, id)).returning();

    if (!updated) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    // Replace steps
    if (data.steps) {
      await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, id));
      if (data.steps.length > 0) {
        await db.insert(workflowSteps).values(
          data.steps.map((s: any, i: number) => ({
            workflowId: id,
            type: s.type,
            config: s.config || {},
            sortOrder: i,
          }))
        );
      }
    }

    res.json({ ...updated, steps: data.steps || [] });
  } catch (err) {
    console.error('Update workflow error:', err);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// POST /api/workflows/:id/run
router.post('/:id/run', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { contactId, contactName } = req.body;

    const [wf] = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
    if (!wf) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    if (!contactId) {
      res.status(400).json({ error: 'contactId is required' });
      return;
    }

    // Execute asynchronously — don't block the HTTP response
    executeWorkflow(id, contactId).catch(err => {
      console.error(`[workflow] Async execution failed for ${id}:`, err);
    });

    // Return immediate acknowledgment
    const [log] = await db.insert(workflowLogs).values({
      contactName: contactName || 'Unknown',
      workflowName: wf.name,
      currentStep: 'Starting...',
      status: 'success',
    }).returning();

    res.json({ ...log, timestamp: log.timestamp.toISOString() });
  } catch (err) {
    console.error('Run workflow error:', err);
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    // Steps cascade-delete via FK constraint
    const [deleted] = await db.delete(workflows).where(eq(workflows.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }
    res.json({ success: true, id });
  } catch (err) {
    console.error('Delete workflow error:', err);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

export default router;
