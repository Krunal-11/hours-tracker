'use client';

import { useState } from 'react';
import { TimeEntry } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import { Check, X, Pencil, Trash2, Clock, MessageSquare } from 'lucide-react';

interface DayDetailPanelProps {
  date: string | null;
  entries: TimeEntry[];
  canVerify: boolean;
  canEdit: boolean;
  onEdit: (entry: TimeEntry) => void;
  onVerified: () => void;
  onDeleted: () => void;
}

export default function DayDetailPanel({
  date,
  entries,
  canVerify,
  canEdit,
  onEdit,
  onVerified,
  onDeleted,
}: DayDetailPanelProps) {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (!date) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Select a day to view entries</p>
      </div>
    );
  }

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);

  const handleVerify = async (entryId: string) => {
    setActionLoading(true);
    try {
      await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: entryId, action: 'verify' }),
      });
      onVerified();
    } finally {
      setActionLoading(false);
      setVerifyingId(null);
    }
  };

  const handleReject = async (entryId: string) => {
    if (!rejectComment.trim()) return;
    setActionLoading(true);
    try {
      await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: entryId,
          action: 'reject',
          comment: rejectComment.trim(),
        }),
      });
      onVerified();
    } finally {
      setActionLoading(false);
      setShowRejectForm(null);
      setRejectComment('');
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/entries?id=${entryId}`, { method: 'DELETE' });
    onDeleted();
  };

  const statusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      verified: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return (
      <span
        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${styles[status as keyof typeof styles] || ''}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{formattedDate}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {totalHours} hours total
        </p>
      </div>

      <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No entries for this day
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="px-4 py-3">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                  </span>
                  {statusBadge(entry.status)}
                </div>
                <span className="text-sm font-semibold text-blue-600">{entry.hours}h</span>
              </div>

              {entry.user_full_name && (
                <p className="text-xs text-gray-400 mb-1">by {entry.user_full_name}</p>
              )}

              <p className="text-sm text-gray-600 mb-2">{entry.description}</p>

              {/* Rejection comment */}
              {entry.status === 'rejected' && entry.rejection_comment && (
                <div className="flex items-start gap-1.5 bg-red-50 rounded px-2 py-1.5 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600">{entry.rejection_comment}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                {/* Verify/Reject buttons */}
                {canVerify && entry.status === 'pending' && (
                  <>
                    {showRejectForm === entry.id ? (
                      <div className="flex-1 space-y-1.5">
                        <textarea
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          placeholder="Reason for rejection..."
                          rows={2}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleReject(entry.id)}
                            disabled={actionLoading || !rejectComment.trim()}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setShowRejectForm(null);
                              setRejectComment('');
                            }}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleVerify(entry.id)}
                          disabled={actionLoading && verifyingId === entry.id}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          Verify
                        </button>
                        <button
                          onClick={() => setShowRejectForm(entry.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* Edit button (for rejected entries the submitter can resubmit) */}
                {canEdit && (entry.status === 'rejected' || entry.status === 'pending') && (
                  <button
                    onClick={() => onEdit(entry)}
                    className="flex items-center gap-1 text-xs px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}

                {/* Delete */}
                {canEdit && (
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="flex items-center gap-1 text-xs px-2 py-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
