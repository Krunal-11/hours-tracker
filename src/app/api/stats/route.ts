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
  const weekOf = searchParams.get('week_of'); // Optional: date string for selected week

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
  
  // Calculate selected week range if week_of is provided
  let selectedWeekRange: { start: Date; end: Date } | null = null;
  if (weekOf) {
    const selectedDate = new Date(weekOf + 'T12:00:00');
    if (!isNaN(selectedDate.getTime())) {
      selectedWeekRange = getWeekRange(selectedDate);
    }
  }

  // Build query helper for week (needs date+time filtering)
  const buildWeekQuery = (start: Date, end: Date) => {
    const startDate = formatDate(start);
    const endDate = formatDate(end);
    let q = supabase
      .from('time_entries')
      .select('date, start_time, hours, status')
      .gte('date', startDate)
      .lte('date', endDate);
    if (userId) q = q.eq('user_id', userId);
    return q;
  };

  // Build query helper for month (date-only filtering is fine)
  const buildMonthQuery = (start: Date, end: Date) => {
    let q = supabase
      .from('time_entries')
      .select('hours, status')
      .gte('date', formatDate(start))
      .lte('date', formatDate(end));
    if (userId) q = q.eq('user_id', userId);
    return q;
  };

  const [weekResult, monthResult, allTimeResult, selectedWeekResult] = await Promise.all([
    buildWeekQuery(weekRange.start, weekRange.end),
    buildMonthQuery(monthRange.start, monthRange.end),
    (() => {
      let q = supabase.from('time_entries').select('hours, status');
      if (userId) q = q.eq('user_id', userId);
      return q;
    })(),
    selectedWeekRange ? buildWeekQuery(selectedWeekRange.start, selectedWeekRange.end) : Promise.resolve({ data: null }),
  ]);

  // Filter week data by date AND time (9am boundary)
  const filterWeekEntries = (
    data: { date: string; start_time: string; hours: number; status: string }[] | null,
    range: { start: Date; end: Date }
  ) => {
    if (!data) return [];
    const startDate = formatDate(range.start);
    const endDate = formatDate(range.end);
    
    return data.filter((entry) => {
      // Entry is on the start date - must be >= 09:00
      if (entry.date === startDate && entry.start_time < '09:00') {
        return false;
      }
      // Entry is on the end date - must be < 09:00
      if (entry.date === endDate && entry.start_time >= '09:00') {
        return false;
      }
      return true;
    });
  };

  const calcStats = (data: { hours: number; status: string }[] | null) => {
    if (!data) return { total: 0, pending: 0, verified: 0 };
    return {
      total: data.reduce((sum, e) => sum + Number(e.hours), 0),
      pending: data.filter((e) => e.status === 'pending').reduce((sum, e) => sum + Number(e.hours), 0),
      verified: data.filter((e) => e.status === 'verified').reduce((sum, e) => sum + Number(e.hours), 0),
    };
  };

  const weekData = filterWeekEntries(weekResult.data, weekRange);
  const week = calcStats(weekData);
  const month = calcStats(monthResult.data);
  const allTime = calcStats(allTimeResult.data);
  
  // Calculate selected week stats if requested
  let selectedWeek = null;
  if (selectedWeekRange && selectedWeekResult.data) {
    const selectedWeekData = filterWeekEntries(selectedWeekResult.data, selectedWeekRange);
    selectedWeek = calcStats(selectedWeekData);
  }

  return NextResponse.json({
    weekHours: week.total,
    weekPending: week.pending,
    weekVerified: week.verified,
    monthHours: month.total,
    monthPending: month.pending,
    monthVerified: month.verified,
    allTimeHours: allTime.total,
    ...(selectedWeek && {
      selectedWeekHours: selectedWeek.total,
      selectedWeekPending: selectedWeek.pending,
      selectedWeekVerified: selectedWeek.verified,
      selectedWeekStart: formatDate(selectedWeekRange!.start),
      selectedWeekEnd: formatDate(selectedWeekRange!.end),
    }),
  });
}
