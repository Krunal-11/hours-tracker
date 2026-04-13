'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { TimeEntry } from '@/lib/types';

interface AddEntryModalProps {
  date: string;
  entry?: TimeEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddEntryModal({ date, entry, onClose, onSaved }: AddEntryModalProps) {
  const isEdit = !!entry;
  const [formDate, setFormDate] = useState(entry?.date || date);
  const [startTime, setStartTime] = useState(entry?.start_time?.slice(0, 5) || '09:00');
  const [endTime, setEndTime] = useState(entry?.end_time?.slice(0, 5) || '17:00');
  const [overnight, setOvernight] = useState(
    isEdit && entry ? entry.start_time?.slice(0, 5) > entry.end_time?.slice(0, 5) : false
  );
  const [description, setDescription] = useState(entry?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-detect overnight when times change
  const isTimesOvernight = startTime > endTime;

  // Calculate hours
  const calcHours = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    if (overnight || isTimesOvernight) {
      const diff = (1440 - startMinutes + endMinutes) / 60;
      return diff > 0 ? Math.round(diff * 100) / 100 : 0;
    }
    const diff = (endMinutes - startMinutes) / 60;
    return diff > 0 ? Math.round(diff * 100) / 100 : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const hours = calcHours();
    if (hours <= 0) {
      setError('End time must be after start time');
      return;
    }
    if (hours > 24) {
      setError('Entry cannot exceed 24 hours');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...(isEdit ? { id: entry!.id } : {}),
        date: formDate,
        start_time: startTime,
        end_time: endTime,
        overnight: overnight || isTimesOvernight,
        description: description.trim(),
      };

      const res = await fetch('/api/entries', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save entry');
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const hours = calcHours();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Time Entry' : 'Add Time Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time{(overnight || isTimesOvernight) ? ' (next day)' : ''}</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Overnight indicator */}
          {isTimesOvernight && (
            <div className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg">
              <span>🌙</span>
              <span>This entry spans overnight into the next day</span>
            </div>
          )}

          {/* Hours display */}
          {hours > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Total:</span>
              <span className="font-semibold text-blue-600">{hours} hours</span>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="What did you work on?"
              required
            />
          </div>

          {/* Rejection comment if editing a rejected entry */}
          {isEdit && entry?.status === 'rejected' && entry?.rejection_comment && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-700">
              <span className="font-medium">Rejection reason: </span>
              {entry.rejection_comment}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : isEdit ? 'Resubmit' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
