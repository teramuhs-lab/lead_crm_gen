import { Router, Request, Response } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { callLogs, contacts } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { initiateCall, isVoiceConfigured } from '../lib/voice.js';

const router = Router();

// ── GET /api/phone/logs ──
// Lists call logs for a sub-account, ordered by most recent first.
router.get('/logs', requireAuth, async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const rows = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.subAccountId, subAccountId))
      .orderBy(desc(callLogs.startedAt))
      .limit(100);

    const result = rows.map((log) => ({
      ...log,
      startedAt: log.startedAt.toISOString(),
      endedAt: log.endedAt?.toISOString() ?? null,
    }));

    res.json(result);
  } catch (err) {
    console.error('[phone] Get call logs error:', err);
    res.status(500).json({ error: 'Failed to fetch call logs' });
  }
});

// ── POST /api/phone/call ──
// Initiates an outbound call to a contact via Twilio.
router.post('/call', requireAuth, async (req: Request, res: Response) => {
  try {
    const { contactId, subAccountId } = req.body as {
      contactId: string;
      subAccountId: string;
    };

    if (!contactId || !subAccountId) {
      res.status(400).json({ error: 'contactId and subAccountId are required' });
      return;
    }

    // Look up the contact to get their phone number and name
    const [contact] = await db
      .select({ id: contacts.id, phone: contacts.phone, name: contacts.name })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    if (!contact.phone) {
      res.status(400).json({ error: 'Contact has no phone number' });
      return;
    }

    // Initiate the call via Twilio
    const callResult = await initiateCall({ to: contact.phone });

    if (!callResult.success) {
      res.status(502).json({ error: callResult.error || 'Failed to initiate call' });
      return;
    }

    // Create a call log entry
    const [logEntry] = await db
      .insert(callLogs)
      .values({
        subAccountId,
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        direction: 'outbound',
        status: 'initiated',
        twilioCallSid: callResult.callSid || null,
      })
      .returning();

    res.json({
      ...logEntry,
      startedAt: logEntry.startedAt.toISOString(),
      endedAt: logEntry.endedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('[phone] Initiate call error:', err);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// ── PUT /api/phone/logs/:id ──
// Updates a call log entry (notes, status).
router.put('/logs/:id', requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, status } = req.body as {
      notes?: string;
      status?: string;
    };

    const updates: Record<string, any> = {};
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const [updated] = await db
      .update(callLogs)
      .set(updates)
      .where(eq(callLogs.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Call log not found' });
      return;
    }

    res.json({
      ...updated,
      startedAt: updated.startedAt.toISOString(),
      endedAt: updated.endedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('[phone] Update call log error:', err);
    res.status(500).json({ error: 'Failed to update call log' });
  }
});

// ── GET /api/phone/status ──
// Returns Twilio voice configuration status.
router.get('/status', requireAuth, async (_req: Request, res: Response) => {
  res.json({
    configured: isVoiceConfigured(),
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || null,
  });
});

// ── POST /api/phone/status-callback ──
// Twilio voice status callback webhook. No authentication required — Twilio posts here.
router.post('/status-callback', async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body as {
      CallSid?: string;
      CallStatus?: string;
      CallDuration?: string;
      RecordingUrl?: string;
    };

    if (!CallSid || !CallStatus) {
      res.status(200).send('OK');
      return;
    }

    // Map Twilio call statuses to our internal status enum
    const statusMap: Record<string, 'completed' | 'missed' | 'failed'> = {
      completed: 'completed',
      'no-answer': 'missed',
      busy: 'missed',
      failed: 'failed',
    };

    const mappedStatus = statusMap[CallStatus];
    if (!mappedStatus) {
      // Unknown or intermediate status (e.g. 'ringing', 'in-progress') — acknowledge without updating
      res.status(200).send('OK');
      return;
    }

    const updates: Record<string, any> = {
      status: mappedStatus,
    };

    if (CallDuration) {
      updates.duration = parseInt(CallDuration, 10) || 0;
    }

    if (RecordingUrl) {
      updates.recordingUrl = RecordingUrl;
    }

    if (mappedStatus === 'completed' || mappedStatus === 'missed' || mappedStatus === 'failed') {
      updates.endedAt = new Date();
    }

    await db
      .update(callLogs)
      .set(updates)
      .where(eq(callLogs.twilioCallSid, CallSid));

    res.status(200).send('OK');
  } catch (err) {
    console.error('[phone] Twilio status callback error:', err);
    // Always return 200 so Twilio does not retry
    res.status(200).send('OK');
  }
});

export default router;
