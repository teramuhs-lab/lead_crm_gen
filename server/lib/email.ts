import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams, runtimeApiKey?: string): Promise<SendEmailResult> {
  const client = runtimeApiKey ? new Resend(runtimeApiKey) : resend;
  if (!client) {
    console.warn('[email] RESEND_API_KEY not configured. Email not sent.');
    return { success: false, error: 'Email provider not configured' };
  }

  try {
    const { data, error } = await client.emails.send({
      from: params.from || 'Nexus CRM <onboarding@resend.dev>',
      to: [params.to],
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, providerId: data?.id };
  } catch (err: any) {
    console.error('[email] Send failed:', err);
    return { success: false, error: err.message || 'Unknown email error' };
  }
}

export function isEmailConfigured(): boolean {
  return !!resend;
}
