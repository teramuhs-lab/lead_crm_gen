import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { messages } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { sendAndTrackMessage, getProviderStatus } from '../lib/message-sender.js';

const router = Router();
router.use(requireAuth);

// GET /api/messages?contactId=X
router.get('/', async (req: Request, res: Response) => {
  try {
    const contactId = req.query.contactId as string;
    const rows = contactId
      ? await db.select().from(messages).where(eq(messages.contactId, contactId))
      : await db.select().from(messages);

    const result = rows.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/messages/provider-status?subAccountId=X
router.get('/provider-status', async (req: Request, res: Response) => {
  const subAccountId = req.query.subAccountId as string | undefined;
  const status = await getProviderStatus(subAccountId);
  res.json(status);
});

// POST /api/messages
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const result = await sendAndTrackMessage({
      contactId: data.contactId,
      channel: data.channel || 'sms',
      content: data.content || '',
      subject: data.subject,
      subAccountId: data.subAccountId,
    });
    res.json(result);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
