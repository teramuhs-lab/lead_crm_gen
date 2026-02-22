import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { emailTemplates, contacts } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { sendAndTrackMessage } from '../lib/message-sender.js';

const router = Router();
router.use(requireAuth);

// GET /api/templates?subAccountId=X — list all templates for a sub-account
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      return res.status(400).json({ error: 'subAccountId is required' });
    }

    const rows = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.subAccountId, subAccountId));

    const result = rows.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/templates — create a new template
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, subject, blocks, subAccountId } = req.body;

    if (!name || !subAccountId) {
      return res.status(400).json({ error: 'name and subAccountId are required' });
    }

    const [created] = await db
      .insert(emailTemplates)
      .values({
        name,
        subject: subject || '',
        blocks: blocks || [],
        subAccountId,
      })
      .returning();

    res.json({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/templates/:id — update a template
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, subject, blocks } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (blocks !== undefined) updates.blocks = blocks;

    const [updated] = await db
      .update(emailTemplates)
      .set(updates)
      .where(eq(emailTemplates.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/templates/:id — delete a template
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// POST /api/templates/:id/send — send campaign
router.post('/:id/send', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { subAccountId } = req.body;

    if (!subAccountId) {
      return res.status(400).json({ error: 'subAccountId is required' });
    }

    // Load the template
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Load all contacts for the sub-account
    const contactRows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.subAccountId, subAccountId));

    // Build body from blocks
    const blocks = (template.blocks as Array<{ content?: string }>) || [];
    const body = blocks.map((b) => b.content || '').join('\n');

    // Send to each contact with a non-empty email
    let sentCount = 0;
    for (const contact of contactRows) {
      if (contact.email && contact.email.trim() !== '') {
        await sendAndTrackMessage({
          contactId: contact.id,
          channel: 'email',
          content: body,
          subject: template.subject,
        });
        sentCount++;
      }
    }

    // Update template stats: increment sent count
    const currentStats = (template.stats as { sent: number; opened: number; clicked: number }) || {
      sent: 0,
      opened: 0,
      clicked: 0,
    };

    await db
      .update(emailTemplates)
      .set({
        stats: {
          ...currentStats,
          sent: currentStats.sent + sentCount,
        },
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id));

    res.json({ sent: sentCount });
  } catch (err) {
    console.error('Send campaign error:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

export default router;
