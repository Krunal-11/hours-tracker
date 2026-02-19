-- ============================================
-- Migration 002: First-login password change + encrypted Gmail credentials
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================

-- Add must_change_password flag (true by default so existing users must change on next login)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

-- Add encrypted Gmail App Password column (stores AES-256-GCM ciphertext)
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_app_password_encrypted TEXT;

-- Add email_setup_complete flag (false by default, must be set after first password change)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_setup_complete BOOLEAN DEFAULT FALSE;

-- Set admin user to not require password change (optional — remove if admin should also change)
-- UPDATE users SET must_change_password = FALSE WHERE username = 'krunal';
