import { Router, Request, Response } from 'express';
import express from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { messages, invoices, subscriptions, sequenceEnrollments, contacts, activities, aiProposals } from '../db/schema.js';
import { broadcast } from '../lib/ws.js';
import { recalculateLeadScore } from '../lib/lead-scoring.js';

const router = Router();

// ── Twilio Status Callback ──
// Twilio sends delivery status updates as form-encoded POST data.
router.post(
  '/twilio/status',
  express.urlencoded({ extended: false }),
  async (req: Request, res: Response) => {
    try {
      const { MessageSid, MessageStatus } = req.body as {
        MessageSid: string;
        MessageStatus: string;
      };

      // Map Twilio statuses to our DB enum values
      const statusMap: Record<string, 'queued' | 'sent' | 'delivered' | 'failed'> = {
        queued: 'queued',
        sent: 'sent',
        delivered: 'delivered',
        failed: 'failed',
        undelivered: 'failed',
      };

      const status = statusMap[MessageStatus];
      if (!status) {
        // Unknown status — acknowledge so Twilio doesn't retry
        res.type('text/xml').status(200).send('<Response></Response>');
        return;
      }

      const [updated] = await db
        .update(messages)
        .set({ status })
        .where(eq(messages.providerId, MessageSid))
        .returning();

      if (updated) {
        broadcast({
          type: 'message:status',
          payload: { id: updated.id, status, providerId: MessageSid },
        });
      }

      res.type('text/xml').status(200).send('<Response></Response>');
    } catch (err) {
      console.error('[webhooks] Twilio status callback error:', err);
      // Always return 200 to Twilio so it doesn't keep retrying
      res.type('text/xml').status(200).send('<Response></Response>');
    }
  },
);

// ── Twilio Inbound SMS ──
// Twilio sends inbound messages as form-encoded POST data.
router.post(
  '/twilio/inbound',
  express.urlencoded({ extended: false }),
  async (req: Request, res: Response) => {
    try {
      const { From, Body, MessageSid } = req.body as {
        From: string;
        Body: string;
        MessageSid: string;
      };

      // Try to find an existing contact by phone number to use as contactId.
      // contactId is NOT NULL in the messages table, so we need a valid reference.
      // Import contacts inline to avoid circular issues at the top-level.
      const { contacts } = await import('../db/schema.js');

      const [existingContact] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.phone, From))
        .limit(1);

      if (!existingContact) {
        // No matching contact — log and acknowledge.
        // In production you'd create a new contact or use a catch-all.
        console.warn(
          `[webhooks] Inbound SMS from unknown number ${From} (SID: ${MessageSid}). Skipping insert — no matching contact.`,
        );
        res.type('text/xml').status(200).send('<Response></Response>');
        return;
      }

      const [inserted] = await db
        .insert(messages)
        .values({
          contactId: existingContact.id,
          channel: 'sms',
          direction: 'inbound',
          content: Body || '',
          status: 'received',
          providerId: MessageSid,
        })
        .returning();

      broadcast({
        type: 'message:new',
        payload: {
          ...inserted,
          timestamp: inserted.timestamp.toISOString(),
        },
      });

      // ── Reply Detection (Feature 5) ──
      // Check if this contact has active sequence enrollments — if so, pause them
      const activeEnrollments = await db.select().from(sequenceEnrollments)
        .where(and(
          eq(sequenceEnrollments.contactId, existingContact.id),
          eq(sequenceEnrollments.status, 'active')
        ));

      for (const enrollment of activeEnrollments) {
        await db.update(sequenceEnrollments).set({
          status: 'paused',
          pausedReason: 'reply_detected',
          replyCount: sql`${sequenceEnrollments.replyCount} + 1`,
          updatedAt: new Date(),
        }).where(eq(sequenceEnrollments.id, enrollment.id));
      }

      if (activeEnrollments.length > 0) {
        // Move contact from Lead → Interested
        await db.update(contacts).set({ status: 'Interested' })
          .where(eq(contacts.id, existingContact.id));

        await recalculateLeadScore(existingContact.id, 'reply');

        // Log activity
        await db.insert(activities).values({
          contactId: existingContact.id,
          type: 'note',
          content: `Reply detected via SMS — ${activeEnrollments.length} sequence(s) paused. Message: "${Body?.substring(0, 100) || ''}"`,
        });

        // Create AI proposal for user to review and approve a response
        const [contactForProposal] = await db.select({ subAccountId: contacts.subAccountId, name: contacts.name })
          .from(contacts).where(eq(contacts.id, existingContact.id)).limit(1);

        if (contactForProposal) {
          await db.insert(aiProposals).values({
            subAccountId: contactForProposal.subAccountId,
            contactId: existingContact.id,
            contactName: contactForProposal.name,
            type: 'send_message',
            title: `Reply from ${contactForProposal.name} — draft follow-up`,
            description: `Contact replied to an outreach sequence via SMS: "${Body?.substring(0, 200) || ''}". Sequence has been paused. Review and craft a personalized follow-up.`,
            module: 'sequences',
            payload: { channel: 'sms', content: '', replyMessage: Body?.substring(0, 500) || '' },
            status: 'pending',
          });
        }

        broadcast({
          type: 'sequence:reply_detected',
          payload: {
            contactId: existingContact.id,
            enrollmentIds: activeEnrollments.map(e => e.id),
            message: Body?.substring(0, 200) || '',
          },
        });
      }

      res.type('text/xml').status(200).send('<Response></Response>');
    } catch (err) {
      console.error('[webhooks] Twilio inbound SMS error:', err);
      res.type('text/xml').status(200).send('<Response></Response>');
    }
  },
);

// ── Resend Webhook ──
// Resend sends JSON payloads for email delivery events (opened, clicked, delivered, bounced).
router.post('/resend', express.json(), async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body as { type: string; data: { email_id?: string } };
    const emailId = data?.email_id;

    if (!emailId) {
      res.status(200).json({ received: true });
      return;
    }

    // Find the message by Resend's email_id stored as providerId
    const [msg] = await db.select().from(messages)
      .where(eq(messages.providerId, emailId)).limit(1);

    if (!msg) {
      res.status(200).json({ received: true });
      return;
    }

    switch (type) {
      case 'email.delivered': {
        await db.update(messages).set({ status: 'delivered' })
          .where(eq(messages.id, msg.id));
        broadcast({ type: 'message:status', payload: { id: msg.id, status: 'delivered', providerId: emailId } });
        break;
      }

      case 'email.opened': {
        await db.update(messages).set({ status: 'opened', openedAt: new Date() })
          .where(eq(messages.id, msg.id));
        broadcast({ type: 'message:opened', payload: { id: msg.id, contactId: msg.contactId, openedAt: new Date().toISOString() } });

        // Update enrollment open count if this message is part of a sequence
        if (msg.sequenceEmailId) {
          await db.update(sequenceEnrollments).set({
            openCount: sql`${sequenceEnrollments.openCount} + 1`,
          }).where(
            and(
              eq(sequenceEnrollments.contactId, msg.contactId),
              sql`${msg.id}::text = ANY(${sequenceEnrollments.messageIds})`
            )
          );
        }

        await recalculateLeadScore(msg.contactId, 'email_open');
        break;
      }

      case 'email.clicked': {
        await db.update(messages).set({ status: 'clicked', clickedAt: new Date() })
          .where(eq(messages.id, msg.id));
        broadcast({ type: 'message:clicked', payload: { id: msg.id, contactId: msg.contactId, clickedAt: new Date().toISOString() } });

        if (msg.sequenceEmailId) {
          await db.update(sequenceEnrollments).set({
            clickCount: sql`${sequenceEnrollments.clickCount} + 1`,
          }).where(
            and(
              eq(sequenceEnrollments.contactId, msg.contactId),
              sql`${msg.id}::text = ANY(${sequenceEnrollments.messageIds})`
            )
          );
        }

        await recalculateLeadScore(msg.contactId, 'email_click');
        break;
      }

      case 'email.bounced': {
        await db.update(messages).set({ status: 'bounced' })
          .where(eq(messages.id, msg.id));
        broadcast({ type: 'message:status', payload: { id: msg.id, status: 'bounced', providerId: emailId } });
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhooks] Resend webhook error:', err);
    res.status(200).json({ received: true });
  }
});

// ── Stripe Webhook ──
// Stripe sends JSON payloads and requires raw body for signature verification.
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        // Stripe webhooks not configured — silently accept
        res.status(200).json({ received: true });
        return;
      }

      // Dynamic import so the server doesn't crash if stripe isn't installed/configured
      const stripeLib = await import('../lib/stripe.js');
      const stripe = stripeLib.getStripe();
      if (!stripe) {
        res.status(200).json({ received: true });
        return;
      }

      const sig = req.headers['stripe-signature'] as string;
      if (!sig) {
        res.status(400).json({ error: 'Missing stripe-signature header' });
        return;
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (verifyErr: any) {
        console.error('[webhooks] Stripe signature verification failed:', verifyErr.message);
        res.status(400).json({ error: 'Webhook signature verification failed' });
        return;
      }

      // Handle relevant events
      switch (event.type) {
        case 'invoice.paid': {
          const invoice = event.data.object as any;
          await db
            .update(invoices)
            .set({ status: 'paid', paidAt: new Date() })
            .where(eq(invoices.stripeInvoiceId, invoice.id));
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          await db
            .update(invoices)
            .set({ status: 'open' })
            .where(eq(invoices.stripeInvoiceId, invoice.id));
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as any;
          await db
            .update(subscriptions)
            .set({
              status: sub.status,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            })
            .where(eq(subscriptions.stripeSubscriptionId, sub.id));
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as any;
          await db
            .update(subscriptions)
            .set({ status: 'canceled' })
            .where(eq(subscriptions.stripeSubscriptionId, sub.id));
          break;
        }

        default:
          // Unhandled event type — no action needed
          break;
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error('[webhooks] Stripe webhook error:', err);
      res.status(400).json({ error: 'Webhook handler failed' });
    }
  },
);

export default router;
