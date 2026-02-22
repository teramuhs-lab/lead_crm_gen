import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { chatWidgets } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ── GET / — Get widget config for sub-account ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const [widget] = await db.select().from(chatWidgets)
      .where(eq(chatWidgets.subAccountId, subAccountId))
      .limit(1);

    if (!widget) { res.json(null); return; }

    res.json({
      ...widget,
      createdAt: widget.createdAt.toISOString(),
      updatedAt: widget.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[chat-widgets] Get error:', err);
    res.status(500).json({ error: 'Failed to fetch widget config' });
  }
});

// ── POST / — Create or update widget config (upsert) ──
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subAccountId, name, bubbleColor, greeting, position, autoOpen, mobileOnly } = req.body;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    // Check if widget already exists for this sub-account
    const [existing] = await db.select().from(chatWidgets)
      .where(eq(chatWidgets.subAccountId, subAccountId))
      .limit(1);

    if (existing) {
      // Update existing
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (bubbleColor !== undefined) updates.bubbleColor = bubbleColor;
      if (greeting !== undefined) updates.greeting = greeting;
      if (position !== undefined) updates.position = position;
      if (autoOpen !== undefined) updates.autoOpen = autoOpen;
      if (mobileOnly !== undefined) updates.mobileOnly = mobileOnly;

      const [updated] = await db.update(chatWidgets).set(updates)
        .where(eq(chatWidgets.id, existing.id)).returning();

      res.json({
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      });
    } else {
      // Create new
      const [created] = await db.insert(chatWidgets).values({
        subAccountId,
        name: name || 'Chat Widget',
        bubbleColor: bubbleColor || '#6366f1',
        greeting: greeting || 'Hi! How can we help you today?',
        position: position || 'bottom-right',
        autoOpen: autoOpen || false,
        mobileOnly: mobileOnly || false,
      }).returning();

      res.json({
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
    }
  } catch (err) {
    console.error('[chat-widgets] Upsert error:', err);
    res.status(500).json({ error: 'Failed to save widget config' });
  }
});

// ── GET /embed-code — Generate embed snippet ──
router.get('/embed-code', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) { res.status(400).json({ error: 'subAccountId is required' }); return; }

    const [widget] = await db.select().from(chatWidgets)
      .where(eq(chatWidgets.subAccountId, subAccountId))
      .limit(1);

    const config = widget || { bubbleColor: '#6366f1', greeting: 'Hi! How can we help?', name: 'Chat Widget', position: 'bottom-right', autoOpen: false };

    const code = `<!-- Nexus Chat Widget -->
<script>
  window.NexusChatConfig = {
    accountId: "${subAccountId}",
    color: "${config.bubbleColor}",
    greeting: "${config.greeting}",
    name: "${config.name}",
    position: "${config.position}",
    autoOpen: ${config.autoOpen}
  };
</script>
<script src="/widget/nexus-chat.js" async></script>`;

    res.json({ code });
  } catch (err) {
    console.error('[chat-widgets] Embed code error:', err);
    res.status(500).json({ error: 'Failed to generate embed code' });
  }
});

export default router;
