import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { encrypt } from '@/lib/encryption';

// PUT /api/profile (update own email, password, or Gmail App Password)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { email, currentPassword, newPassword, gmailAppPassword, isFirstLogin } = body;

  const supabase = getServiceSupabase();
  const updates: Record<string, unknown> = {};

  if (email !== undefined) {
    updates.email = email || null;
  }

  if (newPassword) {
    if (isFirstLogin) {
      // First login — admin-created temp password is the "current" password, already authenticated
      // Just set the new password and clear the flag
      updates.password_hash = await bcrypt.hash(newPassword, 10);
      updates.must_change_password = false;
    } else {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password required' }, { status: 400 });
      }

      // Verify current password
      const { data: user } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', session.user.id)
        .single();

      if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
      }

      updates.password_hash = await bcrypt.hash(newPassword, 10);
    }
  }

  // Gmail App Password — encrypt with AES-256-GCM before storing
  if (gmailAppPassword) {
    try {
      updates.gmail_app_password_encrypted = encrypt(gmailAppPassword);
    } catch (err) {
      console.error('Encryption error:', err);
      return NextResponse.json({ error: 'Failed to encrypt credentials' }, { status: 500 });
    }
  }

  // Mark email setup as complete
  if (body.emailSetupComplete !== undefined) {
    updates.email_setup_complete = body.emailSetupComplete;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
