import { db } from '../db/index.js';
import { eq, and, lte } from 'drizzle-orm';
import { sequenceEnrollments, sequenceEmails, contacts } from '../db/schema.js';
import { sendAndTrackMessage } from './message-sender.js';
import { broadcast } from './ws.js';
import { recalculateLeadScore } from './lead-scoring.js';

function replaceVars(template: string, contact: { name: string; email: string; phone: string; status: string }): string {
  return template
    .replace(/\{\{contact\.name\}\}/g, contact.name)
    .replace(/\{\{contact\.email\}\}/g, contact.email)
    .replace(/\{\{contact\.phone\}\}/g, contact.phone)
    .replace(/\{\{contact\.status\}\}/g, contact.status);
}

async function processSequenceEmails(): Promise<void> {
  const now = new Date();

  const dueEnrollments = await db.select().from(sequenceEnrollments)
    .where(and(
      eq(sequenceEnrollments.status, 'active'),
      lte(sequenceEnrollments.nextSendAt, now)
    ));

  for (const enrollment of dueEnrollments) {
    try {
      const emails = await db.select().from(sequenceEmails)
        .where(eq(sequenceEmails.sequenceId, enrollment.sequenceId))
        .orderBy(sequenceEmails.sortOrder);

      const currentEmail = emails[enrollment.currentEmailIndex];
      if (!currentEmail) {
        // If nothing was ever sent, this is an error (no emails exist) — pause.
        // If sentCount > 0, all emails have been sent — legitimate completion.
        if (enrollment.sentCount === 0) {
          await db.update(sequenceEnrollments).set({
            status: 'paused',
            pausedReason: 'no_sequence_emails',
            updatedAt: new Date(),
          }).where(eq(sequenceEnrollments.id, enrollment.id));
        } else {
          await db.update(sequenceEnrollments).set({
            status: 'completed',
            updatedAt: new Date(),
          }).where(eq(sequenceEnrollments.id, enrollment.id));
          await recalculateLeadScore(enrollment.contactId, 'sequence_completed');
        }
        continue;
      }

      const [contact] = await db.select().from(contacts)
        .where(eq(contacts.id, enrollment.contactId)).limit(1);

      const channel = currentEmail.channel || 'email';
      const hasAddress = channel === 'email' ? !!contact?.email : !!contact?.phone;

      if (!contact || !hasAddress) {
        await db.update(sequenceEnrollments).set({
          status: 'paused',
          pausedReason: !contact ? 'contact_deleted' : 'no_delivery_address',
          updatedAt: new Date(),
        }).where(eq(sequenceEnrollments.id, enrollment.id));
        console.warn(`[sequence] Paused enrollment ${enrollment.id}: ${!contact ? 'contact deleted' : 'no delivery address'}`);
        continue;
      }

      const body = replaceVars(currentEmail.body, contact);
      const subject = channel === 'email' ? replaceVars(currentEmail.subject, contact) : undefined;

      if (!body.trim()) {
        await db.update(sequenceEnrollments).set({
          status: 'paused',
          pausedReason: 'empty_email_body',
          updatedAt: new Date(),
        }).where(eq(sequenceEnrollments.id, enrollment.id));
        console.warn(`[sequence] Paused enrollment ${enrollment.id}: email body is empty at index ${enrollment.currentEmailIndex}`);
        continue;
      }

      const result = await sendAndTrackMessage({
        contactId: enrollment.contactId,
        channel,
        content: body,
        subject,
        sequenceEmailId: currentEmail.id,
      });

      const messageIds = [...((enrollment.messageIds as string[]) || []), result.id];
      const nextIndex = enrollment.currentEmailIndex + 1;
      const isComplete = nextIndex >= emails.length;

      const nextEmail = emails[nextIndex];
      const nextSendAt = isComplete ? null : new Date(Date.now() + (nextEmail?.delayMinutes || 1440) * 60_000);

      await db.update(sequenceEnrollments).set({
        currentEmailIndex: nextIndex,
        status: isComplete ? 'completed' : 'active',
        sentCount: enrollment.sentCount + 1,
        lastSentAt: new Date(),
        nextSendAt,
        messageIds,
        updatedAt: new Date(),
      }).where(eq(sequenceEnrollments.id, enrollment.id));

      if (isComplete) {
        await recalculateLeadScore(enrollment.contactId, 'sequence_completed');
      }

      broadcast({
        type: 'sequence:email_sent',
        payload: {
          enrollmentId: enrollment.id,
          contactId: enrollment.contactId,
          sequenceId: enrollment.sequenceId,
          emailIndex: enrollment.currentEmailIndex,
          messageId: result.id,
          status: result.status,
        },
      });

    } catch (err) {
      console.error(`[sequence] Failed to process enrollment ${enrollment.id}:`, err);
    }
  }
}

let sequenceInterval: ReturnType<typeof setInterval> | null = null;

export function startSequenceScheduler(): void {
  if (sequenceInterval) return;
  console.log('[sequence] Scheduler started (checking every 60s for due emails)');
  sequenceInterval = setInterval(async () => {
    try {
      await processSequenceEmails();
    } catch (err) {
      console.error('[sequence] Scheduler error:', err);
    }
  }, 60_000);
}
