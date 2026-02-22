import Twilio from 'twilio';
import type { TwilioCredentials } from './integration-credentials.js';

const client = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const TWIML_URL = process.env.TWILIO_VOICE_TWIML_URL || '';

export interface InitiateCallParams {
  to: string;
  from?: string;
}

export interface InitiateCallResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

export async function initiateCall(params: InitiateCallParams, runtimeCreds?: TwilioCredentials): Promise<InitiateCallResult> {
  const activeClient = runtimeCreds
    ? Twilio(runtimeCreds.accountSid, runtimeCreds.authToken)
    : client;
  const fromNumber = runtimeCreds?.phoneNumber || FROM_NUMBER;

  if (!activeClient || !fromNumber) {
    console.warn('[voice] Twilio not configured. Call not initiated.');
    return { success: false, error: 'Voice provider not configured' };
  }

  try {
    const call = await activeClient.calls.create({
      to: params.to,
      from: params.from || fromNumber,
      url: TWIML_URL || `http://demo.twilio.com/docs/voice.xml`,
      statusCallback: process.env.TWILIO_VOICE_STATUS_CALLBACK_URL || undefined,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    return { success: true, callSid: call.sid };
  } catch (err: any) {
    console.error('[voice] Twilio error:', err);
    return { success: false, error: err.message || 'Unknown voice error' };
  }
}

export function isVoiceConfigured(): boolean {
  return !!client && !!FROM_NUMBER;
}
