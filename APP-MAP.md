# AI Task Orchestrator — Application Map

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐│
│  │  Next.js App  │  │  IndexedDB   │  │  IS 5568 Accessibility    ││
│  │  (Vercel)     │  │  (Crash Safe) │  │  Widget (WCAG 2.1 AA)    ││
│  └──────┬───────┘  └──────┬───────┘  └────────────────────────────┘│
│         │                  │                                        │
│  ┌──────┴──────────────────┴────────────────────────────────┐      │
│  │              MediaRecorder + Audio Pipeline               │      │
│  │  1. mic → MediaRecorder.start(1000)                       │      │
│  │  2. ondataavailable → append chunk to IndexedDB           │      │
│  │  3. onstop → merge chunks → send to Backend               │      │
│  │  4. on mount → check IndexedDB for crash recovery         │      │
│  └──────────────────────────┬───────────────────────────────┘      │
└─────────────────────────────┼───────────────────────────────────────┘
                              │  HTTPS (audio blob upload)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND API (Render)                             │
│                     Python FastAPI                                   │
│                                                                     │
│  ┌─────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │ /api/audio   │  │ /api/tasks      │  │ /api/prompts           │  │
│  │ POST process │  │ CRUD + approve  │  │ CRUD + version history │  │
│  └──────┬──────┘  └────────┬────────┘  └───────────┬────────────┘  │
│         │                  │                        │               │
│  ┌──────┴──────────────────┴────────────────────────┴───────┐      │
│  │                    Service Layer                           │      │
│  │  ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐  │      │
│  │  │ GeminiService   │  │ TaskService  │  │ AuthService │  │      │
│  │  │ (2.5 Flash)     │  │              │  │ (JWT verify)│  │      │
│  │  │ - transcribe    │  │ - create     │  │ - Supabase  │  │      │
│  │  │ - summarize     │  │ - approve    │  │   token     │  │      │
│  │  │ - extract tasks │  │ - reject     │  │   parsing   │  │      │
│  │  │ - sentiment     │  │ - sync lock  │  │             │  │      │
│  │  └─────────────────┘  └──────────────┘  └─────────────┘  │      │
│  └──────────────────────────────────────────────────────────┘      │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │  Supabase Client (service_role)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPABASE (BaaS)                                  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  Auth         │  │  PostgreSQL DB   │  │  Realtime             │  │
│  │  (Google      │  │  (with RLS)      │  │  (task updates,       │  │
│  │   OAuth 2.0)  │  │                  │  │   notifications)      │  │
│  └──────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                     │
│  RLS Policy Pattern:                                                │
│  ── WHERE auth.uid() = user_id AND org_id = current_org_id ──      │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────┐       ┌──────────────────────┐
│   organizations     │       │   profiles            │
├─────────────────────┤       ├──────────────────────┤
│ id (uuid PK)        │       │ id (uuid PK = auth)  │
│ name                │       │ email                │
│ total_capacity_min  │       │ full_name            │
│ used_capacity_min   │       │ avatar_url           │
│ created_at          │       │ created_at           │
└────────┬────────────┘       └──────────┬───────────┘
         │                               │
         │  ┌────────────────────────┐   │
         └──┤   org_memberships      ├───┘
            ├────────────────────────┤
            │ id (uuid PK)          │
            │ user_id (FK profiles) │
            │ org_id (FK orgs)      │
            │ role (enum)           │  ← admin | member | participant
            │ capacity_minutes      │  ← per-member allocation
            │ used_minutes          │
            │ created_at            │
            └────────────┬─────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌─────────────────────┐       ┌──────────────────────┐
│   sessions          │       │   tasks               │
├─────────────────────┤       ├──────────────────────┤
│ id (uuid PK)        │       │ id (uuid PK)         │
│ org_id (FK)         │       │ session_id (FK)      │
│ created_by (FK)     │       │ org_id (FK)          │
│ title               │       │ title                │
│ summary             │       │ description          │
│ sentiment           │       │ assignee_id (FK)     │
│ duration_seconds    │       │ status               │
│ ai_prompt_version   │       │ priority             │
│ created_at          │       │ external_sync_id     │ ← Jira/Monday ID
└─────────────────────┘       │ is_locked            │ ← true if synced
                              │ created_at           │
                              └──────────────────────┘

┌─────────────────────┐       ┌──────────────────────┐
│   pending_tasks     │       │   notifications      │
├─────────────────────┤       ├──────────────────────┤
│ id (uuid PK)        │       │ id (uuid PK)         │
│ task_id (FK tasks)  │       │ org_id (FK)          │
│ org_id (FK)         │       │ user_id (FK)         │
│ requested_by (FK)   │       │ type (enum)          │
│ field_changed       │       │ title                │
│ old_value           │       │ body                 │
│ new_value           │       │ related_entity_id    │
│ status (enum)       │  ←    │ is_read              │
│  pending|approved|  │       │ created_at           │
│  rejected           │       └──────────────────────┘
│ reviewed_by (FK)    │
│ created_at          │       ┌──────────────────────┐
└─────────────────────┘       │   prompt_versions    │
                              ├──────────────────────┤
                              │ id (uuid PK)         │
                              │ org_id (FK)          │
                              │ version (int)        │
                              │ prompt_text          │
                              │ created_by (FK)      │
                              │ is_active            │
                              │ created_at           │
                              └──────────────────────┘
```

## Frontend Page Tree

```
app/
├── page.tsx                          → Landing page / Login
├── auth/
│   └── callback/page.tsx             → Google OAuth callback
│
├── dashboard/
│   ├── layout.tsx                    → Shared shell: GlobalNav + OrgSwitcher + AccessibilityWidget
│   │
│   ├── platform/                     → Platform Admins (Shalev & Omer)
│   │   └── page.tsx                  → Global org config, log monitoring
│   │
│   ├── admin/                        → Organization Admin
│   │   └── page.tsx                  → Metrics, user provisioning, quota mgmt
│   │
│   ├── member/                       → Organization Member
│   │   ├── page.tsx                  → Recording hub, session timer, analytics
│   │   └── inbox/page.tsx            → Approval inbox for pending_tasks
│   │
│   └── participant/                  → Organization Participant
│       └── page.tsx                  → Task list (read-only), edit request mode
│
└── not-found.tsx
```

## Component Architecture

```
<RootLayout>
  ├── <SupabaseProvider>              → Auth state, session, Supabase client
  │   ├── <OrganizationProvider>      → Current org context, role, capacity
  │   │   ├── <AccessibilityWidget/>  → IS 5568 floating trigger (grayscale, font, RTL)
  │   │   ├── <GlobalNav>
  │   │   │   ├── <OrgSwitcher/>      → Dropdown: switch org, updates RLS context
  │   │   │   ├── <NotificationBell/> → Badge count from notifications table
  │   │   │   └── <UserMenu/>         → Profile, logout
  │   │   │
  │   │   └── <PageContent>
  │   │       ├── [Platform]
  │   │       │   └── <OrgTable/>, <LogViewer/>
  │   │       │
  │   │       ├── [Admin]
  │   │       │   ├── <MetricsCards/>  → Total minutes, members, capacity
  │   │       │   ├── <MemberTable/>   → Provision users, set quotas
  │   │       │   └── <PromptEditor/> → Edit system prompt + version history
  │   │       │
  │   │       ├── [Member]
  │   │       │   ├── <RecordingHub>
  │   │       │   │   ├── <BigRecordButton/>      → Disabled at ≤55 min
  │   │       │   │   ├── <SessionTimer/>
  │   │       │   │   ├── <LowBalanceAlert/>      → Shows at ≤70 min
  │   │       │   │   └── <CrashRecoveryModal/>   → IndexedDB check on mount
  │   │       │   ├── <ApprovalInbox/>
  │   │       │   │   └── <PendingTaskCard/>       → Approve / Reject
  │   │       │   └── <PersonalAnalytics/>
  │   │       │
  │   │       └── [Participant]
  │   │           ├── <TaskList/>
  │   │           │   ├── <TaskCard/>              → Read-only view
  │   │           │   └── <EditRequestForm/>       → Creates pending_task
  │   │           └── <OrgFilter/>
  │   │
  │   └── <RealtimeProvider/>          → Supabase channels for live sync
  └── </SupabaseProvider>
```

## Data Flow: Recording → Tasks

```
 User taps "Record"
       │
       ▼
 ┌─────────────────────────┐
 │ MediaRecorder.start(1000)│
 │  timeslice = 1 second    │
 └────────┬────────────────┘
          │  ondataavailable
          ▼
 ┌─────────────────────────┐
 │ Append chunk to          │
 │ IndexedDB (session store)│  ← Crash safety net
 └────────┬────────────────┘
          │  User taps "Stop"
          ▼
 ┌─────────────────────────┐
 │ Merge all chunks → Blob  │
 │ POST /api/audio/process  │
 └────────┬────────────────┘
          │  Backend receives blob
          ▼
 ┌─────────────────────────┐
 │ Audio stays IN-MEMORY    │  ← Zero disk footprint
 │ Pipe to Gemini 2.5 Flash │
 │  using active prompt      │
 └────────┬────────────────┘
          │  AI returns structured JSON
          ▼
 ┌─────────────────────────────────────────┐
 │ { summary, sentiment, tasks[] }         │
 │                                         │
 │ Insert → sessions table                 │
 │ Insert → tasks table (per extracted)    │
 │ Broadcast via Supabase Realtime         │
 │ Deduct duration from member's capacity  │
 └────────┬────────────────────────────────┘
          │  200 OK → frontend
          ▼
 ┌─────────────────────────┐
 │ Clear IndexedDB chunks   │
 │ Show session results UI  │
 └─────────────────────────┘
```

## Security Model

```
┌────────────────────── Zero-Trust Validation ──────────────────────┐
│                                                                   │
│  1. Auth: Google OAuth → Supabase Auth → JWT (access_token)       │
│                                                                   │
│  2. Frontend: Every API call includes Authorization: Bearer <jwt> │
│                                                                   │
│  3. Backend: FastAPI middleware verifies JWT with Supabase,        │
│     extracts user_id and resolves org_id + role from              │
│     org_memberships table.                                        │
│                                                                   │
│  4. RLS: Every Supabase query checks:                             │
│     WHERE auth.uid() = user_id AND org_id = <current_org>         │
│                                                                   │
│  5. Participant Edits:                                            │
│     participant → pending_tasks (status='pending')                │
│     member reviews → status='approved' → copy to tasks            │
│                   → status='rejected' → notify participant        │
│                                                                   │
│  6. Sync Lock: When task.external_sync_id IS NOT NULL,            │
│     task.is_locked = true → UI disables editing                   │
│                                                                   │
│  7. Audio: Never persisted to disk on the server.                 │
│     Processed in-memory, result stored, audio discarded.          │
└───────────────────────────────────────────────────────────────────┘
```

## Deployment Topology

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Vercel      │     │   Render          │     │   Supabase        │
│   (Frontend)  │────▶│   (Backend API)   │────▶│   (BaaS)          │
│               │     │                   │     │                   │
│ Next.js 14    │     │ Python FastAPI    │     │ PostgreSQL + RLS  │
│ Static + SSR  │     │ Uvicorn           │     │ Auth (Google)     │
│ Edge Runtime  │     │ Docker container  │     │ Realtime channels │
│               │     │ Auto-scaling      │     │ Storage (if need) │
└──────────────┘     └──────────────────┘     └──────────────────┘
       │                                              │
       └──────── Supabase JS Client (anon key) ───────┘
                 Direct DB access with RLS
```

## File Structure

```
ai-task-orchestrator/
├── frontend/                          # Next.js app (deployed to Vercel)
│   ├── src/
│   │   ├── app/                       # App Router pages
│   │   ├── components/                # React components
│   │   │   ├── ui/                    # Base design system
│   │   │   ├── recording/            # Recording hub components
│   │   │   ├── accessibility/        # IS 5568 widget
│   │   │   ├── inbox/                # Notification/approval
│   │   │   ├── navigation/           # GlobalNav, OrgSwitcher
│   │   │   └── tasks/                # Task cards, lists
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── lib/                       # Supabase client, IndexedDB, API
│   │   ├── providers/                 # Context providers
│   │   ├── stores/                    # Zustand stores
│   │   └── types/                     # TypeScript types
│   ├── public/
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── package.json
│
├── backend/                           # FastAPI app (deployed to Render)
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── api/
│   │   │   ├── routes/                # Route modules
│   │   │   ├── middleware/            # Auth, rate-limit
│   │   │   └── deps.py               # Dependency injection
│   │   ├── services/                  # Business logic
│   │   ├── models/                    # Pydantic schemas
│   │   └── config.py                  # Environment config
│   ├── requirements.txt
│   ├── Dockerfile
│   └── render.yaml
│
├── supabase/                          # Supabase project config
│   ├── migrations/                    # SQL migration files
│   └── config.toml
│
├── APP-MAP.md                         # This file
├── project-guideline.md               # Original spec
└── .env.example                       # Environment template
```
