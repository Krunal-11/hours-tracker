'use client';

import { useSession } from 'next-auth/react';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function DashboardPage() {
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
    <div className="max-w-2xl mx-auto">
      <DashboardSidebar />
    </div>
  );
}
