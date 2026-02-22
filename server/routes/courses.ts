import { Router, Request, Response } from 'express';
import { eq, desc, sql, count, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import { courses } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ── GET / — List courses ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const rows = await db.select().from(courses)
      .where(eq(courses.subAccountId, subAccountId))
      .orderBy(desc(courses.createdAt));

    res.json(rows.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })));
  } catch (err) {
    console.error('[courses] List error:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// ── GET /stats — Aggregate stats ──
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const [row] = await db.select({
      totalStudents: sql<number>`coalesce(sum(${courses.studentCount}), 0)::int`,
      totalRevenue: sql<number>`coalesce(sum(${courses.revenue}), 0)::int`,
      totalCourses: count(),
    }).from(courses).where(eq(courses.subAccountId, subAccountId));

    res.json({
      totalStudents: Number(row?.totalStudents) || 0,
      totalRevenue: Number(row?.totalRevenue) || 0,
      totalCourses: Number(row?.totalCourses) || 0,
    });
  } catch (err) {
    console.error('[courses] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── POST / — Create course ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subAccountId, title, description, price, lessonCount, imageUrl } = req.body;
    if (!subAccountId || !title) {
      res.status(400).json({ error: 'subAccountId and title are required' });
      return;
    }

    const [created] = await db.insert(courses).values({
      subAccountId,
      title,
      description: description || '',
      price: price || 0,
      lessonCount: lessonCount || 0,
      imageUrl: imageUrl || null,
    }).returning();

    res.json({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[courses] Create error:', err);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// ── PUT /:id — Update course ──
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { title, description, price, lessonCount, studentCount, revenue, status, imageUrl } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (lessonCount !== undefined) updates.lessonCount = lessonCount;
    if (studentCount !== undefined) updates.studentCount = studentCount;
    if (revenue !== undefined) updates.revenue = revenue;
    if (status !== undefined) updates.status = status;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;

    const [updated] = await db.update(courses).set(updates)
      .where(eq(courses.id, req.params.id)).returning();

    if (!updated) { res.status(404).json({ error: 'Course not found' }); return; }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[courses] Update error:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// ── DELETE /:id — Delete course ──
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(courses).where(eq(courses.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('[courses] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
