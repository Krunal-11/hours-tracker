'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { TimeEntry } from '@/lib/types';
import AddEntryModal from './AddEntryModal';
import DayDetailPanel from './DayDetailPanel';
import { cn } from '@/lib/utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarView() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDate, setAddDate] = useState<string>('');
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/entries?month=${monthKey}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    }
  }, [monthKey]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const today = new Date();
  const todayStr =
    today.getFullYear() === year && today.getMonth() === month
      ? String(today.getDate())
      : null;

  // Group entries by date
  const entriesByDate: Record<string, TimeEntry[]> = {};
  entries.forEach((entry) => {
    const dateKey = entry.date;
    if (!entriesByDate[dateKey]) entriesByDate[dateKey] = [];
    entriesByDate[dateKey].push(entry);
  });

  const getDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getStatusDots = (day: number) => {
    const dateKey = getDateKey(day);
    const dayEntries = entriesByDate[dateKey] || [];
    if (dayEntries.length === 0) return null;

    const hasVerified = dayEntries.some((e) => e.status === 'verified');
    const hasPending = dayEntries.some((e) => e.status === 'pending');
    const hasRejected = dayEntries.some((e) => e.status === 'rejected');

    return (
      <div className="flex gap-0.5 justify-center mt-0.5">
        {hasVerified && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
        {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
        {hasRejected && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
      </div>
    );
  };

  const getTotalHours = (day: number) => {
    const dateKey = getDateKey(day);
    const dayEntries = entriesByDate[dateKey] || [];
    if (dayEntries.length === 0) return null;
    const total = dayEntries.reduce((sum, e) => sum + Number(e.hours), 0);
    return total;
  };

  const user = session?.user as { role: string } | undefined;
  const canSubmit = user?.role === 'admin' || user?.role === 'submitter';

  const handleAddEntry = (date?: string) => {
    setEditEntry(null);
    setAddDate(date || new Date().toISOString().split('T')[0]);
    setShowAddModal(true);
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditEntry(entry);
    setAddDate(entry.date);
    setShowAddModal(true);
  };

  const handleEntrySaved = () => {
    setShowAddModal(false);
    setEditEntry(null);
    fetchEntries();
  };

  const handleEntryDeleted = () => {
    fetchEntries();
  };

  const selectedEntries = selectedDate ? (entriesByDate[selectedDate] || []) : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Calendar */}
      <div className="flex-1">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {MONTHS[month]} {year}
            </h2>
            <button
              onClick={goToToday}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-20 border-b border-r border-gray-50 bg-gray-50/50" />;
              }

              const dateKey = getDateKey(day);
              const isToday = todayStr && day === Number(todayStr);
              const isSelected = selectedDate === dateKey;
              const hours = getTotalHours(day);

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                  className={cn(
                    'h-20 border-b border-r border-gray-50 p-1.5 cursor-pointer transition-colors relative group',
                    isSelected
                      ? 'bg-blue-50 ring-1 ring-inset ring-blue-200'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full',
                        isToday
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-gray-700'
                      )}
                    >
                      {day}
                    </span>
                    {hours !== null && (
                      <span className="text-[10px] font-medium text-gray-400">
                        {hours}h
                      </span>
                    )}
                  </div>
                  {getStatusDots(day)}

                  {/* Quick add on hover */}
                  {canSubmit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddEntry(dateKey);
                      }}
                      className="absolute bottom-1 right-1 w-5 h-5 bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Verified
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Pending
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Rejected
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      <div className="w-full lg:w-80 shrink-0">
        <DayDetailPanel
          date={selectedDate}
          entries={selectedEntries}
          canVerify={user?.role === 'verifier' || user?.role === 'admin'}
          canEdit={canSubmit}
          onEdit={handleEditEntry}
          onVerified={fetchEntries}
          onDeleted={handleEntryDeleted}
        />
      </div>

      {/* Floating add button (mobile) */}
      {canSubmit && (
        <button
          onClick={() => handleAddEntry()}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center lg:hidden z-30"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Add/Edit Entry Modal */}
      {showAddModal && (
        <AddEntryModal
          date={addDate}
          entry={editEntry}
          onClose={() => { setShowAddModal(false); setEditEntry(null); }}
          onSaved={handleEntrySaved}
        />
      )}
    </div>
  );
}
