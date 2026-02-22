import { db } from '../db/index.js';
import { messages, contacts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail, isEmailConfigured } from './email.js';
import { sendSms, isSmsConfigured } from './sms.js';
import { initiateCall, isVoiceConfigured } from './voice.js';
import { getTwilioCredentials, getResendCredentials } from './integration-credentials.js';
import { broadcast } from './ws.js';

interface SendParams {
  contactId: string;
  channel: 'sms' | 'email' | 'voice' | 'whatsapp';
  content: string;
  subject?: string;
  sequenceEmailId?: string;
  subAccountId?: string;
}

export async function sendAndTrackMessage(params: SendParams) {
  // 1. Insert message as 'queued'
  const [msg] = await db.insert(messages).values({
    contactId: params.contactId,
    channel: params.channel,
    direction: 'outbound',
    content: params.content,
    status: 'queued',
    subject: params.subject || null,
    sequenceEmailId: params.sequenceEmailId || null,
  }).returning();

  // 2. Look up contact for delivery address
  const [contact] = await db.select().from(contacts)
    .where(eq(contacts.id, params.contactId)).limit(1);

  if (!contact) {
    await db.update(messages).set({ status: 'failed' }).where(eq(messages.id, msg.id));
    const serialized = { ...msg, status: 'failed' as const, timestamp: msg.timestamp.toISOString() };
    broadcast({ type: 'message:new', payload: serialized });
    return serialized;
  }

  // Resolve subAccountId for DB credential lookup
  const subAccountId = params.subAccountId || contact.subAccountId;

  // 3. Route to provider (env vars first, then DB integration credentials)
  let providerId: string | undefined;
  let status: 'sent' | 'failed' = 'sent';

  switch (params.channel) {
    case 'email': {
      if (!contact.email) {
        status = 'failed';
        break;
      }
      // Try env var client first; fall back to DB credentials
      let runtimeKey: string | undefined;
      if (!isEmailConfigured() && subAccountId) {
        const creds = await getResendCredentials(subAccountId);
        if (creds) runtimeKey = creds.apiKey;
      }
      const result = await sendEmail({
        to: contact.email,
        subject: params.subject || 'Message from Nexus CRM',
        html: `<p>${params.content}</p>`,
      }, runtimeKey);
      if (result.success) {
        providerId = result.providerId;
        status = 'sent';
      } else {
        status = 'failed';
      }
      break;
    }
    case 'sms': {
      if (!contact.phone) {
        status = 'failed';
        break;
      }
      let runtimeCreds;
      if (!isSmsConfigured() && subAccountId) {
        runtimeCreds = await getTwilioCredentials(subAccountId) || undefined;
      }
      const result = await sendSms({ to: contact.phone, body: params.content }, runtimeCreds);
      if (result.success) {
        providerId = result.providerId;
        status = 'sent';
      } else {
        status = 'failed';
      }
      break;
    }
    case 'voice': {
      if (!contact.phone) {
        status = 'failed';
        break;
      }
      let runtimeCreds;
      if (!isVoiceConfigured() && subAccountId) {
        runtimeCreds = await getTwilioCredentials(subAccountId) || undefined;
      }
      const voiceResult = await initiateCall({ to: contact.phone }, runtimeCreds);
      if (voiceResult.success) {
        providerId = voiceResult.callSid;
        status = 'sent';
      } else {
        status = 'failed';
      }
      break;
    }
    case 'whatsapp':
      status = 'failed';
      break;
  }

  // 4. Update DB with final status
  const [updated] = await db.update(messages).set({
    status,
    providerId: providerId || null,
  }).where(eq(messages.id, msg.id)).returning();

  const serialized = { ...updated, timestamp: updated.timestamp.toISOString() };

  // 5. Broadcast via WebSocket
  broadcast({ type: 'message:new', payload: serialized });

  return serialized;
}

/**
 * Check provider availability: env vars first, then DB integration credentials.
 */
export async function getProviderStatus(subAccountId?: string) {
  const envStatus = {
    email: isEmailConfigured(),
    sms: isSmsConfigured(),
    whatsapp: false,
    voice: isVoiceConfigured(),
  };

  // If all env-var providers are already configured, skip DB lookup
  if (envStatus.email && envStatus.sms && envStatus.voice) return envStatus;

  // Check DB integrations as fallback
  if (subAccountId) {
    if (!envStatus.email) {
      const resendCreds = await getResendCredentials(subAccountId);
      if (resendCreds) envStatus.email = true;
    }
    if (!envStatus.sms || !envStatus.voice) {
      const twilioCreds = await getTwilioCredentials(subAccountId);
      if (twilioCreds) {
        if (!envStatus.sms) envStatus.sms = true;
        if (!envStatus.voice) envStatus.voice = true;
      }
    }
  }

  return envStatus;
}
