import { Router, Request, Response } from 'express';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { contacts, messages, appointments, usageLogs, sequenceEnrollments, emailSequences } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// ── Helpers ──

interface DateRange {
  from: Date;
  to: Date;
}

function parseDateRange(query: { from?: string; to?: string }): DateRange {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function getPreviousPeriod(range: DateRange): DateRange {
  const durationMs = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - durationMs),
    to: new Date(range.from.getTime()),
  };
}

function escapeCsvField(value: string): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

function generateDateArray(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const current = new Date(from);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(23, 59, 59, 999);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

// ── GET /api/reporting/overview ──
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const range = parseDateRange(req.query as { from?: string; to?: string });
    const prev = getPreviousPeriod(range);

    // Total contacts for this sub-account (all time)
    const [totalResult] = await db
      .select({ value: count() })
      .from(contacts)
      .where(eq(contacts.subAccountId, subAccountId));
    const totalContacts = totalResult?.value ?? 0;

    // New contacts in current period
    const [newResult] = await db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(contacts.createdAt, range.from),
          lte(contacts.createdAt, range.to),
        ),
      );
    const newContacts = newResult?.value ?? 0;

    // Closed contacts (conversions) in current period
    const [closedResult] = await db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          eq(contacts.status, 'Closed'),
          gte(contacts.createdAt, range.from),
          lte(contacts.createdAt, range.to),
        ),
      );
    const closedContacts = closedResult?.value ?? 0;
    const conversionRate = totalContacts > 0
      ? Math.round((closedContacts / totalContacts) * 10000) / 100
      : 0;

    // Messages in current period (join through contacts for sub-account scoping)
    const [msgResult] = await db
      .select({ value: count() })
      .from(messages)
      .innerJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(messages.timestamp, range.from),
          lte(messages.timestamp, range.to),
        ),
      );
    const totalMessages = msgResult?.value ?? 0;

    // Appointments in current period (join through contacts for sub-account scoping)
    const [aptResult] = await db
      .select({ value: count() })
      .from(appointments)
      .innerJoin(contacts, eq(appointments.contactId, contacts.id))
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(appointments.startTime, range.from),
          lte(appointments.startTime, range.to),
        ),
      );
    const totalAppointments = aptResult?.value ?? 0;

    // Pipeline value: non-archived contacts * leadValue (default 500)
    const [activeResult] = await db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          eq(contacts.isArchived, false),
        ),
      );
    const activeContacts = activeResult?.value ?? 0;
    const leadValue = 500; // Default lead value
    const pipelineValue = activeContacts * leadValue;

    // ── Previous period comparison ──

    const [prevNewResult] = await db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(contacts.createdAt, prev.from),
          lte(contacts.createdAt, prev.to),
        ),
      );
    const prevNewContacts = prevNewResult?.value ?? 0;

    const [prevTotalResult] = await db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          lte(contacts.createdAt, prev.to),
        ),
      );
    const prevTotal = prevTotalResult?.value ?? 0;

    const [prevClosedResult] = await db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          eq(contacts.status, 'Closed'),
          gte(contacts.createdAt, prev.from),
          lte(contacts.createdAt, prev.to),
        ),
      );
    const prevClosed = prevClosedResult?.value ?? 0;
    const prevConversionRate = prevTotal > 0
      ? Math.round((prevClosed / prevTotal) * 10000) / 100
      : 0;

    const [prevMsgResult] = await db
      .select({ value: count() })
      .from(messages)
      .innerJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(messages.timestamp, prev.from),
          lte(messages.timestamp, prev.to),
        ),
      );
    const prevTotalMessages = prevMsgResult?.value ?? 0;

    res.json({
      totalContacts,
      newContacts,
      conversionRate,
      totalMessages,
      totalAppointments,
      pipelineValue,
      previousPeriod: {
        newContacts: prevNewContacts,
        conversionRate: prevConversionRate,
        totalMessages: prevTotalMessages,
      },
    });
  } catch (err) {
    console.error('Reporting overview error:', err);
    res.status(500).json({ error: 'Failed to fetch reporting overview' });
  }
});

// ── GET /api/reporting/pipeline ──
router.get('/pipeline', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const range = parseDateRange(req.query as { from?: string; to?: string });

    const rows = await db
      .select({
        stage: contacts.status,
        count: count(),
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(contacts.createdAt, range.from),
          lte(contacts.createdAt, range.to),
        ),
      )
      .groupBy(contacts.status);

    // Ensure all stages are present even if count is zero
    const stageOrder = ['Lead', 'Interested', 'Appointment', 'Closed'] as const;
    const stageMap = new Map<string, number>(rows.map(r => [r.stage, r.count]));
    const result = stageOrder.map(stage => ({
      stage,
      count: stageMap.get(stage) ?? 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('Reporting pipeline error:', err);
    res.status(500).json({ error: 'Failed to fetch pipeline data' });
  }
});

// ── GET /api/reporting/activity ──
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const range = parseDateRange(req.query as { from?: string; to?: string });
    const dates = generateDateArray(range.from, range.to);

    // Contacts per day
    const contactRows = await db
      .select({
        date: sql<string>`date_trunc('day', ${contacts.createdAt})::date`,
        count: count(),
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(contacts.createdAt, range.from),
          lte(contacts.createdAt, range.to),
        ),
      )
      .groupBy(sql`date_trunc('day', ${contacts.createdAt})::date`);

    // Messages per day (scoped to sub-account through contacts join)
    const messageRows = await db
      .select({
        date: sql<string>`date_trunc('day', ${messages.timestamp})::date`,
        count: count(),
      })
      .from(messages)
      .innerJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(messages.timestamp, range.from),
          lte(messages.timestamp, range.to),
        ),
      )
      .groupBy(sql`date_trunc('day', ${messages.timestamp})::date`);

    // Appointments per day (scoped to sub-account through contacts join)
    const appointmentRows = await db
      .select({
        date: sql<string>`date_trunc('day', ${appointments.startTime})::date`,
        count: count(),
      })
      .from(appointments)
      .innerJoin(contacts, eq(appointments.contactId, contacts.id))
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(appointments.startTime, range.from),
          lte(appointments.startTime, range.to),
        ),
      )
      .groupBy(sql`date_trunc('day', ${appointments.startTime})::date`);

    // Build lookup maps (normalize date keys to YYYY-MM-DD strings)
    const contactMap = new Map(
      contactRows.map(r => [formatDate(r.date), r.count]),
    );
    const messageMap = new Map(
      messageRows.map(r => [formatDate(r.date), r.count]),
    );
    const appointmentMap = new Map(
      appointmentRows.map(r => [formatDate(r.date), r.count]),
    );

    const result = dates.map(date => ({
      date,
      contacts: contactMap.get(date) ?? 0,
      messages: messageMap.get(date) ?? 0,
      appointments: appointmentMap.get(date) ?? 0,
    }));

    res.json(result);
  } catch (err) {
    console.error('Reporting activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity data' });
  }
});

// ── GET /api/reporting/sources ──
router.get('/sources', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const range = parseDateRange(req.query as { from?: string; to?: string });

    const rows = await db
      .select({
        source: contacts.source,
        count: count(),
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(contacts.createdAt, range.from),
          lte(contacts.createdAt, range.to),
        ),
      )
      .groupBy(contacts.source);

    res.json(rows);
  } catch (err) {
    console.error('Reporting sources error:', err);
    res.status(500).json({ error: 'Failed to fetch source data' });
  }
});

// ── GET /api/reporting/export ──
router.get('/export', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    const type = (req.query.type as string) || 'contacts';

    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const range = parseDateRange(req.query as { from?: string; to?: string });
    const today = new Date().toISOString().split('T')[0];

    if (type === 'contacts') {
      const rows = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.subAccountId, subAccountId),
            gte(contacts.createdAt, range.from),
            lte(contacts.createdAt, range.to),
          ),
        );

      const header = 'Name,Email,Phone,Status,Source,Lead Score,Created At';
      const csvRows = rows.map(r =>
        [
          escapeCsvField(r.name),
          escapeCsvField(r.email),
          escapeCsvField(r.phone),
          escapeCsvField(r.status),
          escapeCsvField(r.source),
          String(r.leadScore),
          formatDate(r.createdAt),
        ].join(','),
      );

      const csv = [header, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-contacts-${today}.csv"`);
      res.send(csv);
      return;
    }

    if (type === 'messages') {
      const rows = await db
        .select({
          contactName: contacts.name,
          channel: messages.channel,
          direction: messages.direction,
          status: messages.status,
          content: messages.content,
          timestamp: messages.timestamp,
        })
        .from(messages)
        .innerJoin(contacts, eq(messages.contactId, contacts.id))
        .where(
          and(
            eq(contacts.subAccountId, subAccountId),
            gte(messages.timestamp, range.from),
            lte(messages.timestamp, range.to),
          ),
        );

      const header = 'Contact,Channel,Direction,Status,Content,Timestamp';
      const csvRows = rows.map(r =>
        [
          escapeCsvField(r.contactName),
          escapeCsvField(r.channel),
          escapeCsvField(r.direction),
          escapeCsvField(r.status),
          escapeCsvField(r.content),
          formatDate(r.timestamp),
        ].join(','),
      );

      const csv = [header, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="report-messages-${today}.csv"`);
      res.send(csv);
      return;
    }

    res.status(400).json({ error: `Unsupported export type: ${type}` });
  } catch (err) {
    console.error('Reporting export error:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ── GET /api/reporting/ai-usage ──
router.get('/ai-usage', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const range = parseDateRange(req.query as { from?: string; to?: string });
    const prev = getPreviousPeriod(range);

    // Total AI calls in current period
    const [totalResult] = await db
      .select({ value: count() })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.subAccountId, subAccountId),
          gte(usageLogs.createdAt, range.from),
          lte(usageLogs.createdAt, range.to),
        ),
      );
    const totalAiCalls = totalResult?.value ?? 0;

    // Calls grouped by type
    const callsByTypeRows = await db
      .select({
        type: usageLogs.type,
        count: count(),
      })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.subAccountId, subAccountId),
          gte(usageLogs.createdAt, range.from),
          lte(usageLogs.createdAt, range.to),
        ),
      )
      .groupBy(usageLogs.type);

    const callsByType = callsByTypeRows.map(r => ({ type: r.type, count: r.count }));

    // AI calls over time (grouped by day)
    const aiCallsOverTimeRows = await db
      .select({
        date: sql<string>`date_trunc('day', ${usageLogs.createdAt})::date`,
        count: count(),
      })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.subAccountId, subAccountId),
          gte(usageLogs.createdAt, range.from),
          lte(usageLogs.createdAt, range.to),
        ),
      )
      .groupBy(sql`date_trunc('day', ${usageLogs.createdAt})::date`);

    const aiCallsOverTime = aiCallsOverTimeRows.map(r => ({
      date: formatDate(r.date),
      count: r.count,
    }));

    // Top 5 features by usage
    const topFeatures = [...callsByType]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Previous period total
    const [prevTotalResult] = await db
      .select({ value: count() })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.subAccountId, subAccountId),
          gte(usageLogs.createdAt, prev.from),
          lte(usageLogs.createdAt, prev.to),
        ),
      );
    const previousPeriodTotal = prevTotalResult?.value ?? 0;

    res.json({
      totalAiCalls,
      callsByType,
      aiCallsOverTime,
      topFeatures,
      previousPeriodTotal,
    });
  } catch (err) {
    console.error('Reporting AI usage error:', err);
    res.status(500).json({ error: 'Failed to fetch AI usage data' });
  }
});

// ── GET /api/reporting/outreach ──
router.get('/outreach', async (req: Request, res: Response) => {
  try {
    const subAccountId = req.query.subAccountId as string;
    if (!subAccountId) {
      res.status(400).json({ error: 'subAccountId is required' });
      return;
    }

    const range = parseDateRange(req.query as { from?: string; to?: string });

    // Outbound messages scoped to sub-account in period
    const outboundMessages = await db
      .select({
        status: messages.status,
        count: count(),
      })
      .from(messages)
      .innerJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          eq(messages.direction, 'outbound'),
          gte(messages.timestamp, range.from),
          lte(messages.timestamp, range.to),
        ),
      )
      .groupBy(messages.status);

    const statusMap = new Map(outboundMessages.map(r => [r.status, r.count]));
    const sent = (statusMap.get('sent') ?? 0) + (statusMap.get('delivered') ?? 0)
      + (statusMap.get('opened') ?? 0) + (statusMap.get('clicked') ?? 0);
    const opened = (statusMap.get('opened') ?? 0) + (statusMap.get('clicked') ?? 0);
    const clicked = statusMap.get('clicked') ?? 0;

    // Replies: inbound messages in period
    const [replyResult] = await db
      .select({ value: count() })
      .from(messages)
      .innerJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          eq(messages.direction, 'inbound'),
          gte(messages.timestamp, range.from),
          lte(messages.timestamp, range.to),
        ),
      );
    const replied = replyResult?.value ?? 0;

    const openRate = sent > 0 ? Math.round((opened / sent) * 10000) / 100 : 0;
    const clickRate = sent > 0 ? Math.round((clicked / sent) * 10000) / 100 : 0;
    const replyRate = sent > 0 ? Math.round((replied / sent) * 10000) / 100 : 0;

    // Active sequences
    const [activeSeqResult] = await db
      .select({ value: count() })
      .from(sequenceEnrollments)
      .innerJoin(contacts, eq(sequenceEnrollments.contactId, contacts.id))
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          eq(sequenceEnrollments.status, 'active'),
        ),
      );
    const activeSequences = activeSeqResult?.value ?? 0;

    // Conversions (closed contacts in period)
    const [convResult] = await db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          eq(contacts.status, 'Closed'),
          gte(contacts.createdAt, range.from),
          lte(contacts.createdAt, range.to),
        ),
      );
    const conversions = convResult?.value ?? 0;

    // Daily stats
    const dailyRows = await db
      .select({
        date: sql<string>`date_trunc('day', ${messages.timestamp})::date`,
        sent: sql<number>`count(*) filter (where ${messages.direction} = 'outbound')::int`,
        opened: sql<number>`count(*) filter (where ${messages.status} in ('opened', 'clicked'))::int`,
        clicked: sql<number>`count(*) filter (where ${messages.status} = 'clicked')::int`,
      })
      .from(messages)
      .innerJoin(contacts, eq(messages.contactId, contacts.id))
      .where(
        and(
          eq(contacts.subAccountId, subAccountId),
          gte(messages.timestamp, range.from),
          lte(messages.timestamp, range.to),
        ),
      )
      .groupBy(sql`date_trunc('day', ${messages.timestamp})::date`);

    const dailyStats = dailyRows.map(r => ({
      date: formatDate(r.date),
      sent: r.sent,
      opened: r.opened,
      clicked: r.clicked,
    }));

    // Sequence performance
    const seqRows = await db
      .select({
        name: emailSequences.name,
        enrollments: count(),
        opens: sql<number>`sum(${sequenceEnrollments.openCount})::int`,
        clicks: sql<number>`sum(${sequenceEnrollments.clickCount})::int`,
        replies: sql<number>`sum(${sequenceEnrollments.replyCount})::int`,
      })
      .from(sequenceEnrollments)
      .innerJoin(emailSequences, eq(sequenceEnrollments.sequenceId, emailSequences.id))
      .where(eq(emailSequences.subAccountId, subAccountId))
      .groupBy(emailSequences.name);

    const sequencePerformance = seqRows.map(r => ({
      name: r.name,
      enrollments: r.enrollments,
      opens: r.opens ?? 0,
      clicks: r.clicks ?? 0,
      replies: r.replies ?? 0,
      openRate: r.enrollments > 0 ? Math.round(((r.opens ?? 0) / r.enrollments) * 100) : 0,
    }));

    res.json({
      funnel: { sent, opened, clicked, replied },
      rates: { openRate, clickRate, replyRate },
      activeSequences,
      conversions,
      dailyStats,
      sequencePerformance,
    });
  } catch (err) {
    console.error('Reporting outreach error:', err);
    res.status(500).json({ error: 'Failed to fetch outreach data' });
  }
});

export default router;
