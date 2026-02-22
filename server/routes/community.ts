import { Router, Request, Response } from 'express';
import { eq, desc, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { channels, communityMessages } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ═══ Channels ═══

// ── GET /channels — List channels ──
router.get('/channels', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const rows = await db.select().from(channels)
      .where(eq(channels.subAccountId, subAccountId))
      .orderBy(asc(channels.createdAt));

    res.json(rows.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error('[community] List channels error:', err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// ── POST /channels — Create channel ──
router.post('/channels', async (req: Request, res: Response) => {
  try {
    const { subAccountId, name, description } = req.body;
    if (!subAccountId || !name) {
      res.status(400).json({ error: 'subAccountId and name are required' });
      return;
    }

    const [created] = await db.insert(channels).values({
      subAccountId,
      name,
      description: description || '',
    }).returning();

    res.json({ ...created, createdAt: created.createdAt.toISOString() });
  } catch (err) {
    console.error('[community] Create channel error:', err);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// ── DELETE /channels/:id — Delete channel ──
router.delete('/channels/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(communityMessages).where(eq(communityMessages.channelId, req.params.id));
    await db.delete(channels).where(eq(channels.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('[community] Delete channel error:', err);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// ═══ Messages ═══

// ── GET /messages/:channelId — List messages for channel ──
router.get('/messages/:channelId', async (req: Request<{ channelId: string }>, res: Response) => {
  try {
    const rows = await db.select().from(communityMessages)
      .where(eq(communityMessages.channelId, req.params.channelId))
      .orderBy(asc(communityMessages.createdAt));

    res.json(rows.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error('[community] List messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ── POST /messages — Create message ──
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const { channelId, authorName, content } = req.body;
    if (!channelId || !authorName || !content) {
      res.status(400).json({ error: 'channelId, authorName, and content are required' });
      return;
    }

    const [created] = await db.insert(communityMessages).values({
      channelId,
      authorName,
      content,
    }).returning();

    res.json({ ...created, createdAt: created.createdAt.toISOString() });
  } catch (err) {
    console.error('[community] Create message error:', err);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// ── DELETE /messages/:id — Delete message ──
router.delete('/messages/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(communityMessages).where(eq(communityMessages.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('[community] Delete message error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
