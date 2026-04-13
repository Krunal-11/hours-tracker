import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { sendNewEntryEmail } from '@/lib/email';
import { calculateHours } from '@/lib/utils';

function parseOvernight(startTime: string, endTime: string, overnightFlag?: boolean): boolean {
  return overnightFlag === true || startTime > endTime;
}

// GET /api/entries?month=2026-02&user_id=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // e.g., "2026-02"
  const userId = searchParams.get('user_id');
  const recent = searchParams.get('recent'); // "true" to get recent entries (no month filter)

  let query = supabase
    .from('time_entries')
    .select('*, users!time_entries_user_id_fkey(full_name)')
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  // Role-based filtering
  const role = session.user.role;
  if (role === 'submitter') {
    query = query.eq('user_id', session.user.id);
  } else if (userId) {
    query = query.eq('user_id', userId);
  }

  // Month filtering (unless fetching recent submissions)
  if (recent === 'true') {
    // Return last 50 entries across all time, no month filter
    query = query.limit(50);
  } else if (month) {
    const startDate = `${month}-01`;
    const [year, mon] = month.split('-').map(Number);
    const endDate = new Date(year, mon, 0).toISOString().split('T')[0];
    query = query.gte('date', startDate).lte('date', endDate);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten the joined user name
  const entries = (data || []).map((entry: Record<string, unknown>) => ({
    ...entry,
    user_full_name: (entry.users as Record<string, string>)?.full_name || 'Unknown',
    users: undefined,
  }));

  return NextResponse.json(entries);
}

// POST /api/entries
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'admin' && role !== 'submitter') {
    return NextResponse.json({ error: 'Not allowed to submit entries' }, { status: 403 });
  }

  const body = await req.json();
  const { date, start_time, end_time, description, overnight: overnightFlag } = body;

  if (!date || !start_time || !end_time || !description) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const overnight = parseOvernight(start_time, end_time, overnightFlag);
  const hours = calculateHours(start_time, end_time, overnight);
  if (hours <= 0 || hours > 24) {
    return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: entry, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: session.user.id,
      date,
      start_time,
      end_time,
      hours,
      description,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create notifications for viewers, admins, and verifiers
  const { data: notifyUsers } = await supabase
    .from('users')
    .select('id, email, role')
    .in('role', ['verifier', 'admin', 'viewer']);

  if (notifyUsers && notifyUsers.length > 0) {
    const notifications = notifyUsers.map((u: Record<string, unknown>) => ({
      user_id: u.id as string,
      entry_id: entry.id,
      message: `${session.user.fullName || session.user.username} submitted ${hours} hours on ${date}`,
    }));

    await supabase.from('notifications').insert(notifications);

    // Send email only to verifiers
    for (const u of notifyUsers) {
      if (u.role === 'verifier' && u.email) {
        await sendNewEntryEmail(
          session.user.id,
          u.email as string,
          session.user.fullName || session.user.username,
          date,
          start_time,
          end_time,
          hours,
          description
        );
      }
    }
  }

  return NextResponse.json(entry, { status: 201 });
}

// PUT /api/entries (update an entry — for resubmission after rejection)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, date, start_time, end_time, description, overnight: overnightFlag } = body;

  if (!id) {
    return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // Verify ownership
  const { data: existing } = await supabase
    .from('time_entries')
    .select('user_id, status')
    .eq('id', id)
    .single();

  if (!existing || existing.user_id !== session.user.id) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 });
  }

  const overnight = parseOvernight(start_time, end_time, overnightFlag);
  const hours = calculateHours(start_time, end_time, overnight);
  if (hours <= 0 || hours > 24) {
    return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
  }

  const { data: entry, error } = await supabase
    .from('time_entries')
    .update({
      date,
      start_time,
      end_time,
      hours,
      description,
      status: 'pending',
      rejection_comment: null,
      verified_by: null,
      verified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify viewers, admins, and verifiers about resubmission
  const { data: notifyUsers } = await supabase
    .from('users')
    .select('id, email, role')
    .in('role', ['verifier', 'admin', 'viewer']);

  if (notifyUsers && notifyUsers.length > 0) {
    const notifications = notifyUsers.map((u: Record<string, unknown>) => ({
      user_id: u.id as string,
      entry_id: entry.id,
      message: `${session.user.fullName || session.user.username} resubmitted hours for ${date}`,
    }));
    await supabase.from('notifications').insert(notifications);

    // Send email only to verifiers
    for (const u of notifyUsers) {
      if (u.role === 'verifier' && u.email) {
        await sendNewEntryEmail(
          session.user.id,
          u.email as string,
          session.user.fullName || session.user.username,
          date,
          start_time,
          end_time,
          hours,
          description
        );
      }
    }
  }

  return NextResponse.json(entry);
}

// DELETE /api/entries?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // Verify ownership (or admin)
  const { data: existing } = await supabase
    .from('time_entries')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (existing.user_id !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
