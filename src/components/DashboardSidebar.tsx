'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardStats } from '@/lib/types';
import { Clock, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

export default function DashboardSidebar() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchStats]);

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

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="bg-green-500 rounded-full transition-all"
            style={{ width: `${(verified / total) * 100}%` }}
          />
          <div
            className="bg-yellow-400 transition-all"
            style={{ width: `${(pending / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>

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
    </div>
  );
}
