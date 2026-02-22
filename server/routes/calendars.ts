import { Router, Request, Response } from 'express';
import { eq, and, gte, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { calendars, appointments } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/calendars
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(calendars);
    res.json(rows);
  } catch (err) {
    console.error('Get calendars error:', err);
    res.status(500).json({ error: 'Failed to fetch calendars' });
  }
});

// POST /api/calendars
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [calendar] = await db.insert(calendars).values({
      name: data.name,
      subAccountId: data.subAccountId,
      type: data.type || 'personal',
    }).returning();

    res.json(calendar);
  } catch (err) {
    console.error('Create calendar error:', err);
    res.status(500).json({ error: 'Failed to create calendar' });
  }
});

// GET /api/calendars/appointments
router.get('/appointments', async (req: Request, res: Response) => {
  try {
    const { calendarId, weekStart } = req.query as { calendarId?: string; weekStart?: string };

    const conditions = [];

    if (calendarId) {
      conditions.push(eq(appointments.calendarId, calendarId));
    }

    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000);
      conditions.push(gte(appointments.startTime, start));
      conditions.push(lt(appointments.startTime, end));
    }

    const rows = conditions.length > 0
      ? await db.select().from(appointments).where(and(...conditions))
      : await db.select().from(appointments);

    res.json(rows);
  } catch (err) {
    console.error('Get appointments error:', err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// POST /api/calendars/appointments
router.post('/appointments', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const [appointment] = await db.insert(appointments).values({
      calendarId: data.calendarId,
      contactId: data.contactId,
      contactName: data.contactName,
      title: data.title,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      notes: data.notes || '',
    }).returning();

    res.json(appointment);
  } catch (err) {
    console.error('Create appointment error:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT /api/calendars/appointments/:id
router.put('/appointments/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const [updated] = await db.update(appointments).set({
      calendarId: data.calendarId,
      contactId: data.contactId,
      contactName: data.contactName,
      title: data.title,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      status: data.status,
      notes: data.notes,
    }).where(eq(appointments.id, id)).returning();

    if (!updated) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('Update appointment error:', err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// DELETE /api/calendars/appointments/:id
router.delete('/appointments/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(appointments).where(eq(appointments.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete appointment error:', err);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export default router;
