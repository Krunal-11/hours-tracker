'use client';

import { useSession } from 'next-auth/react';
import CalendarView from '@/components/CalendarView';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <CalendarView />
      </div>
      <div className="w-full lg:w-72 shrink-0">
        <DashboardSidebar compact />
      </div>
    </div>
  );
}
