'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardStats, TimeEntry } from '@/lib/types';
import { Clock, CheckCircle2, AlertCircle, TrendingUp, Users, FileText } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface UserOption {
  id: string;
  full_name: string;
  username: string;
}

interface DashboardSidebarProps {
  /** When used as compact sidebar (calendar page), hides submissions list */
  compact?: boolean;
}

export default function DashboardSidebar({ compact = false }: DashboardSidebarProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [submitters, setSubmitters] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const user = session?.user as { id: string; role: string } | undefined;
  const canViewOthers = user?.role === 'verifier' || user?.role === 'viewer' || user?.role === 'admin';

  // Fetch submitters for verifier/viewer/admin
  useEffect(() => {
    if (!canViewOthers) return;
    (async () => {
      try {
        const res = await fetch('/api/users/submitters');
        if (res.ok) {
          const data = await res.json();
          setSubmitters(data);
        }
      } catch (err) {
        console.error('Failed to fetch submitters:', err);
      }
    })();
  }, [canViewOthers]);

  const fetchStats = useCallback(async () => {
    try {
      const userFilter = canViewOthers && selectedUserId ? `?user_id=${selectedUserId}` : '';
      const res = await fetch(`/api/stats${userFilter}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, canViewOthers]);

  const fetchRecentEntries = useCallback(async () => {
    if (compact) return;
    try {
      setEntriesLoading(true);
      const userFilter = canViewOthers && selectedUserId ? `&user_id=${selectedUserId}` : '';
      const res = await fetch(`/api/entries?recent=true${userFilter}`);
      if (res.ok) {
        const data = await res.json();
        setRecentEntries(data);
      }
    } catch (err) {
      console.error('Failed to fetch recent entries:', err);
    } finally {
      setEntriesLoading(false);
    }
  }, [compact, selectedUserId, canViewOthers]);

  useEffect(() => {
    fetchStats();
    if (!compact) fetchRecentEntries();
    const interval = setInterval(() => {
      fetchStats();
      if (!compact) fetchRecentEntries();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchRecentEntries, compact]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const StatCard = ({
    title,
    total,
    verified,
    pending,
    icon: Icon,
    color,
  }: {
    title: string;
    total: number;
    verified: number;
    pending: number;
    icon: React.ElementType;
    color: string;
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      </div>
      <div className="flex items-end gap-1 mb-3">
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="text-sm text-gray-500 mb-0.5">hours</span>
      </div>
      <div className="flex gap-3">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-xs text-gray-500">{verified}h verified</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-yellow-500" />
          <span className="text-xs text-gray-500">{pending}h pending</span>
        </div>
      </div>

    </div>
  );

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      verified: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${styles[status] || ''}`}>
        {status}
      </span>
    );
  };

  // Group entries by date
  const entriesByDate: Record<string, TimeEntry[]> = {};
  recentEntries.forEach((entry) => {
    if (!entriesByDate[entry.date]) entriesByDate[entry.date] = [];
    entriesByDate[entry.date].push(entry);
  });
  const sortedDates = Object.keys(entriesByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>

      {/* User selector for verifier/viewer/admin (only on full dashboard) */}
      {!compact && canViewOthers && submitters.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Viewing hours for:</label>
          </div>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Submitters</option>
            {submitters.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name} (@{s.username})</option>
            ))}
          </select>
        </div>
      )}

      <StatCard
        title="This Week"
        total={Math.round(stats.weekHours * 100) / 100}
        verified={Math.round(stats.weekVerified * 100) / 100}
        pending={Math.round(stats.weekPending * 100) / 100}
        icon={Clock}
        color="bg-blue-500"
      />

      <StatCard
        title="This Month"
        total={Math.round(stats.monthHours * 100) / 100}
        verified={Math.round(stats.monthVerified * 100) / 100}
        pending={Math.round(stats.monthPending * 100) / 100}
        icon={TrendingUp}
        color="bg-purple-500"
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-medium text-gray-600">All Time</h3>
        </div>
        <div className="flex items-end gap-1">
          <span className="text-2xl font-bold text-gray-900">
            {Math.round(stats.allTimeHours * 100) / 100}
          </span>
          <span className="text-sm text-gray-500 mb-0.5">hours</span>
        </div>
      </div>

      {/* Submissions List (only on full dashboard view) */}
      {!compact && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Recent Submissions</h3>
            </div>
          </div>

          {entriesLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-10 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No submissions yet</div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {sortedDates.map((date) => {
                const dayEntries = entriesByDate[date];
                const totalHours = dayEntries.reduce((sum, e) => sum + Number(e.hours), 0);
                const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={date} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-900">{formattedDate}</span>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {Math.round(totalHours * 100) / 100}h
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {dayEntries.map((entry) => (
                        <div key={entry.id} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-medium text-gray-700">
                                {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                              </span>
                              {statusBadge(entry.status)}
                            </div>
                            {entry.user_full_name && (
                              <p className="text-[11px] text-gray-400 mb-0.5">by {entry.user_full_name}</p>
                            )}
                            <p className="text-xs text-gray-600 truncate">{entry.description}</p>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 ml-2 shrink-0">{entry.hours}h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
