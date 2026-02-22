import crypto from 'crypto';
import { Router } from 'express';
import { eq, and, desc, gte, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireQuota } from '../middleware/quota.js';
import { logUsage, saveSearchResult, getLastUsageTimestamp } from '../lib/usage.js';
import { chat, generateJSON, RateLimitError, isGeminiConfigured } from '../lib/gemini.js';
import { resolveGeminiApiKey } from '../lib/integration-credentials.js';
import { recalculateLeadScore } from '../lib/lead-scoring.js';
import { db } from '../db/index.js';
import {
  contacts, messages as messagesTable, tasks, appointments as appointmentsTable,
  workflowLogs, aiProposals, aiAutonomySettings, aiProposalStats, aiChatSessions,
  aiGeneratedContent, activities, searchResults, callLogs,
} from '../db/schema.js';

const router = Router();
router.use(requireAuth);

// Middleware to handle rate limit errors with a friendly message
function handleAIError(err: unknown, res: import('express').Response, next: import('express').NextFunction) {
  if (err instanceof RateLimitError) {
    return res.status(429).json({
      error: 'rate_limit',
      message: `AI is cooling down. ${err.message}`,
      retryAfterMs: err.retryAfterMs,
    });
  }
  next(err);
}

// ── Helpers ──

function getDefaultTier(type: string): 'auto_approve' | 'require_approval' | 'require_approval_preview' {
  const defaults: Record<string, 'auto_approve' | 'require_approval' | 'require_approval_preview'> = {
    add_tag: 'auto_approve',
    add_task: 'auto_approve',
    update_lead_score: 'auto_approve',
    book_appointment: 'require_approval',
    update_contact_status: 'require_approval',
    run_workflow: 'require_approval',
    send_message: 'require_approval_preview',
  };
  return defaults[type] || 'require_approval';
}

async function executeProposalAction(proposal: { type: string; contactId: string | null; contactName: string | null; payload: Record<string, any> }): Promise<void> {
  const p = proposal.payload as Record<string, any>;
  switch (proposal.type) {
    case 'send_message': {
      if (proposal.contactId) {
        const channel = p.channel || 'email';
        const [contact] = await db.select().from(contacts).where(eq(contacts.id, proposal.contactId)).limit(1);
        if (!contact) break;
        if (channel === 'email' && !contact.email) break;
        if (channel === 'sms' && !contact.phone) break;
        await db.insert(messagesTable).values({
          contactId: proposal.contactId,
          channel,
          direction: 'outbound',
          content: p.content || '',
          status: 'queued',
        });
      }
      break;
    }
    case 'update_lead_score': {
      if (proposal.contactId) {
        await db.update(contacts).set({ leadScore: p.newScore }).where(eq(contacts.id, proposal.contactId));
      }
      break;
    }
    case 'add_tag': {
      if (proposal.contactId) {
        const [c] = await db.select().from(contacts).where(eq(contacts.id, proposal.contactId)).limit(1);
        if (c) {
          const tags = (c.tags as string[]) || [];
          if (!tags.includes(p.tag)) {
            await db.update(contacts).set({ tags: [...tags, p.tag] }).where(eq(contacts.id, proposal.contactId));
          }
        }
      }
      break;
    }
    case 'add_task': {
      if (proposal.contactId) {
        await db.insert(tasks).values({
          contactId: proposal.contactId,
          title: p.title || 'AI-suggested Task',
          dueDate: p.dueDate ? new Date(p.dueDate) : new Date(),
        });
      }
      break;
    }
    case 'update_contact_status': {
      if (proposal.contactId) {
        await db.update(contacts).set({ status: p.status }).where(eq(contacts.id, proposal.contactId));
      }
      break;
    }
    case 'book_appointment': {
      if (!p.startTime || !p.endTime) break;
      await db.insert(appointmentsTable).values({
        calendarId: p.calendarId || null,
        contactId: proposal.contactId || null,
        contactName: proposal.contactName || '',
        title: p.title || 'AI-booked Appointment',
        startTime: new Date(p.startTime),
        endTime: new Date(p.endTime),
        status: 'booked',
        notes: p.notes || 'Auto-booked by AI',
      });
      break;
    }
    case 'run_workflow': {
      await db.insert(workflowLogs).values({
        contactName: proposal.contactName || 'Unknown',
        workflowName: p.workflowName || 'AI-triggered',
        currentStep: 'Initial Step',
        status: 'success',
      });
      break;
    }
  }
}

async function incrementStat(subAccountId: string, proposalType: string, field: 'approved' | 'dismissed' | 'auto_approved'): Promise<void> {
  const [existing] = await db.select().from(aiProposalStats)
    .where(and(
      eq(aiProposalStats.subAccountId, subAccountId),
      eq(aiProposalStats.proposalType, proposalType as any)
    )).limit(1);

  if (existing) {
    const update: Record<string, any> = { lastUpdated: new Date() };
    if (field === 'approved') update.approvedCount = existing.approvedCount + 1;
    if (field === 'dismissed') update.dismissedCount = existing.dismissedCount + 1;
    if (field === 'auto_approved') update.autoApprovedCount = existing.autoApprovedCount + 1;
    await db.update(aiProposalStats).set(update).where(eq(aiProposalStats.id, existing.id));
  } else {
    await db.insert(aiProposalStats).values({
      subAccountId,
      proposalType: proposalType as any,
      approvedCount: field === 'approved' ? 1 : 0,
      dismissedCount: field === 'dismissed' ? 1 : 0,
      autoApprovedCount: field === 'auto_approved' ? 1 : 0,
    });
  }
}

function serializeProposal(r: typeof aiProposals.$inferSelect) {
  return {
    ...r,
    payload: r.payload as Record<string, any>,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() || null,
  };
}

// Proactive insights cooldown (30 minutes per sub-account, persisted via usageLogs)
const PROACTIVE_COOLDOWN_MS = 30 * 60_000;

// ── GET /api/ai/chat-sessions — List sessions for a sub-account ──
router.get('/chat-sessions', async (req, res, next) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    const rows = await db.select({
      id: aiChatSessions.id,
      title: aiChatSessions.title,
      updatedAt: aiChatSessions.updatedAt,
    })
      .from(aiChatSessions)
      .where(eq(aiChatSessions.subAccountId, subAccountId))
      .orderBy(desc(aiChatSessions.updatedAt))
      .limit(50);

    res.json({
      sessions: rows.map(r => ({
        id: r.id,
        title: r.title,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (err) { next(err); }
});

// ── GET /api/ai/chat-sessions/:id — Get full session by ID ──
router.get('/chat-sessions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [session] = await db.select().from(aiChatSessions).where(eq(aiChatSessions.id, id)).limit(1);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      id: session.id,
      subAccountId: session.subAccountId,
      title: session.title,
      messages: session.messages as unknown[],
      agentConfig: session.agentConfig as Record<string, unknown>,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (err) { next(err); }
});

// ── POST /api/ai/chat-sessions — Create new session ──
router.post('/chat-sessions', async (req, res, next) => {
  try {
    const { subAccountId, title, agentConfig } = req.body as {
      subAccountId: string;
      title?: string;
      agentConfig?: Record<string, unknown>;
    };
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    const [session] = await db.insert(aiChatSessions).values({
      subAccountId,
      title: title || 'New Chat',
      agentConfig: agentConfig || {},
      messages: [],
    }).returning();

    res.json({
      id: session.id,
      subAccountId: session.subAccountId,
      title: session.title,
      messages: session.messages as unknown[],
      agentConfig: session.agentConfig as Record<string, unknown>,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (err) { next(err); }
});

// ── PUT /api/ai/chat-sessions/:id — Update session ──
router.put('/chat-sessions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { messages: msgs, title, agentConfig } = req.body as {
      messages?: unknown[];
      title?: string;
      agentConfig?: Record<string, unknown>;
    };

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (msgs !== undefined) update.messages = msgs;
    if (title !== undefined) update.title = title;
    if (agentConfig !== undefined) update.agentConfig = agentConfig;

    const [session] = await db.update(aiChatSessions)
      .set(update)
      .where(eq(aiChatSessions.id, id))
      .returning();

    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.json({
      id: session.id,
      subAccountId: session.subAccountId,
      title: session.title,
      messages: session.messages as unknown[],
      agentConfig: session.agentConfig as Record<string, unknown>,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (err) { next(err); }
});

// ── DELETE /api/ai/chat-sessions/:id — Delete session ──
router.delete('/chat-sessions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.delete(aiChatSessions).where(eq(aiChatSessions.id, id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── POST /api/ai/chat — Main conversational endpoint ──
router.post('/chat', requireQuota('ai_chat'), async (req, res, next) => {
  try {
    const { message, context, history } = req.body as {
      message: string;
      context?: {
        contacts?: { name: string; email: string; status: string; leadScore: number; lastActivity: string; tags: string[] }[];
        recentMessages?: { contactName: string; channel: string; direction: string; content: string; timestamp: string }[];
        appointments?: { title: string; contactName: string; startTime: string; endTime: string; status: string }[];
        agentName?: string;
        agentGoal?: string;
        agentInstructions?: string;
      };
      history?: { role: string; content: string }[];
    };

    if (!message) return res.status(400).json({ error: 'message is required' });

    const ctx = context || {};
    const agentName = ctx.agentName || 'Nexus AI';
    const agentGoal = ctx.agentGoal || 'Help manage the CRM and provide actionable insights';
    const agentInstructions = ctx.agentInstructions || '';

    const contactList = (ctx.contacts || [])
      .map(c => `- ${c.name} (${c.email}) | Status: ${c.status} | Score: ${c.leadScore} | Last: ${c.lastActivity} | Tags: ${(c.tags || []).join(', ')}`)
      .join('\n');

    const messageList = (ctx.recentMessages || [])
      .slice(0, 20)
      .map(m => `- [${m.direction}] ${m.contactName} via ${m.channel}: "${m.content}" (${m.timestamp})`)
      .join('\n');

    const aptList = (ctx.appointments || [])
      .map(a => `- "${a.title}" with ${a.contactName} | ${a.startTime} – ${a.endTime} | ${a.status}`)
      .join('\n');

    const systemPrompt = `You are ${agentName}, an AI employee at a CRM platform called Nexus CRM. Your primary goal is: ${agentGoal}.

${agentInstructions ? `Additional Instructions:\n${agentInstructions}\n` : ''}
## CRM Context
You have access to the following live data from the CRM:

### Contacts (${(ctx.contacts || []).length} total)
${contactList || 'No contacts loaded.'}

### Recent Conversations (${(ctx.recentMessages || []).length} messages)
${messageList || 'No recent messages.'}

### Upcoming Appointments (${(ctx.appointments || []).length})
${aptList || 'No upcoming appointments.'}

### Available Actions
You can suggest these actions (the user will confirm):
- DRAFT_MESSAGE: Draft an email or SMS for a contact
- BOOK_APPOINTMENT: Suggest a time slot for a meeting
- UPDATE_LEAD_SCORE: Recommend a lead score adjustment
- SUGGEST_WORKFLOW: Recommend a workflow to run on a contact
- CONTACT_SUMMARY: Provide a detailed contact analysis

When suggesting actions, format them as:
[ACTION:TYPE|param1=value|param2=value]

For example:
[ACTION:DRAFT_MESSAGE|contactName=James Carter|channel=email|purpose=follow-up]
[ACTION:UPDATE_LEAD_SCORE|contactName=James Carter|newScore=85|reason=high engagement]
[ACTION:BOOK_APPOINTMENT|contactName=James Carter|title=Strategy Call|suggestedTime=tomorrow 2pm]

Always be helpful, proactive, and data-driven. Reference specific contacts by name and cite their data. Use markdown formatting for readability.`;

    const subAccountId = req.body.subAccountId as string;
    const apiKey = await resolveGeminiApiKey(subAccountId) || undefined;
    const reply = await chat(systemPrompt, message, history, apiKey);
    if (subAccountId) logUsage(subAccountId, 'ai_chat').catch(console.error);
    res.json({ reply });
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// ── POST /api/ai/draft-message — Message composition ──
router.post('/draft-message', requireQuota('ai_draft_message'), async (req, res, next) => {
  try {
    const { contactName, contactEmail, channel, conversationHistory, tone, purpose } = req.body as {
      contactName: string;
      contactEmail?: string;
      channel: string;
      conversationHistory?: string;
      tone?: string;
      purpose?: string;
    };

    if (!contactName) return res.status(400).json({ error: 'contactName is required' });

    const systemPrompt = `You are an expert CRM message writer. Generate a personalized ${channel || 'email'} message.

Contact: ${contactName}${contactEmail ? ` (${contactEmail})` : ''}
Channel: ${channel || 'email'}
Tone: ${tone || 'professional and friendly'}
Purpose: ${purpose || 'follow-up'}

${conversationHistory ? `Previous conversation:\n${conversationHistory}` : ''}

Return a JSON object with:
- "draft": the message body text
- "subject": email subject line (only if channel is email, otherwise omit)

Make the message personalized, concise, and actionable. Reference previous conversations if available.`;

    const result = await generateJSON<{ draft: string; subject?: string }>(
      systemPrompt,
      `Write a ${purpose || 'follow-up'} ${channel || 'email'} for ${contactName}.`
    );

    const subAccountId = req.body.subAccountId as string;
    if (subAccountId) logUsage(subAccountId, 'ai_draft_message').catch(console.error);
    res.json(result);
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// ── POST /api/ai/contact-insight — Contact intelligence (with caching) ──
const INSIGHT_CACHE_MS = 4 * 60 * 60_000; // 4 hours

router.post('/contact-insight', requireQuota('ai_contact_insight'), async (req, res, next) => {
  try {
    const { contact, activities, messages: msgs, appointments, contactId } = req.body as {
      contact: { name: string; email: string; status: string; leadScore: number; source: string; tags: string[]; createdAt: string; lastActivity: string };
      activities?: { type: string; content: string; timestamp: string }[];
      messages?: { channel: string; direction: string; content: string; timestamp: string }[];
      appointments?: { title: string; startTime: string; status: string }[];
      contactId?: string;
    };

    if (!contact) return res.status(400).json({ error: 'contact is required' });

    // Check cache if contactId provided
    if (contactId) {
      const [row] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
      if (row && row.lastAiInsight && row.lastInsightAt) {
        const age = Date.now() - new Date(row.lastInsightAt).getTime();
        if (age < INSIGHT_CACHE_MS) {
          return res.json({ ...(row.lastAiInsight as Record<string, any>), cached: true, cachedAt: row.lastInsightAt.toISOString() });
        }
      }
    }

    const systemPrompt = `You are a CRM intelligence analyst. Analyze this contact and return a JSON object with:
- "summary": 2-3 sentence overview of this contact's engagement and status
- "riskLevel": "low", "medium", or "high" — risk of losing this lead
- "nextAction": specific recommended next step (be actionable)
- "predictedScore": predicted lead score 0-100 based on behavior
- "keyInsights": array of 3-5 short bullet-point insights

Contact Profile:
- Name: ${contact.name}
- Email: ${contact.email}
- Status: ${contact.status}
- Lead Score: ${contact.leadScore}
- Source: ${contact.source}
- Tags: ${(contact.tags || []).join(', ')}
- Created: ${contact.createdAt}
- Last Activity: ${contact.lastActivity}

Activities (${(activities || []).length}):
${(activities || []).map(a => `- [${a.type}] ${a.content} (${a.timestamp})`).join('\n') || 'None'}

Messages (${(msgs || []).length}):
${(msgs || []).map(m => `- [${m.direction}] via ${m.channel}: "${m.content}" (${m.timestamp})`).join('\n') || 'None'}

Appointments (${(appointments || []).length}):
${(appointments || []).map(a => `- ${a.title} on ${a.startTime} — ${a.status}`).join('\n') || 'None'}`;

    const result = await generateJSON<{
      summary: string;
      riskLevel: 'low' | 'medium' | 'high';
      nextAction: string;
      predictedScore: number;
      keyInsights: string[];
    }>(systemPrompt, `Analyze contact: ${contact.name}`);

    // Persist cache if contactId provided
    if (contactId) {
      await db.update(contacts)
        .set({ lastAiInsight: result, lastInsightAt: new Date() })
        .where(eq(contacts.id, contactId));
    }

    const subAccountId = req.body.subAccountId as string;
    if (subAccountId) logUsage(subAccountId, 'ai_contact_insight').catch(console.error);
    res.json({ ...result, cached: false });
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// ── POST /api/ai/suggestions — Proactive recommendations ──
router.post('/suggestions', requireQuota('ai_suggestions'), async (req, res, next) => {
  try {
    const { contacts, messages: msgs, appointments } = req.body as {
      contacts?: { name: string; email: string; status: string; leadScore: number; lastActivity: string; tags: string[]; id: string }[];
      messages?: { contactId: string; direction: string; channel: string; content: string; timestamp: string }[];
      appointments?: { contactName: string; title: string; startTime: string; status: string }[];
    };

    const systemPrompt = `You are a proactive CRM advisor. Based on the current CRM data, suggest 3-5 prioritized action items that the user should focus on right now.

Return a JSON object with:
- "suggestions": array of objects, each with:
  - "type": one of "follow_up", "at_risk", "opportunity", "reminder", "insight"
  - "title": short action title (5-8 words max)
  - "description": 1-2 sentence explanation
  - "contactId": the contact's ID if relevant (otherwise omit)
  - "priority": "high", "medium", or "low"

Focus on:
1. Leads that haven't been contacted recently
2. High-score leads that need follow-up
3. Upcoming appointments to prepare for
4. Contacts at risk of going cold
5. Opportunities to move leads through the pipeline

Current CRM Data:

Contacts (${(contacts || []).length}):
${(contacts || []).map(c => `- [${c.id}] ${c.name} | ${c.status} | Score: ${c.leadScore} | Last: ${c.lastActivity} | Tags: ${(c.tags || []).join(', ')}`).join('\n') || 'No contacts'}

Recent Messages (${(msgs || []).length}):
${(msgs || []).slice(0, 15).map(m => `- ${m.direction} via ${m.channel} to contact ${m.contactId}: "${m.content}" (${m.timestamp})`).join('\n') || 'No messages'}

Appointments (${(appointments || []).length}):
${(appointments || []).map(a => `- "${a.title}" with ${a.contactName} at ${a.startTime} — ${a.status}`).join('\n') || 'No appointments'}`;

    const result = await generateJSON<{
      suggestions: {
        type: string;
        title: string;
        description: string;
        contactId?: string;
        priority: 'high' | 'medium' | 'low';
      }[];
    }>(systemPrompt, 'What should I focus on right now? Give me my top priorities.');

    const subAccountId = req.body.subAccountId as string;
    if (subAccountId) logUsage(subAccountId, 'ai_suggestions').catch(console.error);
    res.json(result);
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// ── POST /api/ai/daily-briefing — Dashboard briefing ──
router.post('/daily-briefing', requireQuota('ai_briefing'), async (req, res, next) => {
  try {
    const { contacts, messages: msgs, appointments } = req.body as {
      contacts?: { id: string; name: string; email: string; status: string; leadScore: number; lastActivity: string; tags: string[] }[];
      messages?: { contactId: string; direction: string; channel: string; content: string; timestamp: string }[];
      appointments?: { contactName: string; title: string; startTime: string; status: string }[];
    };

    const systemPrompt = `You are a CRM intelligence analyst. Generate a daily briefing for a sales manager.

Return a JSON object with:
- "summary": 2-3 sentence overview of the current CRM state
- "followUps": array of objects { "contactId", "contactName", "reason", "suggestedAction" } — contacts that need follow-up TODAY (max 5)
- "atRiskDeals": array of objects { "contactId", "contactName", "riskLevel" ("high"|"medium"), "reason" } — deals at risk of going cold (max 3)
- "todaysPriorities": array of objects { "title", "description", "priority" ("high"|"medium"|"low") } — top 3-5 priorities for today

Be specific. Reference actual contact names and data. Be actionable.

Current CRM Data:
Contacts (${(contacts || []).length}):
${(contacts || []).map(c => `- [${c.id}] ${c.name} (${c.email}) | ${c.status} | Score: ${c.leadScore} | Last: ${c.lastActivity} | Tags: ${(c.tags || []).join(', ')}`).join('\n') || 'None'}

Recent Messages (${(msgs || []).length}):
${(msgs || []).slice(0, 15).map(m => `- ${m.direction} via ${m.channel} to ${m.contactId}: "${m.content}" (${m.timestamp})`).join('\n') || 'None'}

Appointments (${(appointments || []).length}):
${(appointments || []).map(a => `- "${a.title}" with ${a.contactName} at ${a.startTime} — ${a.status}`).join('\n') || 'None'}`;

    const result = await generateJSON<{
      summary: string;
      followUps: { contactId: string; contactName: string; reason: string; suggestedAction: string }[];
      atRiskDeals: { contactId: string; contactName: string; riskLevel: string; reason: string }[];
      todaysPriorities: { title: string; description: string; priority: 'high' | 'medium' | 'low' }[];
    }>(systemPrompt, 'Generate my daily briefing. What should I focus on today?');

    const subAccountId = req.body.subAccountId as string;
    if (subAccountId) logUsage(subAccountId, 'ai_briefing').catch(console.error);
    res.json(result);
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// ── GET /api/ai/proposals — Fetch persisted proposals ──
router.get('/proposals', async (req, res, next) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    const status = req.query.status as string | undefined;
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    const conditions = [eq(aiProposals.subAccountId, subAccountId)];
    if (status) conditions.push(eq(aiProposals.status, status as any));

    const rows = await db.select().from(aiProposals)
      .where(and(...conditions))
      .orderBy(desc(aiProposals.createdAt))
      .limit(100);

    res.json(rows.map(serializeProposal));
  } catch (err) { next(err); }
});

// ── POST /api/ai/proposals — Create proposal with autonomy check ──
router.post('/proposals', async (req, res, next) => {
  try {
    const data = req.body;
    const subAccountId = data.subAccountId;
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    // Look up autonomy tier
    const [setting] = await db.select().from(aiAutonomySettings)
      .where(and(
        eq(aiAutonomySettings.subAccountId, subAccountId),
        eq(aiAutonomySettings.proposalType, data.type)
      )).limit(1);

    const tier = setting?.tier || getDefaultTier(data.type);
    const isAutoApprove = tier === 'auto_approve';

    // Deduplication: skip if identical pending proposal already exists for same contact+type
    if (!isAutoApprove && data.contactId) {
      const [existing] = await db.select().from(aiProposals)
        .where(and(
          eq(aiProposals.subAccountId, subAccountId),
          eq(aiProposals.type, data.type),
          eq(aiProposals.contactId, data.contactId),
          eq(aiProposals.status, 'pending' as any)
        )).limit(1);
      if (existing) {
        return res.json({ ...serializeProposal(existing), duplicate: true, tier });
      }
    }

    const [proposal] = await db.insert(aiProposals).values({
      subAccountId,
      type: data.type,
      status: isAutoApprove ? 'auto_approved' : 'pending',
      title: data.title,
      description: data.description || '',
      module: data.module,
      contactId: data.contactId || null,
      contactName: data.contactName || null,
      payload: data.payload || {},
      source: data.source || 'manual',
      resolvedAt: isAutoApprove ? new Date() : null,
    }).returning();

    if (isAutoApprove) {
      await executeProposalAction({ type: proposal.type, contactId: proposal.contactId, contactName: proposal.contactName, payload: proposal.payload as Record<string, any> });
      await incrementStat(subAccountId, data.type, 'auto_approved');
    }

    res.json({ ...serializeProposal(proposal), autoApproved: isAutoApprove, tier });
  } catch (err) { next(err); }
});

// ── PUT /api/ai/proposals/:id/approve ──
router.put('/proposals/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payload } = req.body || {};

    const [proposal] = await db.select().from(aiProposals).where(eq(aiProposals.id, id)).limit(1);
    if (!proposal || proposal.status !== 'pending') {
      return res.status(404).json({ error: 'Proposal not found or not pending' });
    }

    const finalPayload = payload || proposal.payload;
    const [updated] = await db.update(aiProposals).set({
      status: 'approved',
      payload: finalPayload,
      resolvedAt: new Date(),
    }).where(eq(aiProposals.id, id)).returning();

    await executeProposalAction({ type: updated.type, contactId: updated.contactId, contactName: updated.contactName, payload: finalPayload as Record<string, any> });
    await incrementStat(proposal.subAccountId, proposal.type, 'approved');

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── PUT /api/ai/proposals/:id/dismiss ──
router.put('/proposals/:id/dismiss', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [proposal] = await db.select().from(aiProposals).where(eq(aiProposals.id, id)).limit(1);
    if (!proposal || proposal.status !== 'pending') {
      return res.status(404).json({ error: 'Proposal not found or not pending' });
    }

    await db.update(aiProposals).set({ status: 'dismissed', resolvedAt: new Date() }).where(eq(aiProposals.id, id));
    await incrementStat(proposal.subAccountId, proposal.type, 'dismissed');

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── PUT /api/ai/proposals/bulk-approve ──
router.put('/proposals/bulk-approve', async (req, res, next) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: 'ids array required' });

    const rows = await db.select().from(aiProposals)
      .where(and(inArray(aiProposals.id, ids), eq(aiProposals.status, 'pending' as any)));

    await db.update(aiProposals).set({ status: 'approved', resolvedAt: new Date() })
      .where(and(inArray(aiProposals.id, ids), eq(aiProposals.status, 'pending' as any)));

    for (const row of rows) {
      try {
        await executeProposalAction({ type: row.type, contactId: row.contactId, contactName: row.contactName, payload: row.payload as Record<string, any> });
        await incrementStat(row.subAccountId, row.type, 'approved');
      } catch { /* continue with other proposals */ }
    }

    res.json({ success: true, count: rows.length });
  } catch (err) { next(err); }
});

// ── PUT /api/ai/proposals/bulk-dismiss ──
router.put('/proposals/bulk-dismiss', async (req, res, next) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: 'ids array required' });

    const rows = await db.select().from(aiProposals)
      .where(and(inArray(aiProposals.id, ids), eq(aiProposals.status, 'pending' as any)));

    await db.update(aiProposals).set({ status: 'dismissed', resolvedAt: new Date() })
      .where(and(inArray(aiProposals.id, ids), eq(aiProposals.status, 'pending' as any)));

    for (const row of rows) {
      await incrementStat(row.subAccountId, row.type, 'dismissed');
    }

    res.json({ success: true, count: rows.length });
  } catch (err) { next(err); }
});

// ── PUT /api/ai/proposals/:id/undo — Undo auto-approved action ──
router.put('/proposals/:id/undo', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [proposal] = await db.select().from(aiProposals).where(eq(aiProposals.id, id)).limit(1);
    if (!proposal || proposal.status !== 'auto_approved') {
      return res.status(404).json({ error: 'Proposal not found or not auto-approved' });
    }

    // Revert based on type (only reversible types)
    const p = proposal.payload as Record<string, any>;
    switch (proposal.type) {
      case 'add_tag': {
        if (proposal.contactId) {
          const [c] = await db.select().from(contacts).where(eq(contacts.id, proposal.contactId)).limit(1);
          if (c) {
            const tags = ((c.tags as string[]) || []).filter(t => t !== p.tag);
            await db.update(contacts).set({ tags }).where(eq(contacts.id, proposal.contactId));
          }
        }
        break;
      }
      case 'update_lead_score': {
        if (proposal.contactId && p.previousScore !== undefined) {
          await db.update(contacts).set({ leadScore: p.previousScore }).where(eq(contacts.id, proposal.contactId));
        }
        break;
      }
      case 'add_task': {
        // Can't easily revert — mark as dismissed instead
        break;
      }
    }

    await db.update(aiProposals).set({ status: 'dismissed' }).where(eq(aiProposals.id, id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── GET /api/ai/autonomy-settings ──
router.get('/autonomy-settings', async (req, res, next) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    const rows = await db.select().from(aiAutonomySettings)
      .where(eq(aiAutonomySettings.subAccountId, subAccountId));

    // Merge with defaults
    const allTypes = ['send_message', 'update_lead_score', 'book_appointment', 'run_workflow', 'update_contact_status', 'add_tag', 'add_task'];
    const config: Record<string, string> = {};
    for (const t of allTypes) {
      const found = rows.find(r => r.proposalType === t);
      config[t] = found ? found.tier : getDefaultTier(t);
    }

    res.json(config);
  } catch (err) { next(err); }
});

// ── PUT /api/ai/autonomy-settings ──
router.put('/autonomy-settings', async (req, res, next) => {
  try {
    const { subAccountId, proposalType, tier } = req.body;
    if (!subAccountId || !proposalType || !tier) {
      return res.status(400).json({ error: 'subAccountId, proposalType, and tier are required' });
    }

    const [existing] = await db.select().from(aiAutonomySettings)
      .where(and(
        eq(aiAutonomySettings.subAccountId, subAccountId),
        eq(aiAutonomySettings.proposalType, proposalType)
      )).limit(1);

    if (existing) {
      await db.update(aiAutonomySettings).set({ tier }).where(eq(aiAutonomySettings.id, existing.id));
    } else {
      await db.insert(aiAutonomySettings).values({ subAccountId, proposalType, tier });
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── GET /api/ai/proposal-stats ──
router.get('/proposal-stats', async (req, res, next) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    const rows = await db.select().from(aiProposalStats)
      .where(eq(aiProposalStats.subAccountId, subAccountId));

    res.json(rows.map(r => ({
      proposalType: r.proposalType,
      approvedCount: r.approvedCount,
      dismissedCount: r.dismissedCount,
      autoApprovedCount: r.autoApprovedCount,
    })));
  } catch (err) { next(err); }
});

// ── POST /api/ai/proactive-insights — Server-driven background analysis ──
router.post('/proactive-insights', requireQuota('ai_proactive_insights'), async (req, res, next) => {
  try {
    const { subAccountId } = req.body;
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    // Cooldown check (persisted in usageLogs — survives server restarts)
    const lastRunAt = await getLastUsageTimestamp(subAccountId, 'ai_proactive_insights');
    if (lastRunAt && Date.now() - lastRunAt.getTime() < PROACTIVE_COOLDOWN_MS) {
      return res.json({ skipped: true, proposals: [], suppressedTypes: [] });
    }

    // Check suppressed types
    const stats = await db.select().from(aiProposalStats)
      .where(eq(aiProposalStats.subAccountId, subAccountId));
    const suppressedTypes = stats
      .filter(s => {
        const total = s.approvedCount + s.dismissedCount;
        return total >= 5 && (s.dismissedCount / total) > 0.7;
      })
      .map(s => s.proposalType);

    // Query CRM data server-side
    const contactRows = await db.select().from(contacts)
      .where(eq(contacts.subAccountId, subAccountId));
    const messageRows = await db.select().from(messagesTable)
      .orderBy(desc(messagesTable.timestamp))
      .limit(20);
    const aptRows = await db.select().from(appointmentsTable)
      .orderBy(desc(appointmentsTable.startTime))
      .limit(10);

    const contactList = contactRows.slice(0, 30).map(c =>
      `- [${c.id}] ${c.name} (${c.email}) | ${c.status} | Score: ${c.leadScore} | Last: ${c.lastActivity} | Tags: ${((c.tags as string[]) || []).join(', ')}`
    ).join('\n');

    const msgList = messageRows.map(m =>
      `- ${m.direction} via ${m.channel} to ${m.contactId}: "${m.content.slice(0, 80)}" (${m.timestamp.toISOString()})`
    ).join('\n');

    const aptList = aptRows.map(a =>
      `- "${a.title}" with ${a.contactName} at ${a.startTime.toISOString()} — ${a.status}`
    ).join('\n');

    const suppressionNote = suppressedTypes.length > 0
      ? `\n\nIMPORTANT: Do NOT suggest actions of these types (the user frequently dismisses them): ${suppressedTypes.join(', ')}`
      : '';

    const systemPrompt = `You are a proactive CRM advisor. Analyze the CRM data and generate up to 5 actionable proposals.

Return a JSON object with:
- "proposals": array of objects, each with:
  - "type": one of "send_message", "update_lead_score", "add_tag", "add_task", "update_contact_status"
  - "title": short action title (5-8 words max)
  - "description": 1-2 sentence explanation
  - "contactId": the contact's UUID if relevant
  - "contactName": the contact's name if relevant
  - "module": "pipeline"
  - "payload": object with action-specific data (e.g., { "content": "...", "channel": "email" } for send_message, { "newScore": 85 } for update_lead_score, { "tag": "..." } for add_tag, { "title": "..." } for add_task)

Focus on stale deals, high-score leads needing follow-up, at-risk contacts, and quick wins.${suppressionNote}

Current CRM Data:
Contacts (${contactRows.length}):
${contactList || 'None'}

Recent Messages (${messageRows.length}):
${msgList || 'None'}

Appointments (${aptRows.length}):
${aptList || 'None'}`;

    const result = await generateJSON<{
      proposals: { type: string; title: string; description: string; contactId?: string; contactName?: string; module: string; payload: Record<string, any> }[];
    }>(systemPrompt, 'Analyze my CRM and suggest proactive actions.');

    const created: any[] = [];
    for (const prop of (result.proposals || []).slice(0, 5)) {
      // Check autonomy tier
      const [setting] = await db.select().from(aiAutonomySettings)
        .where(and(
          eq(aiAutonomySettings.subAccountId, subAccountId),
          eq(aiAutonomySettings.proposalType, prop.type as any)
        )).limit(1);
      const tier = setting?.tier || getDefaultTier(prop.type);
      const isAutoApprove = tier === 'auto_approve';

      const [inserted] = await db.insert(aiProposals).values({
        subAccountId,
        type: prop.type as any,
        status: isAutoApprove ? 'auto_approved' : 'pending',
        title: prop.title,
        description: prop.description || '',
        module: prop.module || 'pipeline',
        contactId: prop.contactId || null,
        contactName: prop.contactName || null,
        payload: prop.payload || {},
        source: 'proactive',
        resolvedAt: isAutoApprove ? new Date() : null,
      }).returning();

      if (isAutoApprove) {
        await executeProposalAction({ type: inserted.type, contactId: inserted.contactId, contactName: inserted.contactName, payload: inserted.payload as Record<string, any> });
        await incrementStat(subAccountId, prop.type, 'auto_approved');
      }

      created.push({ ...serializeProposal(inserted), autoApproved: isAutoApprove, tier });
    }

    if (subAccountId) logUsage(subAccountId, 'ai_proactive_insights').catch(console.error);
    res.json({ proposals: created, suppressedTypes });
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// ── POST /api/ai/generate-content — AI content generation for marketing copy ──
router.post('/generate-content', requireQuota('ai_generate_content'), async (req, res, next) => {
  try {
    const { type, prompt, tone } = req.body as {
      type: 'email' | 'social' | 'ad';
      prompt: string;
      tone?: string;
    };

    if (!type || !prompt) {
      return res.status(400).json({ error: 'type and prompt are required' });
    }

    if (!['email', 'social', 'ad'].includes(type)) {
      return res.status(400).json({ error: 'type must be one of: email, social, ad' });
    }

    const toneInstruction = tone ? `Tone: ${tone}` : 'Tone: Professional';

    const typeInstructions: Record<string, string> = {
      email: `Generate a marketing email. Return a JSON object with:
- "subject": a compelling email subject line
- "body": the full email body text (use clear paragraphs, be persuasive)
- "callToAction": a strong call-to-action button text`,
      social: `Generate a social media post. Return a JSON object with:
- "caption": the post caption text (engaging, concise)
- "hashtags": array of relevant hashtags (without # prefix, 5-10 tags)
- "platform": the best platform for this content ("Instagram", "Twitter", "LinkedIn", or "Facebook")`,
      ad: `Generate ad copy. Return a JSON object with:
- "headline": a short, attention-grabbing headline (under 30 characters ideally)
- "description": the ad description text (1-2 sentences, persuasive)
- "callToAction": a call-to-action button text (e.g., "Shop Now", "Learn More")`,
    };

    const systemPrompt = `You are an expert marketing copywriter. ${typeInstructions[type]}

${toneInstruction}

Be creative, persuasive, and on-brand. Write copy that converts.`;

    const raw = await generateJSON<Record<string, any>>(
      systemPrompt,
      `Create ${type} content for: ${prompt}`
    );

    // Gemini sometimes wraps JSON responses in an array — unwrap if needed
    const result = Array.isArray(raw) ? raw[0] : raw;

    const subAccountId = req.body.subAccountId as string;
    if (subAccountId) logUsage(subAccountId, 'ai_generate_content').catch(console.error);
    res.json(result);
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// ── POST /api/ai/local-seo — Apify-first with Gemini fallback ──
const SEARCH_CACHE_TTL_HOURS = parseInt(process.env.SEARCH_CACHE_TTL_HOURS || '24', 10);

router.post('/local-seo', requireQuota('ai_local_seo'), async (req, res, next) => {
  try {
    const { industry, location, coords, subAccountId, resultCount, forceRefresh } = req.body as { industry?: string; location?: string; coords?: { lat: number; lng: number }; subAccountId?: string; resultCount?: number; forceRefresh?: boolean };
    if (!industry || !location) {
      res.status(400).json({ error: 'industry and location are required' });
      return;
    }

    const count = Math.min(Math.max(resultCount || 5, 1), 50); // clamp 1–50
    const query = `${industry} in ${location}`;

    // ── Layer 0: Check existing contacts in database ──
    if (!forceRefresh && subAccountId) {
      const existingContacts = await db.select().from(contacts)
        .where(and(
          eq(contacts.subAccountId, subAccountId),
          eq(contacts.source, 'Local SEO Discovery'),
          sql`${contacts.customFields}->>'industry' = ${industry}`,
          sql`${contacts.customFields}->>'location' = ${location}`,
        ))
        .orderBy(sql`${contacts.createdAt} DESC`);

      if (existingContacts.length >= count) {
        // Rebuild the response format from existing contacts
        const sources = existingContacts.map(c => {
          const cf = (c.customFields as Record<string, any>) || {};
          return {
            maps: {
              title: c.name,
              rating: cf.rating || '',
              uri: cf.google_maps_url || '',
            },
            structured: {
              website: cf.website || null,
              phone: c.phone || null,
              address: cf.address || '',
              reviewsCount: cf.reviews_count || null,
              categories: cf.categories || [],
              categoryName: cf.category || '',
            },
          };
        });

        const textLines = existingContacts.map((c, i) => {
          const cf = (c.customFields as Record<string, any>) || {};
          return `${i + 1}. **${c.name}**\n` +
            `   - **Email:** ${c.email || 'Not found'}\n` +
            `   - **Website:** ${cf.website || 'Not found'}\n` +
            `   - **Phone:** ${c.phone || 'Not found'}\n` +
            `   - **Address:** ${cf.address || 'N/A'}`;
        });
        const text = `Found ${existingContacts.length} ${industry} businesses in ${location} (from database):\n\n${textLines.join('\n\n')}`;

        const businesses = existingContacts.map(c => {
          const cf = (c.customFields as Record<string, any>) || {};
          return {
            title: c.name,
            totalScore: cf.rating ? parseFloat(cf.rating) : null,
            reviewsCount: cf.reviews_count || null,
            address: cf.address || '',
            phone: c.phone || null,
            website: cf.website || null,
            url: cf.google_maps_url || '',
            categoryName: cf.category || '',
            categories: cf.categories || [],
          };
        });

        console.log(`[local-seo] Database hit for "${query}" — ${existingContacts.length} existing contacts`);
        res.json({
          text,
          sources,
          businesses,
          dataSource: 'apify',
          fromDatabase: true,
          existingCount: existingContacts.length,
        });
        return;
      }
    }

    // ── Layer 1: Search cache — return recent search results if available ──
    if (!forceRefresh && subAccountId) {
      const cacheThreshold = new Date(Date.now() - SEARCH_CACHE_TTL_HOURS * 3600_000);
      const [cached] = await db.select()
        .from(searchResults)
        .where(and(
          eq(searchResults.subAccountId, subAccountId),
          eq(searchResults.searchType, 'local_seo'),
          eq(searchResults.query, query),
          gte(searchResults.createdAt, cacheThreshold),
        ))
        .orderBy(sql`${searchResults.createdAt} DESC`)
        .limit(1);

      if (cached) {
        const cachedResult = cached.result as Record<string, any>;
        const cachedSources = (cachedResult.sources || []) as any[];
        // Only use cache if it has enough results (at least what was requested, or all available)
        if (cachedSources.length >= count || cachedSources.length >= 1) {
          const ageMinutes = Math.round((Date.now() - cached.createdAt.getTime()) / 60_000);
          console.log(`[local-seo] Cache hit for "${query}" (${cachedSources.length} results, ${ageMinutes}min old)`);
          res.json({ ...cachedResult, cached: true, cacheAge: ageMinutes });
          return;
        }
      }
    }

    // ── Strategy 1: Apify Google Maps Scraper (structured data) ──
    if (process.env.APIFY_TOKEN) {
      try {
        const { searchGoogleMaps } = await import('../lib/apify.js');
        const apifyResult = await searchGoogleMaps({
          query: `${industry} in ${location}`,
          maxResults: count,
        });

        if (apifyResult.places.length > 0) {
          // Map Apify places to the source format the frontend expects
          const sources = apifyResult.places.map(place => ({
            maps: {
              title: place.title,
              rating: place.totalScore?.toString() || '',
              uri: place.url,
            },
            structured: {
              website: place.website,
              phone: place.phone,
              address: place.address,
              reviewsCount: place.reviewsCount,
              categories: place.categories,
              categoryName: place.categoryName,
            },
          }));

          // Generate a formatted text summary for display
          const textLines = apifyResult.places.map((p, i) => {
            return `${i + 1}. **${p.title}**\n` +
              `   - **Website:** ${p.website || 'Not found'}\n` +
              `   - **Phone:** ${p.phone || 'Not found'}\n` +
              `   - **Google Rating:** ${p.totalScore ?? 'N/A'} (${p.reviewsCount ?? 0} reviews)\n` +
              `   - **Address:** ${p.address || 'N/A'}\n` +
              `   - **Category:** ${p.categoryName || 'N/A'}`;
          });
          const text = `Found ${apifyResult.places.length} ${industry} businesses in ${location}:\n\n${textLines.join('\n\n')}`;

          // Optional: single Gemini call for reputation analysis
          let analysisText = '';
          try {
            const { groundedSearch } = await import('../lib/gemini-grounded.js');
            const businessList = apifyResult.places.map(p =>
              `- ${p.title}: ${p.totalScore ?? 'N/A'} stars, ${p.reviewsCount ?? 0} reviews`
            ).join('\n');

            const analysisPrompt = `Analyze these ${industry} businesses in ${location} for reputation management opportunities:

${businessList}

For each business, provide:
1. **Reputation Gap** — specific issues with their online presence (low rating, few reviews, no response to reviews, etc.)
2. **Recommended Outreach** — a tailored strategy for reaching out to this business

Format: Use the exact business name as a heading, then the two fields.`;

            const analysis = await groundedSearch(analysisPrompt, { tools: [{ googleSearch: {} }] });
            analysisText = analysis.text || '';
          } catch (analysisErr) {
            console.log('[local-seo] Gemini analysis skipped:', (analysisErr as Error).message);
          }

          const result = {
            text: analysisText || text,
            sources,
            businesses: apifyResult.places,
            dataSource: 'apify' as const,
          };

          if (subAccountId) {
            logUsage(subAccountId, 'ai_local_seo').catch(console.error);
            saveSearchResult(subAccountId, 'local_seo', `${industry} in ${location}`, result).catch(console.error);
          }

          console.log(`[local-seo] Apify returned ${apifyResult.places.length} places in ${apifyResult.durationMs}ms`);
          res.json(result);
          return;
        }

        console.log('[local-seo] Apify returned 0 places, falling back to Gemini');
      } catch (apifyErr) {
        console.error('[local-seo] Apify failed, falling back to Gemini:', (apifyErr as Error).message);
      }
    }

    // ── Strategy 2: Gemini grounded search (fallback) ──
    const { groundedSearch } = await import('../lib/gemini-grounded.js');

    const prompt = `Find ${count} ${industry} businesses in ${location} that have low Google ratings or few reviews.

For each business, provide ALL of the following in a structured format:
1. **Business Name** — the exact name
2. **Website** — the business website URL (look it up, e.g. their .com or domain). If not found, write "Not found"
3. **Email** — their business email address if publicly available. If not found, write "Not found"
4. **Phone** — their phone number if available. If not found, write "Not found"
5. **Owner Name** — the owner or manager's name if publicly known. If not found, write "Not found"
6. **Google Rating** — their star rating (e.g. 3.2)
7. **Review Count** — approximate number of reviews
8. **Reputation Gap** — why they need help (specific issues with their online presence)
9. **Recommended Outreach** — a tailored strategy for reaching out to this business

Format each business clearly with the labels above so the data can be parsed.`;

    const tools: any[] = [{ googleMaps: {} }, { googleSearch: {} }];

    const geminiResult = await groundedSearch(prompt, { tools });
    const result = { ...geminiResult, dataSource: 'gemini' as const };
    if (subAccountId) {
      logUsage(subAccountId, 'ai_local_seo').catch(console.error);
      saveSearchResult(subAccountId, 'local_seo', `${industry} in ${location}`, result).catch(console.error);
    }
    res.json(result);
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// Helper: retry a function on rate limit errors (waits + retries up to 3 times)
async function withRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof RateLimitError && attempt < maxRetries) {
        const waitMs = Math.min(err.retryAfterMs + 500, 15000); // wait + buffer, max 15s
        console.log(`[enrich-lead] Rate limited, waiting ${Math.ceil(waitMs / 1000)}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Unreachable');
}

// ── Shared enrichment logic (used by single + batch endpoints) ──

interface EnrichResult {
  success: boolean;
  contactName: string;
  enrichedEmail: string;
  emailConfidence: string | null;
  ownerName: string;
  services: string;
  painPoints: string;
  socialLinks: string;
  discoveryDetails: { strategies: any[]; totalDurationMs: number; candidatesFound: number };
  skipped?: boolean;
  reason?: string;
}

async function enrichContactInternal(contactId: string, subAccountId?: string): Promise<EnrichResult> {
  // 1. Fetch the contact
  const [contact] = await db.select().from(contacts)
    .where(eq(contacts.id, contactId)).limit(1);
  if (!contact) throw new Error('Contact not found');

  const customFields = (contact.customFields as Record<string, any>) || {};
  const alreadyEnriched = !!customFields.enriched_at;
  const businessName = contact.name;
  let website = customFields.website || '';
  const location = customFields.location || '';
  const industry = customFields.industry || '';

  // Skip if already enriched and already has an email
  if (alreadyEnriched && contact.email) {
    return {
      success: true,
      contactName: businessName,
      enrichedEmail: contact.email,
      emailConfidence: null,
      ownerName: customFields.owner_name || '',
      services: customFields.services || '',
      painPoints: customFields.pain_points || '',
      socialLinks: customFields.social_links || '',
      discoveryDetails: { strategies: [], totalDurationMs: 0, candidatesFound: 0 },
      skipped: true,
      reason: 'Already enriched with email',
    };
  }

  // 2. Resolve website if missing (uses Places API or Gemini search)
  if (!website && businessName) {
    try {
      const { resolveWebsite } = await import('../lib/website-resolver.js');
      const resolved = await withRateLimitRetry(() => resolveWebsite({
        businessName,
        location,
        googleMapsUrl: customFields.google_maps_url || '',
        placeId: customFields.place_id || '',
      }));
      if (resolved.website) {
        website = resolved.website;
        console.log(`[enrich] Resolved website for "${businessName}": ${website} (via ${resolved.source}, ${resolved.durationMs}ms)`);
      }
    } catch (err) {
      console.error('[enrich] Website resolution failed:', err);
    }
  }

  // 3. Multi-strategy email discovery (combined: email + business data in 1 Gemini call)
  const { discoverEmail } = await import('../lib/email-discovery.js');

  const discoveryResult = await withRateLimitRetry(() => discoverEmail({
    businessName,
    website,
    location,
    industry,
    skipGemini: false,
    includeBusinessData: true, // combined call: email + owner/services/pain points/social in 1 Gemini call
  }));

  const validEmail = discoveryResult.email;

  // Business data comes from the combined Gemini call (or is empty if Gemini was skipped/scraping found email)
  const ownerName = discoveryResult.businessData?.ownerName || customFields.owner_name || '';
  const services = discoveryResult.businessData?.services || customFields.services || '';
  const painPoints = discoveryResult.businessData?.painPoints || customFields.pain_points || '';
  const socialLinks = discoveryResult.businessData?.socialLinks || customFields.social_links || '';

  // 5. Determine which strategy found the email
  const emailSource = validEmail
    ? discoveryResult.allCandidates.find(c => c.email === validEmail)?.source || 'unknown'
    : 'none';
  const emailConfidence = validEmail
    ? discoveryResult.allCandidates.find(c => c.email === validEmail)?.confidence || null
    : null;

  // 6. Update the contact with enriched data
  const updatedCustomFields = {
    ...customFields,
    website: website || customFields.website || undefined,
    enriched_email: validEmail || undefined,
    owner_name: ownerName || customFields.owner_name || undefined,
    services: services || customFields.services || undefined,
    pain_points: painPoints || customFields.pain_points || undefined,
    social_links: socialLinks || customFields.social_links || undefined,
    enrichment_source: emailSource,
    enrichment_strategies: discoveryResult.strategies.map(s => ({ name: s.name, result: s.result, durationMs: s.durationMs })),
    enriched_at: new Date().toISOString(),
  };

  const updatePayload: Record<string, any> = {
    customFields: updatedCustomFields,
    lastActivity: 'Lead enriched via AI',
  };

  if (validEmail && !contact.email) {
    updatePayload.email = validEmail;
  }

  await db.update(contacts)
    .set(updatePayload)
    .where(eq(contacts.id, contactId));

  // 7. Log activity with strategy details
  const strategyNames = discoveryResult.strategies
    .filter(s => s.result === 'found')
    .map(s => s.name)
    .join(', ');

  await db.insert(activities).values({
    contactId,
    type: 'scraping_event',
    content: `Email discovery: ${validEmail ? `Found ${validEmail} via ${strategyNames}` : 'No email found'}. ` +
      `Tried ${discoveryResult.strategies.filter(s => s.attempted).length} strategies in ${discoveryResult.totalDurationMs}ms. ` +
      `Owner: ${ownerName || 'Unknown'}. Services: ${services || 'N/A'}`,
  });

  // 8. Update lead score
  await recalculateLeadScore(contactId, 'enrichment');

  // 9. Log usage
  if (subAccountId) {
    logUsage(subAccountId, 'ai_lead_enrichment', {
      contactId,
      emailFound: !!validEmail,
      emailSource,
      strategies: discoveryResult.strategies.map(s => ({ name: s.name, result: s.result, durationMs: s.durationMs })),
    }).catch(console.error);
  }

  return {
    success: true,
    contactName: businessName,
    enrichedEmail: validEmail,
    emailConfidence,
    ownerName: ownerName || customFields.owner_name || '',
    services: services || customFields.services || '',
    painPoints: painPoints || customFields.pain_points || '',
    socialLinks: socialLinks || customFields.social_links || '',
    discoveryDetails: {
      strategies: discoveryResult.strategies,
      totalDurationMs: discoveryResult.totalDurationMs,
      candidatesFound: discoveryResult.allCandidates.length,
    },
  };
}

// ── POST /api/ai/enrich-lead — Single contact enrichment ──
router.post('/enrich-lead', requireQuota('ai_lead_enrichment'), async (req, res, next) => {
  try {
    const { contactId, subAccountId } = req.body as { contactId?: string; subAccountId?: string };
    if (!contactId) { res.status(400).json({ error: 'contactId is required' }); return; }

    const result = await enrichContactInternal(contactId, subAccountId);
    res.json(result);
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// ── Batch Enrichment — server-side queue with rate-limit-aware pacing ──

interface BatchJob {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  results: Array<{
    contactId: string;
    contactName: string;
    status: 'success' | 'failed' | 'skipped';
    enrichedEmail?: string;
    error?: string;
  }>;
  startedAt: string;
  completedAt?: string;
}

const batchJobs = new Map<string, BatchJob>();

// Cleanup old batch jobs every 10 minutes (remove jobs older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 3600_000;
  for (const [id, job] of batchJobs) {
    if (new Date(job.startedAt).getTime() < oneHourAgo) {
      batchJobs.delete(id);
    }
  }
}, 600_000);

async function processBatch(job: BatchJob, contactIds: string[], subAccountId?: string) {
  for (let i = 0; i < contactIds.length; i++) {
    const contactId = contactIds[i];
    try {
      console.log(`[batch-enrich] Processing ${i + 1}/${contactIds.length}: ${contactId}`);
      const result = await enrichContactInternal(contactId, subAccountId);
      job.results.push({
        contactId,
        contactName: result.contactName,
        status: result.skipped ? 'skipped' : 'success',
        enrichedEmail: result.enrichedEmail || undefined,
      });
    } catch (err: any) {
      console.error(`[batch-enrich] Failed for ${contactId}:`, err.message);
      job.results.push({
        contactId,
        contactName: '',
        status: 'failed',
        error: err.message,
      });
    }
    job.processed = job.results.length;

    // 6s buffer between contacts — matches CLI script's proven rate-limit-safe delay
    if (i < contactIds.length - 1) {
      await new Promise(r => setTimeout(r, 6000));
    }
  }

  job.status = 'completed';
  job.completedAt = new Date().toISOString();
  const successCount = job.results.filter(r => r.status === 'success').length;
  const emailCount = job.results.filter(r => r.enrichedEmail).length;
  console.log(`[batch-enrich] Batch ${job.id} completed: ${successCount}/${job.total} enriched, ${emailCount} emails found`);
}

// POST /api/ai/batch-enrich — Start batch enrichment (returns immediately with batchId)
router.post('/batch-enrich', requireQuota('ai_lead_enrichment'), async (req, res, next) => {
  console.log('[batch-enrich] ▶ POST received. contactIds:', req.body?.contactIds?.length, 'subAccountId:', req.body?.subAccountId || '(none)');
  try {
    const { contactIds, subAccountId } = req.body as { contactIds?: string[]; subAccountId?: string };
    if (!contactIds?.length) {
      console.error('[batch-enrich] ✘ No contactIds provided');
      res.status(400).json({ error: 'contactIds array is required' });
      return;
    }

    const batchId = crypto.randomUUID();
    const job: BatchJob = {
      id: batchId,
      status: 'processing',
      total: contactIds.length,
      processed: 0,
      results: [],
      startedAt: new Date().toISOString(),
    };
    batchJobs.set(batchId, job);

    // Return immediately — processing happens in background
    res.json({ batchId, total: contactIds.length });

    // Fire-and-forget background processing
    processBatch(job, contactIds, subAccountId).catch(err => {
      console.error('[batch-enrich] Fatal error:', err);
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
    });
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// GET /api/ai/batch-enrich/:batchId — Poll for batch progress
router.get('/batch-enrich/:batchId', (req, res) => {
  const job = batchJobs.get(req.params.batchId);
  if (!job) {
    res.status(404).json({ error: 'Batch not found' });
    return;
  }

  res.json({
    batchId: job.id,
    status: job.status,
    total: job.total,
    processed: job.processed,
    results: job.results,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});

// ── POST /api/ai/market-research — Proxy for grounded web search ──
router.post('/market-research', requireQuota('ai_market_research'), async (req, res, next) => {
  try {
    const { query, subAccountId } = req.body as { query?: string; subAccountId?: string };
    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }

    const { groundedSearch } = await import('../lib/gemini-grounded.js');

    const prompt = `Analyze the current market landscape for: ${query}. Focus on competitors, trending search intent, and recent news. Provide actionable marketing advice.`;

    const result = await groundedSearch(prompt, {
      tools: [{ googleSearch: {} }],
    });
    if (subAccountId) {
      logUsage(subAccountId, 'ai_market_research').catch(console.error);
      saveSearchResult(subAccountId, 'market_research', query, result).catch(console.error);
    }
    res.json(result);
  } catch (err) {
    handleAIError(err, res, next);
  }
});

// ── GET /api/ai/content-library — List saved content items ──
router.get('/content-library', async (req, res, next) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    const type = req.query.type as string | undefined;
    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    const conditions = [eq(aiGeneratedContent.subAccountId, subAccountId)];
    if (type && ['email', 'social', 'ad'].includes(type)) {
      conditions.push(eq(aiGeneratedContent.contentType, type));
    }

    const rows = await db.select().from(aiGeneratedContent)
      .where(and(...conditions))
      .orderBy(desc(aiGeneratedContent.createdAt))
      .limit(50);

    res.json({
      items: rows.map(r => ({
        id: r.id,
        subAccountId: r.subAccountId,
        contentType: r.contentType,
        prompt: r.prompt,
        tone: r.tone,
        content: r.content as Record<string, unknown>,
        title: r.title,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) { next(err); }
});

// ── POST /api/ai/content-library — Save generated content ──
router.post('/content-library', async (req, res, next) => {
  try {
    const { subAccountId, contentType, prompt, tone, content, title } = req.body as {
      subAccountId: string;
      contentType: string;
      prompt: string;
      tone: string;
      content: Record<string, unknown>;
      title: string;
    };
    if (!subAccountId || !contentType || !content || !title) {
      return res.status(400).json({ error: 'subAccountId, contentType, content, and title are required' });
    }

    const [item] = await db.insert(aiGeneratedContent).values({
      subAccountId,
      contentType,
      prompt: prompt || '',
      tone: tone || 'Professional',
      content,
      title,
    }).returning();

    res.json({
      id: item.id,
      subAccountId: item.subAccountId,
      contentType: item.contentType,
      prompt: item.prompt,
      tone: item.tone,
      content: item.content as Record<string, unknown>,
      title: item.title,
      createdAt: item.createdAt.toISOString(),
    });
  } catch (err) { next(err); }
});

// ── DELETE /api/ai/content-library/:id — Delete saved content ──
router.delete('/content-library/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.delete(aiGeneratedContent).where(eq(aiGeneratedContent.id, id));
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// VOICE AI ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /api/ai/voice-token — Return Gemini API key for authenticated users ──
router.get('/voice-token', async (req, res, next) => {
  try {
    const subAccountId = req.query.subAccountId as string | undefined;
    const apiKey = await resolveGeminiApiKey(subAccountId) || '';
    if (!apiKey) {
      return res.status(503).json({ error: 'Voice AI not configured. Add your Gemini API key in Integration Hub.' });
    }
    res.json({ apiKey });
  } catch (err) { next(err); }
});

// ── POST /api/ai/voice-prompt — Build CRM-aware system prompt for Voice AI ──
router.post('/voice-prompt', async (req, res, next) => {
  try {
    const { subAccountId, contactId } = req.body as {
      subAccountId: string;
      contactId?: string;
    };

    if (!subAccountId) return res.status(400).json({ error: 'subAccountId is required' });

    let contactName: string | null = null;
    let contactSection = 'No specific caller identified. Gather their name and information during the conversation.';

    // If a contact is selected, fetch their full profile + history
    if (contactId) {
      const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
      if (contact) {
        contactName = contact.name;

        // Fetch recent activities and messages for this contact
        const [contactActivities, contactMessages] = await Promise.all([
          db.select().from(activities)
            .where(eq(activities.contactId, contactId))
            .orderBy(desc(activities.timestamp))
            .limit(10),
          db.select().from(messagesTable)
            .where(eq(messagesTable.contactId, contactId))
            .orderBy(desc(messagesTable.createdAt))
            .limit(10),
        ]);

        const activityLines = contactActivities
          .map(a => `- [${a.type}] ${a.content} (${a.timestamp.toISOString()})`)
          .join('\n');

        const messageLines = contactMessages
          .map(m => `- [${m.direction}] via ${m.channel}: "${m.content.slice(0, 100)}" (${m.createdAt.toISOString()})`)
          .join('\n');

        contactSection = `You are speaking with ${contact.name}.
- Email: ${contact.email || 'N/A'}
- Phone: ${contact.phone || 'N/A'}
- Status: ${contact.status}
- Lead Score: ${contact.leadScore}
- Tags: ${(contact.tags as string[] || []).join(', ') || 'None'}
- Last Activity: ${contact.lastActivity}

### Recent Activity (${contactActivities.length})
${activityLines || 'No recent activities.'}

### Message History (${contactMessages.length})
${messageLines || 'No recent messages.'}`;
      }
    }

    // Fetch top contacts for general CRM awareness
    const topContacts = await db.select().from(contacts)
      .where(eq(contacts.subAccountId, subAccountId))
      .orderBy(desc(contacts.leadScore))
      .limit(15);

    const contactList = topContacts
      .map(c => `- ${c.name} (${c.email}) | Status: ${c.status} | Score: ${c.leadScore} | Tags: ${(c.tags as string[] || []).join(', ')}`)
      .join('\n');

    // Fetch upcoming appointments
    const upcomingApts = await db.select().from(appointmentsTable)
      .where(gte(appointmentsTable.startTime, new Date()))
      .orderBy(appointmentsTable.startTime)
      .limit(5);

    const aptList = upcomingApts
      .map(a => `- "${a.title}" with ${a.contactName} | ${a.startTime.toISOString()} – ${a.endTime.toISOString()} | ${a.status}`)
      .join('\n');

    const systemPrompt = `You are Sarah, a professional voice agent for Nexus CRM. You are currently on a live voice call.
Your primary goal is: Help clients book appointments, qualify leads, and provide information with a cheerful and professional tone.

## Caller Information
${contactSection}

## CRM Context
### Contacts (${topContacts.length} top contacts)
${contactList || 'No contacts loaded.'}

### Upcoming Appointments (${upcomingApts.length})
${aptList || 'No upcoming appointments.'}

## Voice Behavior Guidelines
- Keep responses concise (1-3 sentences) for natural conversation flow
- When booking appointments, confirm date, time, and purpose
- When qualifying leads, ask about budget, timeline, and needs
- Always confirm key information by repeating it back
- If the caller asks for something you cannot do, offer to have someone follow up
- Maintain a cheerful and professional tone throughout
- Never mention that you are an AI unless directly asked`;

    res.json({ systemPrompt, contactName });
  } catch (err) { next(err); }
});

// ── POST /api/ai/voice-log — Log voice call to CRM after it ends ──
router.post('/voice-log', requireQuota('ai_voice_call'), async (req, res, next) => {
  try {
    const { subAccountId, contactId, transcription, durationSeconds } = req.body as {
      subAccountId: string;
      contactId?: string;
      transcription: string;
      durationSeconds: number;
    };

    if (!subAccountId || !transcription?.trim()) {
      return res.status(400).json({ error: 'subAccountId and transcription are required' });
    }

    // Look up contact info if contactId provided
    let contactName = 'Unknown Caller';
    let contactPhone = '';
    if (contactId) {
      const [contact] = await db.select({ name: contacts.name, phone: contacts.phone })
        .from(contacts).where(eq(contacts.id, contactId)).limit(1);
      if (contact) {
        contactName = contact.name;
        contactPhone = contact.phone;
      }
    }

    // Generate AI summary of the call (graceful degradation if rate limited)
    let summary: Record<string, any> | null = null;
    try {
      const apiKey = await resolveGeminiApiKey(subAccountId) || undefined;
      summary = await generateJSON(
        `Summarize this voice call transcription. Note: this transcription captures only the AI agent's spoken words, not the caller's side of the conversation. Infer context where possible.

Return a JSON object with these fields:
- "summary": 2-3 sentence overview of what was discussed
- "outcome": one of "appointment_booked", "lead_qualified", "information_provided", "follow_up_needed", "no_action"
- "keyPoints": array of 3-5 bullet-point takeaways
- "nextAction": specific recommended next step
- "sentiment": "positive", "neutral", or "negative"`,
        `Transcription (${durationSeconds}s call with ${contactName}):\n${transcription.slice(0, 8000)}`,
        apiKey,
      );
    } catch (err) {
      console.warn('[voice-log] AI summary failed, logging raw transcription:', err);
    }

    // Build notes content
    const notes = JSON.stringify({
      ...(summary || {}),
      transcription: transcription.slice(0, 5000),
      source: 'voice_ai',
    });

    // Insert call log
    const [logEntry] = await db.insert(callLogs).values({
      subAccountId,
      contactId: contactId || null,
      contactName,
      contactPhone,
      direction: 'inbound',
      status: 'completed',
      duration: durationSeconds,
      notes,
      endedAt: new Date(),
    }).returning();

    // If contact provided, log activity + update lastActivity
    if (contactId) {
      const activityContent = summary
        ? `Voice AI call (${durationSeconds}s): ${summary.summary}`
        : `Voice AI call (${durationSeconds}s)`;

      await Promise.all([
        db.insert(activities).values({
          contactId,
          type: 'note',
          content: activityContent,
        }),
        db.update(contacts)
          .set({ lastActivity: 'Voice AI call' })
          .where(eq(contacts.id, contactId)),
      ]);
    }

    // Log usage
    await logUsage(subAccountId, 'ai_voice_call');

    res.json({
      callLogId: logEntry.id,
      summary: summary || null,
    });
  } catch (err) { handleAIError(err, res, next); }
});

export default router;
