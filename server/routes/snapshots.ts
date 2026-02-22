import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { snapshots, snapshotDeployments, workflows, workflowSteps, funnels, funnelPages, forms } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/snapshots — list all snapshots ordered by createdAt desc
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(snapshots).orderBy(desc(snapshots.createdAt));

    const result = rows.map(s => ({
      ...s,
      content: s.content as { workflowIds: string[]; funnelIds: string[]; formIds: string[] },
      contentCount: s.contentCount as { workflows: number; funnels: number; forms: number },
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get snapshots error:', err);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

// POST /api/snapshots — create a new snapshot
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, category, description, workflowIds, funnelIds, formIds } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const wfIds: string[] = Array.isArray(workflowIds) ? workflowIds : [];
    const fnIds: string[] = Array.isArray(funnelIds) ? funnelIds : [];
    const fmIds: string[] = Array.isArray(formIds) ? formIds : [];

    const content = { workflowIds: wfIds, funnelIds: fnIds, formIds: fmIds };
    const contentCount = {
      workflows: wfIds.length,
      funnels: fnIds.length,
      forms: fmIds.length,
    };

    const [created] = await db.insert(snapshots).values({
      name: name.trim(),
      category: category || 'General',
      description: description || '',
      content,
      contentCount,
    }).returning();

    res.json({
      ...created,
      content: created.content as typeof content,
      contentCount: created.contentCount as typeof contentCount,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('Create snapshot error:', err);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// PUT /api/snapshots/:id — update snapshot metadata
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, description } = req.body;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;

    const [updated] = await db.update(snapshots)
      .set(updateData)
      .where(eq(snapshots.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Snapshot not found' });
      return;
    }

    res.json({
      ...updated,
      content: updated.content as { workflowIds: string[]; funnelIds: string[]; formIds: string[] },
      contentCount: updated.contentCount as { workflows: number; funnels: number; forms: number },
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('Update snapshot error:', err);
    res.status(500).json({ error: 'Failed to update snapshot' });
  }
});

// DELETE /api/snapshots/:id — delete snapshot and cascade deployments
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    // Cascade delete deployments first (schema has onDelete cascade, but be explicit)
    await db.delete(snapshotDeployments).where(eq(snapshotDeployments.snapshotId, id));
    await db.delete(snapshots).where(eq(snapshots.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('Delete snapshot error:', err);
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
});

// POST /api/snapshots/:id/deploy — deploy snapshot to sub-accounts
router.post('/:id/deploy', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { subAccountIds } = req.body;

    if (!Array.isArray(subAccountIds) || subAccountIds.length === 0) {
      res.status(400).json({ error: 'subAccountIds must be a non-empty array' });
      return;
    }

    // Load the snapshot
    const [snapshot] = await db.select().from(snapshots).where(eq(snapshots.id, id)).limit(1);
    if (!snapshot) {
      res.status(404).json({ error: 'Snapshot not found' });
      return;
    }

    const content = snapshot.content as { workflowIds: string[]; funnelIds: string[]; formIds: string[] };
    const workflowIds: string[] = content.workflowIds || [];
    const funnelIds: string[] = content.funnelIds || [];
    const formIds: string[] = content.formIds || [];

    // Pre-load all source data
    const sourceWorkflows = workflowIds.length > 0
      ? await db.select().from(workflows)
      : [];
    const filteredWorkflows = sourceWorkflows.filter(w => workflowIds.includes(w.id));

    const sourceSteps = workflowIds.length > 0
      ? await db.select().from(workflowSteps)
      : [];

    const sourceFunnels = funnelIds.length > 0
      ? await db.select().from(funnels)
      : [];
    const filteredFunnels = sourceFunnels.filter(f => funnelIds.includes(f.id));

    const sourcePages = funnelIds.length > 0
      ? await db.select().from(funnelPages)
      : [];

    const sourceForms = formIds.length > 0
      ? await db.select().from(forms)
      : [];
    const filteredForms = sourceForms.filter(f => formIds.includes(f.id));

    const deployments: Array<{
      id: string;
      snapshotId: string;
      subAccountId: string;
      status: string;
      details: Record<string, any>;
      deployedAt: string;
    }> = [];

    for (const subAccountId of subAccountIds) {
      let workflowsCopied = 0;
      let funnelsCopied = 0;
      let formsCopied = 0;
      const errors: string[] = [];

      try {
        // Clone workflows
        for (const wf of filteredWorkflows) {
          try {
            const [newWorkflow] = await db.insert(workflows).values({
              name: wf.name,
              trigger: wf.trigger,
              isActive: wf.isActive,
            }).returning();

            // Clone workflow steps
            const wfSteps = sourceSteps
              .filter(s => s.workflowId === wf.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            if (wfSteps.length > 0) {
              await db.insert(workflowSteps).values(
                wfSteps.map(s => ({
                  workflowId: newWorkflow.id,
                  type: s.type,
                  config: s.config || {},
                  sortOrder: s.sortOrder,
                }))
              );
            }

            workflowsCopied++;
          } catch (stepErr) {
            errors.push(`Failed to clone workflow "${wf.name}": ${stepErr instanceof Error ? stepErr.message : String(stepErr)}`);
          }
        }

        // Clone funnels
        for (const fn of filteredFunnels) {
          try {
            const [newFunnel] = await db.insert(funnels).values({
              name: fn.name,
              description: fn.description,
              category: fn.category,
              status: fn.status,
              stats: fn.stats,
              lastPublishedAt: fn.lastPublishedAt,
            }).returning();

            // Clone funnel pages
            const fnPages = sourcePages
              .filter(p => p.funnelId === fn.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            if (fnPages.length > 0) {
              await db.insert(funnelPages).values(
                fnPages.map(p => ({
                  funnelId: newFunnel.id,
                  name: p.name,
                  path: p.path,
                  blocks: p.blocks || [],
                  sortOrder: p.sortOrder,
                }))
              );
            }

            funnelsCopied++;
          } catch (stepErr) {
            errors.push(`Failed to clone funnel "${fn.name}": ${stepErr instanceof Error ? stepErr.message : String(stepErr)}`);
          }
        }

        // Clone forms (scoped to target subAccountId)
        for (const fm of filteredForms) {
          try {
            await db.insert(forms).values({
              subAccountId,
              name: fm.name,
              description: fm.description,
              status: fm.status,
              fields: fm.fields || [],
              settings: fm.settings || {},
            });

            formsCopied++;
          } catch (stepErr) {
            errors.push(`Failed to clone form "${fm.name}": ${stepErr instanceof Error ? stepErr.message : String(stepErr)}`);
          }
        }

        const hasErrors = errors.length > 0;
        const details: Record<string, any> = { workflowsCopied, funnelsCopied, formsCopied };
        if (hasErrors) details.errors = errors;

        const [deployment] = await db.insert(snapshotDeployments).values({
          snapshotId: id,
          subAccountId,
          status: hasErrors ? 'failed' : 'success',
          details,
        }).returning();

        deployments.push({
          ...deployment,
          status: deployment.status,
          details: deployment.details as Record<string, any>,
          deployedAt: deployment.deployedAt.toISOString(),
        });
      } catch (accountErr) {
        // Entire sub-account deployment failed
        const details = {
          workflowsCopied,
          funnelsCopied,
          formsCopied,
          errors: [...errors, `Deployment failed: ${accountErr instanceof Error ? accountErr.message : String(accountErr)}`],
        };

        const [deployment] = await db.insert(snapshotDeployments).values({
          snapshotId: id,
          subAccountId,
          status: 'failed',
          details,
        }).returning();

        deployments.push({
          ...deployment,
          status: deployment.status,
          details: deployment.details as Record<string, any>,
          deployedAt: deployment.deployedAt.toISOString(),
        });
      }
    }

    res.json({ deployments });
  } catch (err) {
    console.error('Deploy snapshot error:', err);
    res.status(500).json({ error: 'Failed to deploy snapshot' });
  }
});

// GET /api/snapshots/:id/deployments — list deployments for a snapshot
router.get('/:id/deployments', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const rows = await db.select()
      .from(snapshotDeployments)
      .where(eq(snapshotDeployments.snapshotId, id))
      .orderBy(desc(snapshotDeployments.deployedAt));

    const result = rows.map(d => ({
      ...d,
      details: d.details as { workflowsCopied: number; funnelsCopied: number; formsCopied: number; errors?: string[] },
      deployedAt: d.deployedAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get snapshot deployments error:', err);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

export default router;
