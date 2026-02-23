export type UserRole = 'admin' | 'submitter' | 'verifier' | 'viewer';
export type EntryStatus = 'pending' | 'verified' | 'rejected';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  password_hash: string;
  must_change_password: boolean;
  gmail_app_password_encrypted: string | null;
  email_setup_complete: boolean;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  hours: number;
  description: string;
  status: EntryStatus;
  rejection_comment: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  user_full_name?: string;
  verifier_full_name?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  entry_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  weekHours: number;
  weekPending: number;
  weekVerified: number;
  monthHours: number;
  monthPending: number;
  monthVerified: number;
  allTimeHours: number;
  selectedWeekHours?: number;
  selectedWeekPending?: number;
  selectedWeekVerified?: number;
  selectedWeekStart?: string;
  selectedWeekEnd?: string;
}
