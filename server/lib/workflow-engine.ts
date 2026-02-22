import { db } from '../db/index.js';
import { eq, and, lte } from 'drizzle-orm';
import {
  workflows, workflowSteps, workflowLogs, workflowExecutions, contacts,
} from '../db/schema.js';
import { sendAndTrackMessage } from './message-sender.js';
import { generateJSON } from './gemini.js';
import { broadcast } from './ws.js';

// ── Step Context ──
type StepContext = {
  contact: { id: string; name: string; email: string; phone: string; status: string; leadScore: number; tags: any; [key: string]: any };
  previousOutputs: Record<string, any>;
};

// ── Template Variable Replacement ──
function replaceVars(template: string, ctx: StepContext): string {
  return template
    .replace(/\{\{contact\.name\}\}/g, ctx.contact.name)
    .replace(/\{\{contact\.email\}\}/g, ctx.contact.email)
    .replace(/\{\{contact\.phone\}\}/g, ctx.contact.phone)
    .replace(/\{\{contact\.status\}\}/g, ctx.contact.status);
}

// ── Wait Time Parser ──
function parseWaitTime(waitTime: string): number {
  const lower = waitTime.toLowerCase().trim();
  const num = parseInt(lower) || 1;
  if (lower.includes('minute')) return num;
  if (lower.includes('hour')) return num * 60;
  if (lower.includes('day')) return num * 1440;
  if (lower.includes('week')) return num * 10080;
  return num * 1440; // default to days
}

// ── Step Executors ──

async function executeEmailStep(config: any, ctx: StepContext) {
  const content = replaceVars(config.message || '', ctx);
  const subject = replaceVars(config.subject || 'Automated Message', ctx);
  const result = await sendAndTrackMessage({ contactId: ctx.contact.id, channel: 'email', content, subject });
  return { messageId: result.id, status: result.status };
}

async function executeSmsStep(config: any, ctx: StepContext) {
  const content = replaceVars(config.message || config.body || '', ctx);
  const result = await sendAndTrackMessage({ contactId: ctx.contact.id, channel: 'sms', content });
  return { messageId: result.id, status: result.status };
}

async function executeConditionStep(config: any, ctx: StepContext): Promise<{ passed: boolean }> {
  const contactValue = ctx.contact[config.field];
  switch (config.operator) {
    case 'eq': return { passed: contactValue == config.value };
    case 'gt': return { passed: Number(contactValue) > Number(config.value) };
    case 'lt': return { passed: Number(contactValue) < Number(config.value) };
    case 'contains': return { passed: String(contactValue).includes(config.value) };
    default: return { passed: true };
  }
}

async function executeAiStep(config: any, ctx: StepContext) {
  const prompt = replaceVars(config.description || 'Analyze this contact', ctx);
  return await generateJSON<any>(
    'You are an AI assistant in a CRM workflow. Return useful structured data as JSON.',
    `${prompt}\n\nContact: ${JSON.stringify(ctx.contact)}\nPrevious outputs: ${JSON.stringify(ctx.previousOutputs)}`
  );
}

// ── Core Execution Loop ──
async function runSteps(
  steps: { id: string; type: string; config: any; sortOrder: number }[],
  ctx: StepContext,
  executionId: string,
  logId: string,
  startIndex: number,
): Promise<void> {
  for (let i = startIndex; i < steps.length; i++) {
    const step = steps[i];

    broadcast({
      type: 'workflow:step',
      payload: { logId, executionId, stepIndex: i, stepType: step.type, stepName: `${step.type} (${i + 1}/${steps.length})`, status: 'running' },
    });

    try {
      let output: any;

      switch (step.type) {
        case 'email':
          output = await executeEmailStep(step.config as any, ctx);
          break;
        case 'sms':
          output = await executeSmsStep(step.config as any, ctx);
          break;
        case 'wait': {
          const waitConfig = step.config as { waitTime?: string; minutes?: number };
          const waitMinutes = waitConfig.minutes || parseWaitTime(waitConfig.waitTime || '1 Day');

          await db.update(workflowExecutions).set({
            status: 'paused',
            currentStepIndex: i + 1,
            context: ctx.previousOutputs,
            resumeAt: new Date(Date.now() + waitMinutes * 60_000),
          }).where(eq(workflowExecutions.id, executionId));

          await db.update(workflowLogs).set({
            currentStep: `Waiting (${waitConfig.waitTime || waitMinutes + 'm'})`,
            status: 'waiting',
          }).where(eq(workflowLogs.id, logId));

          broadcast({
            type: 'workflow:step',
            payload: { logId, executionId, stepIndex: i, stepType: 'wait', status: 'waiting' },
          });

          return; // Stop — scheduler will resume
        }
        case 'condition': {
          output = await executeConditionStep(step.config as any, ctx);
          if (!output.passed) {
            await db.update(workflowExecutions).set({ status: 'completed', completedAt: new Date() })
              .where(eq(workflowExecutions.id, executionId));
            await db.update(workflowLogs).set({ currentStep: 'Condition not met — skipped', status: 'success' })
              .where(eq(workflowLogs.id, logId));
            return;
          }
          break;
        }
        case 'ai_step':
          output = await executeAiStep(step.config as any, ctx);
          break;
        default:
          output = { skipped: true, reason: `Unknown step type: ${step.type}` };
      }

      ctx.previousOutputs[`step_${i}`] = output;

      await db.update(workflowLogs).set({ currentStep: `${step.type} (${i + 1}/${steps.length})` })
        .where(eq(workflowLogs.id, logId));

      await db.update(workflowExecutions).set({ currentStepIndex: i + 1 })
        .where(eq(workflowExecutions.id, executionId));

      broadcast({
        type: 'workflow:step',
        payload: { logId, executionId, stepIndex: i, stepType: step.type, status: 'success' },
      });
    } catch (err: any) {
      console.error(`[workflow] Step ${i} (${step.type}) failed:`, err);

      await db.update(workflowExecutions).set({ status: 'failed', error: err.message, currentStepIndex: i })
        .where(eq(workflowExecutions.id, executionId));
      await db.update(workflowLogs).set({ currentStep: `Failed at: ${step.type}`, status: 'failed' })
        .where(eq(workflowLogs.id, logId));

      broadcast({
        type: 'workflow:step',
        payload: { logId, executionId, stepIndex: i, stepType: step.type, status: 'failed', error: err.message },
      });
      return;
    }
  }

  // All steps completed
  await db.update(workflowExecutions).set({ status: 'completed', completedAt: new Date() })
    .where(eq(workflowExecutions.id, executionId));
  await db.update(workflowLogs).set({ status: 'success', currentStep: 'Completed' })
    .where(eq(workflowLogs.id, logId));

  broadcast({
    type: 'workflow:step',
    payload: { logId, executionId, stepIndex: -1, stepType: 'done', status: 'completed' },
  });
}

// ── Public API: Execute Workflow ──
export async function executeWorkflow(workflowId: string, contactId: string): Promise<void> {
  const [wf] = await db.select().from(workflows).where(eq(workflows.id, workflowId)).limit(1);
  if (!wf) throw new Error('Workflow not found');

  const steps = await db.select().from(workflowSteps)
    .where(eq(workflowSteps.workflowId, workflowId))
    .orderBy(workflowSteps.sortOrder);

  if (steps.length === 0) return;

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) throw new Error('Contact not found');

  const [execution] = await db.insert(workflowExecutions).values({
    workflowId,
    contactId,
    status: 'running',
    currentStepIndex: 0,
  }).returning();

  const [log] = await db.insert(workflowLogs).values({
    contactName: contact.name,
    workflowName: wf.name,
    currentStep: steps[0].type,
    status: 'success',
  }).returning();

  const ctx: StepContext = {
    contact: {
      id: contact.id, name: contact.name, email: contact.email,
      phone: contact.phone, status: contact.status, leadScore: contact.leadScore,
      tags: contact.tags, ...((contact.customFields as Record<string, any>) || {}),
    },
    previousOutputs: {},
  };

  await runSteps(steps, ctx, execution.id, log.id, 0);
}

// ── Resume Paused Workflows ──
async function resumePausedWorkflows(): Promise<void> {
  const now = new Date();
  const paused = await db.select().from(workflowExecutions)
    .where(and(
      eq(workflowExecutions.status, 'paused'),
      lte(workflowExecutions.resumeAt, now)
    ));

  for (const exec of paused) {
    console.log(`[workflow] Resuming execution ${exec.id} at step ${exec.currentStepIndex}`);

    await db.update(workflowExecutions).set({ status: 'running' })
      .where(eq(workflowExecutions.id, exec.id));

    const steps = await db.select().from(workflowSteps)
      .where(eq(workflowSteps.workflowId, exec.workflowId))
      .orderBy(workflowSteps.sortOrder);

    const [contact] = await db.select().from(contacts)
      .where(eq(contacts.id, exec.contactId)).limit(1);

    if (!contact || exec.currentStepIndex >= steps.length) {
      await db.update(workflowExecutions).set({ status: 'completed', completedAt: new Date() })
        .where(eq(workflowExecutions.id, exec.id));
      continue;
    }

    // Find the log entry for this workflow execution
    const [wf] = await db.select().from(workflows).where(eq(workflows.id, exec.workflowId)).limit(1);
    const existingLogs = await db.select().from(workflowLogs)
      .where(eq(workflowLogs.workflowName, wf?.name || ''))
      .limit(1);
    const logId = existingLogs[0]?.id || '';

    const ctx: StepContext = {
      contact: {
        id: contact.id, name: contact.name, email: contact.email,
        phone: contact.phone, status: contact.status, leadScore: contact.leadScore,
        tags: contact.tags, ...((contact.customFields as Record<string, any>) || {}),
      },
      previousOutputs: (exec.context as Record<string, any>) || {},
    };

    try {
      await runSteps(steps, ctx, exec.id, logId, exec.currentStepIndex);
    } catch (err) {
      console.error(`[workflow] Resume failed for ${exec.id}:`, err);
    }
  }
}

// ── Scheduler ──
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startWorkflowScheduler(): void {
  if (schedulerInterval) return;
  console.log('[workflow] Scheduler started (checking every 60s for paused workflows)');
  schedulerInterval = setInterval(async () => {
    try {
      await resumePausedWorkflows();
    } catch (err) {
      console.error('[workflow] Scheduler error:', err);
    }
  }, 60_000);
}
