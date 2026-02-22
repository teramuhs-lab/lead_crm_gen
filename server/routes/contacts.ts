import { Router, Request, Response } from 'express';
import { eq, inArray, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contacts, activities, tasks, subAccounts } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateInitialScore } from '../lib/lead-scoring.js';

const router = Router();
router.use(requireAuth);

// GET /api/contacts?subAccountId=X
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const rows = await db.select().from(contacts)
      .where(eq(contacts.subAccountId, subAccountId));

    // Assemble activities and tasks for each contact
    const contactIds = rows.map(c => c.id);
    const [allActivities, allTasks] = await Promise.all([
      contactIds.length > 0
        ? db.select().from(activities).where(inArray(activities.contactId, contactIds))
        : [],
      contactIds.length > 0
        ? db.select().from(tasks).where(inArray(tasks.contactId, contactIds))
        : [],
    ]);

    const result = rows.map(c => ({
      ...c,
      tags: c.tags as string[],
      customFields: c.customFields as Record<string, any>,
      activities: allActivities
        .filter(a => a.contactId === c.id)
        .map(a => ({ id: a.id, type: a.type, content: a.content, timestamp: a.timestamp.toISOString() })),
      tasks: allTasks
        .filter(t => t.contactId === c.id)
        .map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate.toISOString(), status: t.status })),
      createdAt: c.createdAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get contacts error:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// POST /api/contacts
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Resolve subAccountId — fall back to first account if missing/empty
    let subAccountId = data.subAccountId;
    if (!subAccountId) {
      const [first] = await db.select({ id: subAccounts.id }).from(subAccounts).limit(1);
      if (!first) {
        res.status(400).json({ error: 'No sub-account found. Create one first.' });
        return;
      }
      subAccountId = first.id;
    }

    // Duplicate check: skip if same name + phone already exists for this sub-account
    const name = data.name || 'Anonymous';
    const phone = data.phone || '';
    if (name !== 'Anonymous' && phone) {
      const [existing] = await db.select({ id: contacts.id }).from(contacts)
        .where(and(eq(contacts.subAccountId, subAccountId), eq(contacts.name, name), eq(contacts.phone, phone)))
        .limit(1);
      if (existing) {
        // Return existing contact instead of creating duplicate
        const [full] = await db.select().from(contacts).where(eq(contacts.id, existing.id)).limit(1);
        res.json({ ...full, tags: full.tags as string[], customFields: full.customFields as Record<string, any>, activities: [], tasks: [], createdAt: full.createdAt.toISOString(), duplicate: true });
        return;
      }
    }

    const [contact] = await db.insert(contacts).values({
      subAccountId,
      name,
      email: data.email || '',
      phone,
      status: data.status || 'Lead',
      source: data.source || 'Direct',
      tags: data.tags || [],
      leadScore: data.leadScore ?? calculateInitialScore({ email: data.email, phone: data.phone, customFields: data.customFields }),
      customFields: data.customFields || {},
    }).returning();

    res.json({ ...contact, tags: contact.tags as string[], customFields: contact.customFields as Record<string, any>, activities: [], tasks: [], createdAt: contact.createdAt.toISOString() });
  } catch (err) {
    console.error('Create contact error:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// PUT /api/contacts/:id
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const [updated] = await db.update(contacts)
      .set({
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        source: data.source,
        tags: data.tags,
        leadScore: data.leadScore,
        isArchived: data.isArchived,
        customFields: data.customFields,
        lastActivity: data.lastActivity,
      })
      .where(eq(contacts.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json({ ...updated, tags: updated.tags as string[], customFields: updated.customFields as Record<string, any>, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    console.error('Update contact error:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// POST /api/contacts/bulk/tag
router.post('/bulk/tag', async (req: Request, res: Response) => {
  try {
    const { ids, tag } = req.body;
    for (const id of ids) {
      const [c] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
      if (c) {
        const currentTags = (c.tags as string[]) || [];
        if (!currentTags.includes(tag)) {
          await db.update(contacts).set({ tags: [...currentTags, tag] }).where(eq(contacts.id, id));
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Bulk tag error:', err);
    res.status(500).json({ error: 'Failed to bulk tag' });
  }
});

// POST /api/contacts/bulk/status
router.post('/bulk/status', async (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;
    if (ids.length > 0) {
      await db.update(contacts).set({ status }).where(inArray(contacts.id, ids));
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Bulk status error:', err);
    res.status(500).json({ error: 'Failed to bulk update status' });
  }
});

// POST /api/contacts/bulk/delete
router.post('/bulk/delete', async (req: Request, res: Response) => {
  try {
    const { ids, hard } = req.body;
    if (hard) {
      await db.delete(contacts).where(inArray(contacts.id, ids));
    } else {
      await db.update(contacts).set({ isArchived: true }).where(inArray(contacts.id, ids));
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: 'Failed to delete contacts' });
  }
});

// POST /api/contacts/bulk/restore
router.post('/bulk/restore', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    await db.update(contacts).set({ isArchived: false }).where(inArray(contacts.id, ids));
    res.json({ success: true });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: 'Failed to restore contacts' });
  }
});

// POST /api/contacts/:id/activities
router.post('/:id/activities', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const [activity] = await db.insert(activities).values({
      contactId: id,
      type: data.type || 'note',
      content: data.content || '',
    }).returning();

    await db.update(contacts).set({ lastActivity: 'Just now' }).where(eq(contacts.id, id));
    res.json({ id: activity.id, type: activity.type, content: activity.content, timestamp: activity.timestamp.toISOString() });
  } catch (err) {
    console.error('Log activity error:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// POST /api/contacts/:id/tasks
router.post('/:id/tasks', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const [task] = await db.insert(tasks).values({
      contactId: id,
      title: data.title || 'Untitled Task',
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
    }).returning();

    res.json({ id: task.id, title: task.title, dueDate: task.dueDate.toISOString(), status: task.status });
  } catch (err) {
    console.error('Add task error:', err);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// PATCH /api/contacts/:cid/tasks/:tid
router.patch('/:cid/tasks/:tid', async (req: Request<{ cid: string; tid: string }>, res: Response) => {
  try {
    const { tid } = req.params;
    const [task] = await db.select().from(tasks).where(eq(tasks.id, tid)).limit(1);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    await db.update(tasks).set({ status: newStatus }).where(eq(tasks.id, tid));
    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('Toggle task error:', err);
    res.status(500).json({ error: 'Failed to toggle task' });
  }
});

export default router;
