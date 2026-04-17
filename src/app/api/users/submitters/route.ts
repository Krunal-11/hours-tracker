import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/users/submitters - returns list of submitter users for viewer filters
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only verifiers, viewers, and admins need to see the submitter list
  const role = session.user.role;
  if (role !== 'verifier' && role !== 'viewer' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name')
    .eq('role', 'submitter')
    .order('full_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
