import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// PUT /api/profile (update own email or password)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { email, currentPassword, newPassword } = body;

  const supabase = getServiceSupabase();
  const updates: Record<string, unknown> = {};

  if (email !== undefined) {
    updates.email = email || null;
  }

  if (newPassword) {
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
