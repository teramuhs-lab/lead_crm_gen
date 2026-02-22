import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { emailSequences, sequenceEmails, sequenceEnrollments, contacts, activities } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { requireQuota } from '../middleware/quota.js';
import { generateJSON, RateLimitError } from '../lib/gemini.js';
import { logUsage } from '../lib/usage.js';

const router = Router();
router.use(requireAuth);

// Helper: serialize timestamps
function serializeTimestamps(row: any) {
  return {
    ...row,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    nextSendAt: row.nextSendAt?.toISOString?.() ?? row.nextSendAt ?? null,
    lastSentAt: row.lastSentAt?.toISOString?.() ?? row.lastSentAt ?? null,
  };
}

// GET /api/sequences?subAccountId=X — list all sequences with emails
router.get('/', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    const rows = await db.select().from(emailSequences)
      .where(eq(emailSequences.subAccountId, subAccountId));

    const result = await Promise.all(rows.map(async (seq) => {
      const emails = await db.select().from(sequenceEmails)
        .where(eq(sequenceEmails.sequenceId, seq.id))
        .orderBy(sequenceEmails.sortOrder);
      return {
        ...serializeTimestamps(seq),
        emails: emails.map(serializeTimestamps),
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Get sequences error:', err);
    res.status(500).json({ error: 'Failed to fetch sequences' });
  }
});

// POST /api/sequences — create a new sequence with 3 empty emails
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subAccountId, name } = req.body;
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    const [seq] = await db.insert(emailSequences).values({
      subAccountId,
      name: name || 'Default Sequence',
      emailCount: 3,
    }).returning();

    const labels = ['Initial', 'Follow-up', 'Final'];
    const delays = [0, 1440, 2880];
    for (let i = 0; i < 3; i++) {
      await db.insert(sequenceEmails).values({
        sequenceId: seq.id,
        sortOrder: i,
        label: labels[i],
        delayMinutes: delays[i],
      });
    }

    const emails = await db.select().from(sequenceEmails)
      .where(eq(sequenceEmails.sequenceId, seq.id))
      .orderBy(sequenceEmails.sortOrder);

    res.json({
      ...serializeTimestamps(seq),
      emails: emails.map(serializeTimestamps),
    });
  } catch (err) {
    console.error('Create sequence error:', err);
    res.status(500).json({ error: 'Failed to create sequence' });
  }
});

// GET /api/sequences/contact/:contactId — get enrollments for a contact
router.get('/contact/:contactId', async (req: Request<{ contactId: string }>, res: Response) => {
  try {
    const { contactId } = req.params;

    const enrollments = await db.select().from(sequenceEnrollments)
      .where(eq(sequenceEnrollments.contactId, contactId));

    const result = await Promise.all(enrollments.map(async (enrollment) => {
      const [seq] = await db.select().from(emailSequences)
        .where(eq(emailSequences.id, enrollment.sequenceId)).limit(1);

      let emails: any[] = [];
      if (seq) {
        emails = await db.select().from(sequenceEmails)
          .where(eq(sequenceEmails.sequenceId, seq.id))
          .orderBy(sequenceEmails.sortOrder);
      }

      return {
        ...serializeTimestamps(enrollment),
        sequence: seq ? {
          ...serializeTimestamps(seq),
          emails: emails.map(serializeTimestamps),
        } : null,
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Get contact enrollments error:', err);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

// GET /api/sequences/:id — get one sequence with emails
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    const [seq] = await db.select().from(emailSequences)
      .where(eq(emailSequences.id, id)).limit(1);
    if (!seq) return res.status(404).json({ error: 'Sequence not found' });

    const emails = await db.select().from(sequenceEmails)
      .where(eq(sequenceEmails.sequenceId, id))
      .orderBy(sequenceEmails.sortOrder);

    res.json({
      ...serializeTimestamps(seq),
      emails: emails.map(serializeTimestamps),
    });
  } catch (err) {
    console.error('Get sequence error:', err);
    res.status(500).json({ error: 'Failed to fetch sequence' });
  }
});

// PUT /api/sequences/:id — update sequence name/status
router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;

    const [updated] = await db.update(emailSequences)
      .set(updates)
      .where(eq(emailSequences.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Sequence not found' });

    res.json(serializeTimestamps(updated));
  } catch (err) {
    console.error('Update sequence error:', err);
    res.status(500).json({ error: 'Failed to update sequence' });
  }
});

// DELETE /api/sequences/:id — delete sequence (cascade)
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await db.delete(emailSequences).where(eq(emailSequences.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete sequence error:', err);
    res.status(500).json({ error: 'Failed to delete sequence' });
  }
});

// PUT /api/sequences/:id/emails/:emailId — update a single sequence email
router.put('/:id/emails/:emailId', async (req: Request<{ id: string; emailId: string }>, res: Response) => {
  try {
    const { emailId } = req.params;
    const { subject, body, label, delayMinutes, channel } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (subject !== undefined) updates.subject = subject;
    if (body !== undefined) updates.body = body;
    if (label !== undefined) updates.label = label;
    if (delayMinutes !== undefined) updates.delayMinutes = delayMinutes;
    if (channel !== undefined && (channel === 'email' || channel === 'sms')) updates.channel = channel;

    const [updated] = await db.update(sequenceEmails)
      .set(updates)
      .where(eq(sequenceEmails.id, emailId))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Email not found' });

    res.json(serializeTimestamps(updated));
  } catch (err) {
    console.error('Update sequence email error:', err);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// POST /api/sequences/:id/enroll — enroll a contact in a sequence
router.post('/:id/enroll', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const sequenceId = req.params.id;
    const { contactId } = req.body;
    if (!contactId) return res.status(400).json({ error: 'contactId is required' });

    // Check for existing active enrollment
    const existing = await db.select().from(sequenceEnrollments)
      .where(and(
        eq(sequenceEnrollments.sequenceId, sequenceId),
        eq(sequenceEnrollments.contactId, contactId),
        eq(sequenceEnrollments.status, 'active'),
      )).limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Contact already enrolled in this sequence' });
    }

    // Get first email's delay
    const emails = await db.select().from(sequenceEmails)
      .where(eq(sequenceEmails.sequenceId, sequenceId))
      .orderBy(sequenceEmails.sortOrder);

    if (emails.length === 0) {
      return res.status(400).json({ error: 'Sequence has no emails' });
    }

    // Validate contact has a delivery address for the sequence channel
    const [contact] = await db.select().from(contacts)
      .where(eq(contacts.id, contactId)).limit(1);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const firstChannel = emails[0].channel || 'email';
    const hasDeliveryAddress = firstChannel === 'email' ? !!contact.email : !!contact.phone;

    if (!hasDeliveryAddress) {
      const addressType = firstChannel === 'email' ? 'email address' : 'phone number';
      return res.status(400).json({
        error: `Contact is missing a ${addressType} required for this sequence`,
        code: 'no_delivery_address',
      });
    }

    const firstDelay = emails[0].delayMinutes || 0;
    const nextSendAt = new Date(Date.now() + firstDelay * 60_000);

    const [enrollment] = await db.insert(sequenceEnrollments).values({
      sequenceId,
      contactId,
      currentEmailIndex: 0,
      status: 'active',
      nextSendAt,
    }).returning();

    // Log activity
    await db.insert(activities).values({
      contactId,
      type: 'email',
      content: 'Enrolled in email sequence',
    });

    res.json(serializeTimestamps(enrollment));
  } catch (err) {
    console.error('Enroll contact error:', err);
    res.status(500).json({ error: 'Failed to enroll contact' });
  }
});

// DELETE /api/sequences/:id/enrollments/:enrollmentId — unenroll a contact
router.delete('/:id/enrollments/:enrollmentId', async (req: Request<{ id: string; enrollmentId: string }>, res: Response) => {
  try {
    const [updated] = await db.update(sequenceEnrollments)
      .set({ status: 'unenrolled', updatedAt: new Date() })
      .where(eq(sequenceEnrollments.id, req.params.enrollmentId))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Enrollment not found' });

    res.json(serializeTimestamps(updated));
  } catch (err) {
    console.error('Unenroll error:', err);
    res.status(500).json({ error: 'Failed to unenroll contact' });
  }
});

// POST /api/sequences/:id/generate — AI-generate all 3 emails
router.post('/:id/generate', requireQuota('ai_generate_content'), async (req: Request<{ id: string }>, res: Response) => {
  try {
    const sequenceId = req.params.id;
    const { contactId, subAccountId } = req.body;

    if (!contactId) return res.status(400).json({ error: 'contactId is required' });

    // Get contact
    const [contact] = await db.select().from(contacts)
      .where(eq(contacts.id, contactId)).limit(1);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    // Get existing sequence emails
    const emails = await db.select().from(sequenceEmails)
      .where(eq(sequenceEmails.sequenceId, sequenceId))
      .orderBy(sequenceEmails.sortOrder);

    if (emails.length === 0) {
      return res.status(400).json({ error: 'Sequence has no email slots' });
    }

    const tags = (contact.tags as string[]) || [];
    const customFields = (contact.customFields as Record<string, any>) || {};
    const isSmsSequence = emails.some(e => e.channel === 'sms');

    const contactContext = `Contact info:
- Business/Name: ${contact.name}
- ${isSmsSequence ? 'Phone' : 'Email'}: ${isSmsSequence ? contact.phone : contact.email}
- Category/Source: ${contact.source || 'Unknown'}
- Tags: ${tags.join(', ') || 'None'}
${customFields.owner_name ? `\nThe owner/manager's name is "${customFields.owner_name}" — address them by name.` : ''}
${customFields.services ? `\nTheir services include: ${customFields.services}. Reference specific services they offer.` : ''}
${customFields.pain_points ? `\nKey pain points: ${customFields.pain_points}. Frame your value proposition around solving these.` : ''}
${customFields.reputation_gap ? `\nOnline reputation issue: ${customFields.reputation_gap}. Tactfully reference this.` : ''}
${customFields.google_rating ? `\nGoogle rating: ${customFields.google_rating}. If low, mention how you can help improve it.` : ''}`;

    const systemPrompt = isSmsSequence
      ? `You are an expert sales copywriter. Generate a 3-message SMS cold outreach sequence.

The messages should be:
1. "Initial" — First contact. Mention the business by name. One clear value proposition. Under 160 characters.
2. "Follow-up" — Follow up if no reply. Add a different angle. Under 160 characters.
3. "Final" — Last attempt. Create urgency. Under 160 characters.

${contactContext}

IMPORTANT: Each SMS body must be under 160 characters. No subject lines needed (set subject to empty string ""). Be direct, personal, and conversational — this is SMS, not email.

Return a JSON object with:
{
  "emails": [
    { "label": "Initial", "subject": "", "body": "..." },
    { "label": "Follow-up", "subject": "", "body": "..." },
    { "label": "Final", "subject": "", "body": "..." }
  ]
}`
      : `You are an expert sales email copywriter. Generate a 3-email cold outreach sequence.

The emails should be:
1. "Initial" — First contact. Brief, friendly, mention the lead's business. Offer value.
2. "Follow-up" — Follow up if no reply. Reference the first email. Add new value proposition.
3. "Final" — Last attempt. Create urgency. Short and direct.

${contactContext}
Keep emails short (3-5 sentences each). Be personalized — reference the business name, owner name, and specific services.
Sign off as the sender (use "Best," followed by a new line, leave the sender name out — the system will append it).

Return a JSON object with:
{
  "emails": [
    { "label": "Initial", "subject": "...", "body": "..." },
    { "label": "Follow-up", "subject": "...", "body": "..." },
    { "label": "Final", "subject": "...", "body": "..." }
  ]
}`;

    const result = await generateJSON<{
      emails: { label: string; subject: string; body: string }[];
    }>(systemPrompt, `Generate a 3-${isSmsSequence ? 'SMS' : 'email'} outreach sequence for ${contact.name}.`);

    // Update existing sequenceEmails with generated content
    for (let i = 0; i < Math.min(result.emails.length, emails.length); i++) {
      await db.update(sequenceEmails).set({
        subject: result.emails[i].subject,
        body: result.emails[i].body,
        label: result.emails[i].label || emails[i].label,
        updatedAt: new Date(),
      }).where(eq(sequenceEmails.id, emails[i].id));
    }

    // Fetch updated emails
    const updatedEmails = await db.select().from(sequenceEmails)
      .where(eq(sequenceEmails.sequenceId, sequenceId))
      .orderBy(sequenceEmails.sortOrder);

    if (subAccountId) {
      logUsage(subAccountId, 'ai_generate_content', { feature: 'email_sequence' }).catch(console.error);
    }

    res.json({ emails: updatedEmails.map(serializeTimestamps) });
  } catch (err: any) {
    if (err instanceof RateLimitError) {
      return res.status(429).json({ error: 'rate_limit', message: err.message, retryAfterMs: err.retryAfterMs });
    }
    console.error('Generate sequence emails error:', err);
    res.status(500).json({ error: 'Failed to generate emails' });
  }
});

export default router;
