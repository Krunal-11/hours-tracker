import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping email:', subject);
    return;
  }

  try {
    await resend.emails.send({
      from: 'Hours Tracker <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    console.log('[Email] Sent:', subject, '->', to);
  } catch (error) {
    console.error('[Email] Failed to send:', error);
  }
}

export async function sendNewEntryEmail(
  verifierEmail: string,
  submitterName: string,
  date: string,
  startTime: string,
  endTime: string,
  hours: number,
  description: string
) {
  await sendEmail({
    to: verifierEmail,
    subject: `New hours submitted by ${submitterName} — ${date}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Time Entry</h2>
        <p><strong>${submitterName}</strong> submitted hours for verification.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Date</td><td style="padding: 8px; border: 1px solid #e5e5e5;">${date}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Time</td><td style="padding: 8px; border: 1px solid #e5e5e5;">${startTime} — ${endTime}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Hours</td><td style="padding: 8px; border: 1px solid #e5e5e5;">${hours}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e5e5; font-weight: bold;">Description</td><td style="padding: 8px; border: 1px solid #e5e5e5;">${description}</td></tr>
        </table>
        <a href="${APP_URL}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Open Hours Tracker</a>
      </div>
    `,
  });
}

export async function sendVerificationEmail(
  submitterEmail: string,
  verifierName: string,
  date: string,
  hours: number,
  status: 'verified' | 'rejected',
  comment?: string | null
) {
  const statusColor = status === 'verified' ? '#16a34a' : '#dc2626';
  const statusLabel = status === 'verified' ? 'Verified ✓' : 'Rejected ✗';

  await sendEmail({
    to: submitterEmail,
    subject: `Hours for ${date} — ${statusLabel}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Entry ${statusLabel}</h2>
        <p>Your time entry for <strong>${date}</strong> (${hours} hours) was <strong style="color: ${statusColor};">${status}</strong> by ${verifierName}.</p>
        ${comment ? `<div style="background: #fef2f2; padding: 12px; border-radius: 6px; margin: 16px 0;"><strong>Comment:</strong> ${comment}</div>` : ''}
        <a href="${APP_URL}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Open Hours Tracker</a>
      </div>
    `,
  });
}
