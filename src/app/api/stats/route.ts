import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { getWeekRange, getMonthRange, formatDate } from '@/lib/utils';

// GET /api/stats?user_id=xxx
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const now = new Date();

  const { searchParams } = new URL(req.url);
  const filterUserId = searchParams.get('user_id');

  // For submitters, show only their stats. For others, optionally filter by user_id.
  const role = session.user.role;
  let userId: string | null = null;
  if (role === 'submitter') {
    userId = session.user.id;
  } else if (filterUserId) {
    userId = filterUserId;
  }

  const weekRange = getWeekRange(now);
  const monthRange = getMonthRange(now);

  // Build query helper
  const buildQuery = (start: Date, end: Date) => {
    let q = supabase
      .from('time_entries')
      .select('hours, status')
      .gte('date', formatDate(start))
      .lte('date', formatDate(end));
    if (userId) q = q.eq('user_id', userId);
    return q;
  };

  const [weekResult, monthResult, allTimeResult] = await Promise.all([
    buildQuery(weekRange.start, weekRange.end),
    buildQuery(monthRange.start, monthRange.end),
    (() => {
      let q = supabase.from('time_entries').select('hours, status');
      if (userId) q = q.eq('user_id', userId);
      return q;
    })(),
  ]);

  const calcStats = (data: { hours: number; status: string }[] | null) => {
    if (!data) return { total: 0, pending: 0, verified: 0 };
    return {
      total: data.reduce((sum, e) => sum + Number(e.hours), 0),
      pending: data.filter((e) => e.status === 'pending').reduce((sum, e) => sum + Number(e.hours), 0),
      verified: data.filter((e) => e.status === 'verified').reduce((sum, e) => sum + Number(e.hours), 0),
    };
  };

  const week = calcStats(weekResult.data);
  const month = calcStats(monthResult.data);
  const allTime = calcStats(allTimeResult.data);

  return NextResponse.json({
    weekHours: week.total,
    weekPending: week.pending,
    weekVerified: week.verified,
    monthHours: month.total,
    monthPending: month.pending,
    monthVerified: month.verified,
    allTimeHours: allTime.total,
  });
}
