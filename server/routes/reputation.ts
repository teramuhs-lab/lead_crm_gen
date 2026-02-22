import { Router, Request, Response } from 'express';
import { eq, desc, and, sql, count, avg } from 'drizzle-orm';
import { db } from '../db/index.js';
import { reviews } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { requireQuota } from '../middleware/quota.js';
import { logUsage } from '../lib/usage.js';
import { generateJSON } from '../lib/gemini.js';

const router = Router();
router.use(requireAuth);

// ── GET / — List reviews ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const rows = await db.select().from(reviews)
      .where(eq(reviews.subAccountId, subAccountId))
      .orderBy(desc(reviews.reviewDate));

    res.json(rows.map(r => ({
      ...r,
      reviewDate: r.reviewDate.toISOString(),
      respondedAt: r.respondedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error('[reputation] List error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ── GET /stats — Aggregate stats ──
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const [statsRow] = await db.select({
      totalReviews: count(),
      avgRating: avg(reviews.rating),
    }).from(reviews).where(eq(reviews.subAccountId, subAccountId));

    const [positiveRow] = await db.select({
      count: count(),
    }).from(reviews).where(
      and(eq(reviews.subAccountId, subAccountId), sql`${reviews.rating} >= 4`)
    );

    const [respondedRow] = await db.select({
      count: count(),
    }).from(reviews).where(
      and(eq(reviews.subAccountId, subAccountId), eq(reviews.status, 'responded'))
    );

    const total = Number(statsRow?.totalReviews) || 0;
    const positiveCount = Number(positiveRow?.count) || 0;
    const respondedCount = Number(respondedRow?.count) || 0;

    res.json({
      avgRating: statsRow?.avgRating ? parseFloat(String(statsRow.avgRating)).toFixed(1) : '0.0',
      totalReviews: total,
      positivePercent: total > 0 ? Math.round((positiveCount / total) * 100) : 0,
      responseRate: total > 0 ? Math.round((respondedCount / total) * 100) : 0,
    });
  } catch (err) {
    console.error('[reputation] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── POST / — Create review ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subAccountId, platform, author, rating, content, externalUrl } = req.body;
    if (!subAccountId || !author || !platform) {
      res.status(400).json({ error: 'subAccountId, author, and platform are required' });
      return;
    }

    const [created] = await db.insert(reviews).values({
      subAccountId,
      platform,
      author,
      rating: Math.min(5, Math.max(1, rating || 5)),
      content: content || '',
      externalUrl: externalUrl || null,
    }).returning();

    res.json({
      ...created,
      reviewDate: created.reviewDate.toISOString(),
      respondedAt: null,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[reputation] Create error:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// ── PUT /:id — Update review ──
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { response, status, content } = req.body;
    const updates: Record<string, any> = {};
    if (response !== undefined) updates.response = response;
    if (status !== undefined) updates.status = status;
    if (content !== undefined) updates.content = content;
    if (status === 'responded' || response) updates.respondedAt = new Date();

    const [updated] = await db.update(reviews).set(updates)
      .where(eq(reviews.id, req.params.id)).returning();

    if (!updated) { res.status(404).json({ error: 'Review not found' }); return; }

    res.json({
      ...updated,
      reviewDate: updated.reviewDate.toISOString(),
      respondedAt: updated.respondedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[reputation] Update error:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// ── DELETE /:id — Delete review ──
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(reviews).where(eq(reviews.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('[reputation] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// ── POST /:id/ai-reply — Generate AI reply ──
router.post('/:id/ai-reply', requireQuota('ai_review_reply'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, req.params.id)).limit(1);
    if (!review) { res.status(404).json({ error: 'Review not found' }); return; }

    const systemPrompt = `You are a professional business reputation manager. Write a polite, empathetic, and professional public reply to a customer review. Keep it concise (2-4 sentences). Be genuine and address the specific feedback. Return JSON with a single "response" field.`;

    const userMessage = `Platform: ${review.platform}\nRating: ${review.rating}/5\nReview: "${review.content}"`;

    const result = await generateJSON<{ response: string }>(systemPrompt, userMessage);

    const [updated] = await db.update(reviews).set({
      response: result.response,
      status: 'responded',
      respondedAt: new Date(),
    }).where(eq(reviews.id, req.params.id)).returning();

    const subAccountId = (req.body.subAccountId || review.subAccountId) as string;
    if (subAccountId) logUsage(subAccountId, 'ai_review_reply').catch(console.error);
    res.json({
      ...updated,
      reviewDate: updated.reviewDate.toISOString(),
      respondedAt: updated.respondedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[reputation] AI reply error:', err);
    res.status(500).json({ error: 'Failed to generate AI reply' });
  }
});

export default router;
