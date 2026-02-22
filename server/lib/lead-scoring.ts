import { db } from '../db/index.js';
import { contacts, activities } from '../db/schema.js';
import { eq, and, gt, lte } from 'drizzle-orm';
import { broadcast } from './ws.js';

type ScoreEvent = 'email_open' | 'email_click' | 'reply' | 'sequence_completed' | 'enrichment' | 'time_decay';

const SCORE_ADJUSTMENTS: Record<ScoreEvent, number> = {
  email_open: 5,
  email_click: 10,
  reply: 20,
  sequence_completed: 5,
  enrichment: 5,
  time_decay: -1,
};

export async function recalculateLeadScore(contactId: string, event: ScoreEvent): Promise<void> {
  try {
    const [contact] = await db.select().from(contacts)
      .where(eq(contacts.id, contactId)).limit(1);
    if (!contact) return;

    // For enrichment events, recalculate full score from current data
    // (enrichment adds email, website, owner, services — each worth points)
    let newScore: number;
    if (event === 'enrichment') {
      newScore = calculateInitialScore({
        email: contact.email,
        phone: contact.phone,
        customFields: contact.customFields as Record<string, any>,
      });
    } else {
      const adjustment = SCORE_ADJUSTMENTS[event] || 0;
      newScore = Math.max(0, Math.min(100, contact.leadScore + adjustment));
    }

    if (newScore === contact.leadScore) return;

    const diff = newScore - contact.leadScore;
    await db.update(contacts).set({
      leadScore: newScore,
      lastActivity: `Score ${diff > 0 ? '+' : ''}${diff} → ${newScore} (${event.replace(/_/g, ' ')})`,
    }).where(eq(contacts.id, contactId));

    await db.insert(activities).values({
      contactId,
      type: 'note',
      content: `Lead score ${diff > 0 ? 'increased' : diff < 0 ? 'decreased' : 'unchanged'} by ${Math.abs(diff)} to ${newScore} (${event.replace(/_/g, ' ')})`,
    });

    broadcast({
      type: 'contact:score_updated',
      payload: { id: contactId, leadScore: newScore, event },
    });
  } catch (err) {
    console.error(`[lead-scoring] Failed for ${contactId}:`, err);
  }
}

export function calculateInitialScore(contact: {
  email?: string;
  phone?: string;
  customFields?: Record<string, any>;
}): number {
  let score = 20; // base: business exists

  // Contact channels available
  if (contact.email)  score += 15;
  if (contact.phone)  score += 10;

  // Business data richness
  const cf = contact.customFields || {};
  if (cf.website)                                         score += 10;
  if (cf.owner_name)                                      score += 10;
  if (cf.google_rating && Number(cf.google_rating) >= 4)  score += 5;
  if (cf.google_rating && Number(cf.google_rating) < 3)   score += 10; // worse = bigger opportunity
  if (cf.reputation_gap)                                  score += 5;
  if (cf.services)                                        score += 5;

  return Math.min(100, score);
}

// Time decay: reduce scores for contacts with no recent activity
async function processTimeDecay(): Promise<void> {
  try {
    // Find contacts with score > 0 and no activity in the last 7 days
    const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const allContacts = await db.select({
      id: contacts.id,
      leadScore: contacts.leadScore,
      createdAt: contacts.createdAt,
    }).from(contacts)
      .where(gt(contacts.leadScore, 0));

    for (const contact of allContacts) {
      // Check if the contact has any activity in the last 7 days
      const recentActivities = await db.select({ id: activities.id })
        .from(activities)
        .where(and(
          eq(activities.contactId, contact.id),
          gt(activities.timestamp, staleThreshold),
        ))
        .limit(1);

      if (recentActivities.length === 0 && contact.leadScore > 0) {
        await recalculateLeadScore(contact.id, 'time_decay');
      }
    }
  } catch (err) {
    console.error('[lead-scoring] Time decay error:', err);
  }
}

let decayInterval: ReturnType<typeof setInterval> | null = null;

export function startTimeDecayScheduler(): void {
  if (decayInterval) return;
  // Run daily (every 24 hours)
  console.log('[lead-scoring] Time decay scheduler started (runs every 24h)');
  decayInterval = setInterval(async () => {
    try {
      await processTimeDecay();
    } catch (err) {
      console.error('[lead-scoring] Time decay scheduler error:', err);
    }
  }, 24 * 60 * 60 * 1000);
}

export { type ScoreEvent };
