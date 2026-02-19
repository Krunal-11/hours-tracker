import nodemailer from 'nodemailer';
import { getServiceSupabase } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Fallback transporter using env-level Gmail (for system notifications if needed)
const fallbackTransporter =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })
    : null;
const FALLBACK_EMAIL = process.env.GMAIL_USER || '';

/**
 * Create a Nodemailer transport using a specific user's stored Gmail credentials.
 * Returns null if the user doesn't have Gmail credentials set up.
 */
async function getUserTransporter(userId: string): Promise<{ transporter: nodemailer.Transporter; fromEmail: string } | null> {
  try {
    const supabase = getServiceSupabase();
    const { data: user } = await supabase
      .from('users')
      .select('email, gmail_app_password_encrypted')
      .eq('id', userId)
      .single();

    if (!user?.email || !user?.gmail_app_password_encrypted) {
      return null;
    }

    const appPassword = decrypt(user.gmail_app_password_encrypted);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user.email,
        pass: appPassword,
      },
    });

    return { transporter, fromEmail: user.email };
  } catch (err) {
    console.error('[Email] Failed to create user transporter:', err);
    return null;
  }
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email using a specific user's Gmail credentials.
 * Falls back to the system Gmail if the user doesn't have credentials set up.
 */
async function sendEmailAsUser(userId: string, params: SendEmailParams) {
  const { to, subject, html } = params;

  // Try user's own Gmail first
  const userTransport = await getUserTransporter(userId);
  if (userTransport) {
    try {
      await userTransport.transporter.sendMail({
        from: `Hours Tracker <${userTransport.fromEmail}>`,
        to,
        subject,
        html,
      });
      console.log('[Email] Sent via user SMTP:', subject, '->', to);
      return;
    } catch (error) {
      console.error('[Email] User SMTP failed, trying fallback:', error);
    }
  }

  // Fallback to system Gmail
  if (fallbackTransporter && FALLBACK_EMAIL) {
    try {
      await fallbackTransporter.sendMail({
        from: `Hours Tracker <${FALLBACK_EMAIL}>`,
        to,
        subject,
        html,
      });
      console.log('[Email] Sent via fallback SMTP:', subject, '->', to);
      return;
    } catch (error) {
      console.error('[Email] Fallback SMTP also failed:', error);
    }
  }

  console.log('[Email] No email transport available, skipping:', subject);
}

export async function sendNewEntryEmail(
  senderUserId: string,
  verifierEmail: string,
  submitterName: string,
  date: string,
  startTime: string,
  endTime: string,
  hours: number,
  description: string
) {
  await sendEmailAsUser(senderUserId, {
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
  senderUserId: string,
  submitterEmail: string,
  verifierName: string,
  date: string,
  hours: number,
  status: 'verified' | 'rejected',
  comment?: string | null
) {
  const statusColor = status === 'verified' ? '#16a34a' : '#dc2626';
  const statusLabel = status === 'verified' ? 'Verified ✓' : 'Rejected ✗';

  await sendEmailAsUser(senderUserId, {
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
