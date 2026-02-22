import Twilio from 'twilio';
import type { TwilioCredentials } from './integration-credentials.js';

const client = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

export interface SendSmsParams {
  to: string;
  body: string;
}

export interface SendSmsResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export async function sendSms(params: SendSmsParams, runtimeCreds?: TwilioCredentials): Promise<SendSmsResult> {
  const activeClient = runtimeCreds
    ? Twilio(runtimeCreds.accountSid, runtimeCreds.authToken)
    : client;
  const fromNumber = runtimeCreds?.phoneNumber || FROM_NUMBER;

  if (!activeClient || !fromNumber) {
    console.warn('[sms] Twilio not configured. SMS not sent.');
    return { success: false, error: 'SMS provider not configured' };
  }

  try {
    const message = await activeClient.messages.create({
      to: params.to,
      from: fromNumber,
      body: params.body,
      statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL || undefined,
    });

    return { success: true, providerId: message.sid };
  } catch (err: any) {
    console.error('[sms] Twilio error:', err);
    return { success: false, error: err.message || 'Unknown SMS error' };
  }
}

export function isSmsConfigured(): boolean {
  return !!client && !!FROM_NUMBER;
}
