# Hours Tracker — Implementation Plan

## 1. Overview

A lightweight hours-tracking web app where you log work hours with descriptions, a designated verifier approves them, and a viewer can see the records. Includes a calendar view, dashboard stats, notifications, and an admin panel for user management.

---

## 2. Tech Stack

| Layer         | Choice                        | Why                                                    |
|---------------|-------------------------------|--------------------------------------------------------|
| **Framework** | Next.js 14 (App Router)       | Full-stack in one project, SSR, API routes, free Vercel deploy |
| **Database**  | Supabase (PostgreSQL)         | Free tier (500MB, 50K rows), built-in auth, real-time  |
| **Auth**      | Supabase Auth                 | Email/password login, row-level security, session mgmt |
| **UI**        | Tailwind CSS + shadcn/ui      | Clean, minimal component library, no bloat             |
| **Hosting**   | Vercel (free tier)            | Zero-config Next.js deploy, custom domain support      |
| **Notifications** | In-app (DB-backed)       | Simple polling/real-time via Supabase, no external service |
| **Email**      | Resend (free tier)           | 100 emails/day free, simple REST API, no SMTP setup        |

---

## 3. Database Schema

```
┌─────────────┐       ┌──────────────────┐       ┌───────────────────┐
│   users      │       │  time_entries     │       │  notifications    │
├─────────────┤       ├──────────────────┤       ├───────────────────┤
│ id (uuid PK)│◄──────│ user_id (FK)     │       │ id (uuid PK)      │
│ email        │       │ id (uuid PK)     │──────►│ entry_id (FK)     │
│ full_name    │       │ date             │       │ user_id (FK)      │
│ role (enum)  │       │ start_time       │       │ message           │
│ created_at   │       │ end_time         │       │ is_read (bool)    │
└─────────────┘       │ hours (decimal)  │       │ created_at        │
                      │ description      │       └───────────────────┘
                      │ status (enum)    │
                      │ verified_by (FK) │
                      │ verified_at      │
                      │ created_at       │
                      └──────────────────┘
```

**Roles enum:** `admin`, `submitter`, `verifier`, `viewer`

**Status enum:** `pending`, `verified`, `rejected`

---

## 4. User Roles & Permissions

| Action                  | Submitter | Verifier | Viewer | Admin |
|-------------------------|-----------|----------|--------|-------|
| Log hours               | ✅        | ❌       | ❌     | ✅    |
| View all entries        | Own only  | ✅       | ✅     | ✅    |
| Verify/Reject entries   | ❌        | ✅       | ❌     | ✅    |
| View dashboard          | ✅        | ✅       | ✅     | ✅    |
| Manage users            | ❌        | ❌       | ❌     | ✅    |
| Receive notifications   | ❌        | ✅       | ✅     | ✅    |

---

## 5. Pages & Routes

```
/login                  → Email/password login
/                       → Calendar view (main page, redirects if not logged in)
/dashboard              → Stats sidebar / full dashboard view
/admin                  → User management (admin only)
```

---

## 6. Core Features

### 6a. Calendar View (Main Page)
- Monthly calendar grid showing current month
- Today's date highlighted
- Days with logged entries show colored dots (green=verified, yellow=pending, red=rejected)
- **"+" floating button** → opens modal to add a time entry
- Click on a day → shows entries for that day in a side panel
- Navigate between months

### 6b. Add Time Entry Modal
- **Date** (defaults to today)
- **Start time / End time** OR **Number of hours** (flexible input)
- **Description** (text area — what was worked on)
- Submit → saves as `pending`, triggers notification to verifier & viewer

### 6c. Dashboard (Sidebar + Full View)
- **This week:** total hours, verified vs pending
- **This month:** total hours, verified vs pending
- **All time:** total hours
- Simple bar/progress indicators, no heavy charts

### 6d. Verification Flow
- Verifier sees pending entries (highlighted in their calendar + notification badge)
- Click entry → view details → **Verify** or **Reject** (with optional comment)
- Status updates in real-time for submitter

### 6e. Notifications
- Bell icon in header with unread count badge
- Dropdown list of recent notifications:
  - Verifier/Viewer: "Krunal submitted 4 hours on Feb 15"
  - Submitter: "Hours for Feb 15 were verified/rejected"
- Marked as read on click

### 6g. Email Notifications (via Resend)
- **On new entry submitted:** Email sent to verifier with entry details (date, time, hours, description)
- **On verification/rejection:** Email sent to submitter with status + verifier comment (if rejected)
- Email contains: subject line, formatted entry details, direct link to the app
- Only sent to users who have an email on file (email is prompted on first login)
- Free tier: 100 emails/day — more than enough for this use case

### 6f. Admin Panel
- Table of users (email, name, role)
- Add user (email + password + role)
- Edit role / delete user
- Simple table UI, nothing fancy

---

## 7. UI Layout

```
┌──────────────────────────────────────────────────────┐
│  Header: Logo | Navigation | 🔔 Notifications | User │
├──────────────────────┬───────────────────────────────┤
│                      │                               │
│   Calendar View      │   Dashboard Sidebar           │
│   (main content)     │   - Hours this week           │
│                      │   - Hours this month           │
│                      │   - Pending / Verified         │
│   [+ Add Hours]      │                               │
│                      │                               │
├──────────────────────┴───────────────────────────────┤
│  Footer (minimal)                                     │
└──────────────────────────────────────────────────────┘
```

---

## 8. Implementation Phases

### Phase 1 — Project Setup & Auth (~1 session)
- Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
- Set up Supabase project (database, auth)
- Create database tables and RLS policies
- Implement login page and auth middleware
- Seed 3 users + 1 admin

### Phase 2 — Calendar View & Time Entry (~1-2 sessions)
- Build calendar component (monthly grid)
- Add time entry modal (form + API route)
- Display entries on calendar with status dots
- Day detail side panel

### Phase 3 — Dashboard & Stats (~1 session)
- Dashboard sidebar component
- API routes for aggregated stats
- Weekly/monthly totals with status breakdown

### Phase 4 — Verification Flow (~1 session)
- Verifier view of pending entries
- Verify/Reject actions with API
- Status updates and entry detail view

### Phase 5 — Notifications + Email (~0.5 session)
- Notification creation on submit/verify/reject
- Bell icon with badge count
- Notification dropdown with mark-as-read
- Resend API integration for email notifications
- Email sent to verifier on new entry, to submitter on verify/reject

### Phase 6 — Admin Panel (~0.5 session)
- User CRUD operations
- Admin-only route protection
- User management table

### Phase 7 — Deploy (~0.5 session)
- Environment variables configured on Vercel
- Deploy to Vercel
- Test with real users

---

## 9. Confirmed Decisions

| Decision          | Choice                                                      |
|-------------------|-------------------------------------------------------------|
| Time input        | Start time + End time (auto-calculates hours)               |
| Batch entry       | Not needed — one entry at a time                            |
| Rejection flow    | Verifier adds comment → submitter can edit & resubmit       |
| Entry fields      | Date, start/end time, description (free text only)          |
| Auth method       | Username/password login (no email required initially)       |
| Theme             | Light mode only                                             |
| Deployment        | Vercel default subdomain                                    |

### Pre-seeded Users

| Username | Role               | Password     | Notes                        |
|----------|--------------------|--------------|------------------------------|
| krunal   | admin + submitter  | krunal@123   | Logs hours + manages users   |
| harsha   | verifier           | harsha@123   | Verifies/rejects entries     |
| reddy    | viewer             | reddy@123    | View-only access             |

- Login via **username + password** (not email)
- First login prompts user to add email if not present (optional profile field)

---

## 10. Free Tier Limits (What You Get)

| Service   | Free Tier                                    |
|-----------|----------------------------------------------|
| Vercel    | 100GB bandwidth/mo, serverless functions     |
| Supabase  | 500MB DB, 50K rows, 500MB storage, 2GB transfer |

More than enough for a 3-4 user productivity tool.

---

## 11. File Structure (Planned)

```
hours-tracker/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout with header, sidebar
│   │   ├── page.tsx              # Calendar view (main)
│   │   ├── login/page.tsx        # Login page
│   │   ├── admin/page.tsx        # Admin panel
│   │   └── api/
│   │       ├── entries/route.ts  # CRUD for time entries
│   │       ├── verify/route.ts   # Verify/reject entries
│   │       ├── stats/route.ts    # Dashboard stats
│   │       ├── notifications/route.ts
│   │       └── users/route.ts    # Admin user management
│   ├── components/
│   │   ├── Calendar.tsx
│   │   ├── AddEntryModal.tsx
│   │   ├── DashboardSidebar.tsx
│   │   ├── NotificationBell.tsx
│   │   ├── EntryCard.tsx
│   │   └── UserTable.tsx
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client
│   │   ├── auth.ts               # Auth helpers
│   │   ├── email.ts              # Resend email helper
│   │   └── types.ts              # TypeScript types
│   └── middleware.ts             # Auth route protection
├── supabase/
│   └── migrations/               # SQL migrations
├── tailwind.config.ts
├── next.config.js
└── package.json
```
