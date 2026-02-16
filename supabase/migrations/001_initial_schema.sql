-- ============================================
-- Hours Tracker — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'submitter', 'verifier', 'viewer')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_comment TEXT,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Pre-seed users
-- Passwords: krunal@123, harsha@123, reddy@123
-- These are bcrypt hashes generated with cost factor 10
-- You MUST generate fresh hashes. Run this in Node.js:
--   const bcrypt = require('bcryptjs');
--   console.log(bcrypt.hashSync('krunal@123', 10));
--   console.log(bcrypt.hashSync('harsha@123', 10));
--   console.log(bcrypt.hashSync('reddy@123', 10));
-- Then replace the hashes below.

-- PLACEHOLDER HASHES — Replace these before running!
INSERT INTO users (username, full_name, role, password_hash) VALUES
  ('krunal', 'Krunal', 'admin', '$2b$10$XaPvynP6KEAVwKU.W.oX3uq/2YuU0A96H3fjf3Y1PBDHIQuE5P.PG'),
  ('harsha', 'Harsha', 'verifier', '$2b$10$TQeVnmQpt3PDyjaBI.74T.XwPGOrQtRWwUQf/6yZ04ErmdO/9V.pK'),
  ('reddy', 'Reddy', 'viewer', '$2b$10$wmUt//diRAW4a3WV0o/Nqu.sGVMEY0Xw1f7yu5.vJcNn7nDLM.eEO')
ON CONFLICT (username) DO NOTHING;

-- Disable RLS for simplicity (app uses service role key for all DB operations)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies: allow service role full access (service_role bypasses RLS by default)
-- For anon key, create read-only policies if needed in the future
CREATE POLICY "Service role full access on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on time_entries" ON time_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
