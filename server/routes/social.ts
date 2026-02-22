import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { socialPosts } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { requireQuota } from '../middleware/quota.js';
import { logUsage } from '../lib/usage.js';
import { generateJSON } from '../lib/gemini.js';

const router = Router();
router.use(requireAuth);

// ── GET / — List social posts ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const rows = await db.select().from(socialPosts)
      .where(eq(socialPosts.subAccountId, subAccountId))
      .orderBy(desc(socialPosts.createdAt));

    res.json(rows.map(p => ({
      ...p,
      mediaUrls: p.mediaUrls as string[],
      hashtags: p.hashtags as string[],
      metrics: p.metrics as Record<string, number>,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })));
  } catch (err) {
    console.error('[social] List error:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// ── POST / — Create social post ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subAccountId, platform, content, hashtags, mediaUrls, scheduledAt, status } = req.body;
    if (!subAccountId || !platform || !content) {
      res.status(400).json({ error: 'subAccountId, platform, and content are required' });
      return;
    }

    const [created] = await db.insert(socialPosts).values({
      subAccountId,
      platform,
      content,
      hashtags: hashtags || [],
      mediaUrls: mediaUrls || [],
      status: status || (scheduledAt ? 'scheduled' : 'draft'),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    }).returning();

    res.json({
      ...created,
      mediaUrls: created.mediaUrls as string[],
      hashtags: created.hashtags as string[],
      metrics: created.metrics as Record<string, number>,
      scheduledAt: created.scheduledAt?.toISOString() ?? null,
      publishedAt: created.publishedAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[social] Create error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// ── PUT /:id — Update social post ──
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { content, hashtags, mediaUrls, status, scheduledAt } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (content !== undefined) updates.content = content;
    if (hashtags !== undefined) updates.hashtags = hashtags;
    if (mediaUrls !== undefined) updates.mediaUrls = mediaUrls;
    if (status !== undefined) updates.status = status;
    if (scheduledAt !== undefined) updates.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

    const [updated] = await db.update(socialPosts).set(updates)
      .where(eq(socialPosts.id, req.params.id)).returning();

    if (!updated) { res.status(404).json({ error: 'Post not found' }); return; }

    res.json({
      ...updated,
      mediaUrls: updated.mediaUrls as string[],
      hashtags: updated.hashtags as string[],
      metrics: updated.metrics as Record<string, number>,
      scheduledAt: updated.scheduledAt?.toISOString() ?? null,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[social] Update error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// ── DELETE /:id — Delete social post ──
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(socialPosts).where(eq(socialPosts.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('[social] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ── POST /:id/publish — Mark post as published ──
router.post('/:id/publish', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [updated] = await db.update(socialPosts).set({
      status: 'published',
      publishedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(socialPosts.id, req.params.id)).returning();

    if (!updated) { res.status(404).json({ error: 'Post not found' }); return; }

    res.json({
      ...updated,
      mediaUrls: updated.mediaUrls as string[],
      hashtags: updated.hashtags as string[],
      metrics: updated.metrics as Record<string, number>,
      scheduledAt: updated.scheduledAt?.toISOString() ?? null,
      publishedAt: updated.publishedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[social] Publish error:', err);
    res.status(500).json({ error: 'Failed to publish post' });
  }
});

// ── POST /ai-caption — Generate AI caption ──
router.post('/ai-caption', requireQuota('ai_social_caption'), async (req: Request, res: Response) => {
  try {
    const { platform, topic, tone } = req.body;
    if (!topic) { res.status(400).json({ error: 'topic is required' }); return; }

    const systemPrompt = `You are a social media marketing expert. Generate an engaging social media caption optimized for ${platform || 'general social media'}. The tone should be ${tone || 'professional yet approachable'}. Include relevant hashtags. Return JSON with "caption" (string) and "hashtags" (string array, without # prefix).`;

    const result = await generateJSON<{ caption: string; hashtags: string[] }>(
      systemPrompt,
      `Topic/prompt: ${topic}`
    );

    const subAccountId = req.body.subAccountId as string;
    if (subAccountId) logUsage(subAccountId, 'ai_social_caption').catch(console.error);
    res.json(result);
  } catch (err) {
    console.error('[social] AI caption error:', err);
    res.status(500).json({ error: 'Failed to generate caption' });
  }
});

export default router;
