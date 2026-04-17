import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
// import nodemailer from 'nodemailer'; // Paused: SMTP verification

/**
 * POST /api/verify-smtp
 * Tests Gmail SMTP authentication without sending an email.
 * Used during email setup to validate credentials before saving.
 *
 * Body: { email: string, appPassword: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Paused: SMTP verification during email/mailing freeze
  return NextResponse.json(
    { error: 'Email setup is temporarily paused' },
    { status: 503 }
  );

  // const { email, appPassword } = await req.json();

  // if (!email || !appPassword) {
  //   return NextResponse.json(
  //     { error: 'Email and App Password are required' },
  //     { status: 400 }
  //   );
  // }

  // const transporter = nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: email,
  //     pass: appPassword,
  //   },
  // });

  // try {
  //   // verify() opens an SMTP connection and authenticates, then closes it.
  //   // It does NOT send any email.
  //   await transporter.verify();
  //   return NextResponse.json({ success: true });
  // } catch (err: unknown) {
  //   console.error('[verify-smtp] SMTP auth failed:', err);

  //   // Provide user-friendly error messages based on common failure modes
  //   const message =
  //     err instanceof Error ? err.message : String(err);

  //   if (message.includes('Invalid login') || message.includes('Username and Password not accepted')) {
  //     return NextResponse.json(
  //       {
  //         error:
  //           'Gmail rejected the credentials. Please double-check your email address and App Password. Make sure you are using a Gmail App Password (not your regular Google password).',
  //       },
  //       { status: 422 }
  //     );
  //   }

  //   if (message.includes('less secure app') || message.includes('web login required')) {
  //     return NextResponse.json(
  //       {
  //         error:
  //           'Google requires additional verification. Please ensure 2-Step Verification is enabled on your Google account and use an App Password.',
  //       },
  //       { status: 422 }
  //     );
  //   }

  //   return NextResponse.json(
  //     {
  //       error:
  //         'Could not connect to Gmail SMTP. Please verify your email and App Password are correct and try again.',
  //     },
  //     { status: 422 }
  //   );
  // }
}
