import { Router, Request, Response } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { forms, formSubmissions, contacts, activities } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { executeWorkflow } from '../lib/workflow-engine.js';

const router = Router();

// ── Public endpoint (no auth) ──────────────────────────────────────────────────
// POST /api/forms/:id/submit — public form submission
router.post('/:id/submit', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { data } = req.body as { data: Record<string, string> };

    // Load the form
    const [form] = await db.select().from(forms).where(eq(forms.id, id)).limit(1);
    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    const settings = form.settings as { workflowId?: string; redirectUrl?: string; notifyEmail?: string };

    // Find or create contact by email
    const emailValue = data?.email || data?.Email || data?.EMAIL || '';
    let contactId: string | undefined;

    if (emailValue) {
      const [existing] = await db.select().from(contacts)
        .where(eq(contacts.email, emailValue))
        .limit(1);

      if (existing) {
        contactId = existing.id;
      } else {
        const nameValue = data?.name || data?.Name || data?.full_name || data?.fullName || 'Anonymous';
        const phoneValue = data?.phone || data?.Phone || data?.phone_number || '';

        const [newContact] = await db.insert(contacts).values({
          subAccountId: form.subAccountId,
          name: nameValue,
          email: emailValue,
          phone: phoneValue,
          source: 'Web Form',
          status: 'Lead',
          tags: [],
          customFields: {},
        }).returning();

        contactId = newContact.id;
      }
    }

    // Insert form submission
    await db.insert(formSubmissions).values({
      formId: id,
      contactId: contactId || null,
      data: data || {},
    });

    // Log activity on the contact
    if (contactId) {
      await db.insert(activities).values({
        contactId,
        type: 'form_submission',
        content: `Submitted form: ${form.name}`,
      });

      await db.update(contacts)
        .set({ lastActivity: 'Just now' })
        .where(eq(contacts.id, contactId));
    }

    // Increment submission count
    await db.update(forms)
      .set({ submissionCount: sql`${forms.submissionCount} + 1` })
      .where(eq(forms.id, id));

    // Fire workflow if configured (fire and forget)
    if (settings?.workflowId && contactId) {
      executeWorkflow(settings.workflowId, contactId).catch(err => {
        console.error(`[forms] Workflow execution failed for form ${id}:`, err);
      });
    }

    res.json({ success: true, contactId: contactId || null });
  } catch (err) {
    console.error('Form submission error:', err);
    res.status(500).json({ error: 'Failed to process form submission' });
  }
});

// ── Authenticated endpoints ────────────────────────────────────────────────────
router.use(requireAuth);

// GET /api/forms?subAccountId=X
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const rows = await db.select().from(forms)
      .where(eq(forms.subAccountId, subAccountId))
      .orderBy(desc(forms.createdAt));

    const result = rows.map(f => ({
      ...f,
      fields: f.fields as any[],
      settings: f.settings as Record<string, any>,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get forms error:', err);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// POST /api/forms
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const [form] = await db.insert(forms).values({
      name: data.name || 'Untitled Form',
      subAccountId: data.subAccountId,
      fields: data.fields || [],
      settings: data.settings || {},
      description: data.description || '',
    }).returning();

    res.json({
      ...form,
      fields: form.fields as any[],
      settings: form.settings as Record<string, any>,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('Create form error:', err);
    res.status(500).json({ error: 'Failed to create form' });
  }
});

// PUT /api/forms/:id
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const [updated] = await db.update(forms).set({
      name: data.name,
      fields: data.fields,
      settings: data.settings,
      status: data.status,
      description: data.description,
      updatedAt: new Date(),
    }).where(eq(forms.id, id)).returning();

    if (!updated) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    res.json({
      ...updated,
      fields: updated.fields as any[],
      settings: updated.settings as Record<string, any>,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('Update form error:', err);
    res.status(500).json({ error: 'Failed to update form' });
  }
});

// DELETE /api/forms/:id
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(forms).where(eq(forms.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete form error:', err);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

// GET /api/forms/:id/submissions?page=1&limit=20
router.get('/:id/submissions', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(formSubmissions)
      .where(eq(formSubmissions.formId, id));

    const total = countResult?.count || 0;

    const rows = await db.select().from(formSubmissions)
      .where(eq(formSubmissions.formId, id))
      .orderBy(desc(formSubmissions.createdAt))
      .limit(limit)
      .offset(offset);

    const submissions = rows.map(s => ({
      ...s,
      data: s.data as Record<string, string>,
      createdAt: s.createdAt.toISOString(),
    }));

    res.json({ submissions, total, page, limit });
  } catch (err) {
    console.error('Get submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

export default router;
