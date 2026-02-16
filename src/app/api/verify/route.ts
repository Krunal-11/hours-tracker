import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/email';

// POST /api/verify
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'verifier' && role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized to verify' }, { status: 403 });
  }

  const body = await req.json();
  const { entry_id, action, comment } = body; // action: 'verify' | 'reject'

  if (!entry_id || !action || !['verify', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (action === 'reject' && !comment) {
    return NextResponse.json({ error: 'Comment required for rejection' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const status = action === 'verify' ? 'verified' : 'rejected';

  const { data: entry, error } = await supabase
    .from('time_entries')
    .update({
      status,
      rejection_comment: action === 'reject' ? comment : null,
      verified_by: session.user.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', entry_id)
    .select('*, users!time_entries_user_id_fkey(full_name, email, id)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const submitter = entry.users as Record<string, unknown>;

  // Notify the submitter
  await supabase.from('notifications').insert({
    user_id: submitter.id as string,
    entry_id: entry.id,
    message: `Your hours for ${entry.date} were ${status} by ${session.user.fullName || session.user.username}${action === 'reject' && comment ? ': ' + comment : ''}`,
  });

  // Send email to submitter
  if (submitter.email) {
    await sendVerificationEmail(
      submitter.email as string,
      session.user.fullName || session.user.username,
      entry.date,
      entry.hours,
      status as 'verified' | 'rejected',
      comment
    );
  }

  return NextResponse.json(entry);
}
