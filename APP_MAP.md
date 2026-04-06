# APP_MAP.md — Listen Agent Application Map

> **Living Document** — Updated automatically whenever features, endpoints, or architecture change.
> Last updated: 2026-04-06 (Nuclear Cleanup: feature-based restructure, dead code purge, dependency trim)

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Tech Stack](#2-tech-stack)
3. [Core User Flows](#3-core-user-flows)
4. [Feature Inventory](#4-feature-inventory)
5. [API Endpoints](#5-api-endpoints)
6. [Database Schema](#6-database-schema)
7. [Project Folder Structure](#7-project-folder-structure)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER (SPA)                         │
│  React 18 + Vite + TypeScript + Tailwind + Radix UI          │
│  Auth: Supabase JS SDK  │  State: React Query + Context       │
│  Real-time: Supabase Realtime WebSocket subscriptions         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (REST) /api/*
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS.JS BACKEND                         │
│  Node.js 20 · ES Modules · PORT 3001                        │
│  Middleware: Helmet · CORS · Pino · Rate Limit · Zod         │
│  Auth Middleware: JWT validation via Supabase                 │
│  Routes: process, sessions, tasks, config, analytics, auth   │
└────────┬──────────────────────────┬─────────────────────────┘
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌──────────────────────────┐
│  SUPABASE       │      │  GOOGLE GEMINI 2.5-FLASH │
│  PostgreSQL DB  │      │  AI Audio Analysis        │
│  Auth (JWT)     │      │  Structured JSON output   │
│  Realtime WS    │      │  90s timeout, 3x retry    │
│  Row-Level Sec. │      └──────────────────────────┘
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  RESEND EMAIL   │
│  Client notifs  │
│  Task reminders │
└─────────────────┘
```

**Deployment:**
- **Frontend:** Vercel (`https://task-app-five-woad.vercel.app`)
- **Backend:** Node.js server (port 3001)
- **Database:** Supabase cloud (PostgreSQL + Auth + Realtime)

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 5.4 | Build tool & dev server (port 8080) |
| React Router | v6 | SPA routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| Radix UI | latest | Accessible component primitives (19 used) |
| Framer Motion | 12.38 | Page transitions & animations |
| TanStack React Query | 5.83 | Server state management & caching |
| Supabase JS | 2.100 | Auth + Realtime subscriptions |
| Zod | 3.25 | Client-side schema validation |
| i18next | 23.16 | Internationalization (Hebrew, English, Russian) |
| recharts | 2.15 | Analytics charts |
| sonner | 1.7 | Toast notifications |
| Sentry | latest | Client-side error reporting |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20+ | Runtime |
| Express.js | 4.19 | HTTP server framework |
| Supabase (service role) | — | Database + Auth validation |
| Google Gemini API | 2.5-flash | AI audio transcription & analysis |
| Multer | 1.4 | Multipart audio upload (memory storage) |
| Pino | 10.3 | Structured JSON logging |
| Helmet | 8.1 | Security HTTP headers |
| express-rate-limit | — | API and audio rate limiting |
| Zod | 3.25 | Server-side request validation |
| Resend | 6.9 | Transactional email delivery |

### Testing
| Tool | Purpose |
|------|---------|
| Vitest 3.2 | Unit & integration tests |
| Supertest 7.2 | HTTP API testing |
| @testing-library/react 16 | Component testing |
| Playwright 1.57 | End-to-end tests |

---

## 3. Core User Flows

### Flow 1: Provider Authentication
```
/login
  ├─ Email + Password → Supabase Auth → JWT
  ├─ "Sign in with Google" → OAuth → /auth/callback → JWT
  └─ Role resolved from user_metadata.role
       └─ Redirect to /provider/dashboard
```

### Flow 2: Client Authentication
```
/login
  └─ Email + Password → Supabase Auth → JWT
       └─ Role = "client" → Redirect to /client/dashboard
```

### Flow 3: Audio Processing (Core Feature)
```
Provider clicks "Record" on /provider/dashboard
  └─ RecordDialog opens
       ├─ Microphone capture via MediaRecorder API
       ├─ Real-time waveform visualization
       └─ Provider enters client email + stops recording
            └─ POST /api/process-audio (audio blob + clientEmail)
                 ├─ Backend: validate audio duration ≥ 3 seconds
                 ├─ Base64-encode audio
                 ├─ Call Google Gemini 2.5-flash with system prompt
                 │    └─ Returns: { title, summary, sentiment,
                 │                   followUpQuestions, tasks[] }
                 ├─ Deduplicate tasks by title
                 ├─ Save session to Supabase (audio NOT stored)
                 ├─ Save tasks to Supabase
                 └─ Send notification email to client (Resend)
                      └─ Redirect to /provider/board/:sessionId
```

### Flow 4: Provider Reviews Session
```
/provider/dashboard (sessions list, paginated, searchable)
  └─ Click session → /provider/board/:sessionId
       ├─ View AI-generated summary & sentiment
       ├─ View follow-up questions
       ├─ Manage tasks (add/edit/complete/delete)
       ├─ AudioPlayer (if audio available)
       └─ Bulk-complete all tasks
```

### Flow 5: Client Reviews Assigned Tasks
```
/client/dashboard (task list grouped by session)
  └─ Click session → /client/board/:sessionId
       ├─ View session summary
       ├─ See tasks assigned to "Client"
       ├─ Toggle task completion (Supabase RLS enforced)
       ├─ ProgressGraph — visual completion percentage
       └─ TimeCapsule — session history timeline
```

### Flow 6: Provider Configures AI Prompt
```
/provider/config
  ├─ View current system prompt (Hebrew financial advisor instructions)
  ├─ Edit prompt → PUT /api/config
  │    └─ Old version auto-archived to history
  └─ View prompt history → GET /api/config/history (last 20 versions)
```

### Flow 7: Analytics & Export
```
/provider/analytics
  ├─ GET /api/analytics/overview → session counts, completion rates, sentiment breakdown
  └─ GET /api/analytics/sessions/export → CSV download (UTF-8 BOM for Hebrew)
```

### Flow 8: Real-Time Collaboration
```
Provider saves changes
  └─ Supabase Realtime broadcasts change
       └─ Client sees updated tasks/sessions instantly
            (no page refresh required)
```

### Flow 9: Provider CRM — Client Grid
```
/provider/clients
  ├─ Sessions fetched via apiFetchSessions() → grouped by clientEmail
  ├─ Bento grid: avatar, health status badge, "X משימות פתוחות", days-ago
  ├─ Smart filter bar: all / at-risk / neutral / positive + search
  ├─ Click client card → Framer Motion slide-in detail panel
  │    └─ Session timeline: date, title, sentiment icon, RTL progress bar
  └─ Declining sentiment → warning label shown on card
```

### Flow 10: Provider Task Center
```
/provider/tasks
  ├─ All sessions with pending tasks (taskCount > completedCount)
  ├─ Sorted by oldest first (most overdue at top)
  └─ Urgency badges: מעוכב (7+ days) · דחוף (14+ days)
```

### Flow 11: Accessibility Widget
```
User presses Tab (first time) → skip-nav link appears → "דלג לתוכן הראשי"
  OR
User clicks FAB (bottom-end) → Sheet panel opens
  ├─ Toggle any of 9 accessibility settings
  │    └─ CSS class applied to <html> immediately
  ├─ Settings saved to localStorage ("a11y-settings")
  └─ Settings restored on page load (AppBootstrap reads localStorage)
```

---

## 4. Feature Inventory

### Authentication & Authorization
- [x] Email/password sign-up and sign-in
- [x] Google OAuth sign-in
- [x] Auth callback handler (`/auth/callback`)
- [x] Forgot password + reset password via email link
- [x] Role-based routing (provider vs. client)
- [x] JWT auto-refresh in API client
- [x] Protected routes with role guard (`ProtectedRoute`)
- [x] Supabase Row-Level Security (RLS) policies

### Audio Recording & Processing
- [x] In-browser audio recording (`RecordDialog`)
- [x] Real-time waveform visualization during recording
- [x] Audio upload to backend (multipart/form-data)
- [x] Server-side audio validation (min duration ≥ 3 seconds)
- [x] Privacy-first: audio never persisted to disk or DB
- [x] Google Gemini 2.5-flash AI analysis
- [x] Structured output: title, summary, sentiment, tasks, follow-up questions
- [x] Retry logic (3 attempts, exponential backoff)
- [x] Task deduplication after AI generation

### Session Management
- [x] Session list with pagination (cursor-based)
- [x] Session search by client email
- [x] Session date range filtering
- [x] Session detail view with summary & sentiment badge
- [x] Follow-up questions display
- [x] Session metadata editing (title, sentiment)
- [x] Session deletion (provider only)
- [x] Real-time session updates via Supabase Realtime

### Task Management
- [x] AI-generated tasks on audio processing
- [x] Manual task creation (provider)
- [x] Task editing (title, description, assignee, priority)
- [x] Task completion toggle (client for their tasks, provider for all)
- [x] Task deletion (provider)
- [x] Bulk-complete all tasks (provider)
- [x] Task assignment: Advisor | Client
- [x] Task priority: High | Medium | Low
- [x] Real-time task updates via Supabase Realtime

### AI Prompt Configuration
- [x] View current system prompt
- [x] Edit system prompt (provider only)
- [x] Prompt version history (last 20 versions)
- [x] Auto-archive on update

### Analytics & Reporting
- [x] Session count overview
- [x] Task completion rate metrics
- [x] Sentiment breakdown (Positive | Neutral | At-Risk)
- [x] Client progress charts (`ProgressGraph`)
- [x] CSV export with UTF-8 BOM (Hebrew-safe)

### Email Notifications
- [x] New session notification email to client
- [x] 24-hour reminder for pending tasks (>3 days old)
- [x] Unsubscribe header support

### Provider CRM Dashboard
- [x] **`/provider/clients`** — Dedicated CRM page: bento grid of client cards, master-detail slide-in panel (Framer Motion)
  - Avatar (initials), status badge (pulsing for At-Risk), "X משימות פתוחות", "לפני X ימים"
  - Sentiment sparkline (last 5 sessions); declining trend warning label
  - Smart filter bar: all / בסיכון / ניטרלי / חיובי + client email search
  - Client detail panel: session timeline with RTL mini progress bars, independent scroll container
  - Skeleton loading grid (8 cards)
- [x] **`/provider/tasks`** — Unified task center: all sessions with pending tasks sorted by oldest first
  - Urgency badges: "מעוכב" (7+ days), "דחוף" (14+ days)
  - Skeleton loading list
- [x] `ClientPulseGrid` upgraded: smart sentiment filter pills, overdue toggle, At-Risk pulse ring (`ring-2 ring-red-400/60 animate-pulse`), expandable client→session list with lazy loading, `dir="ltr"` on all count displays, "X משימות פתוחות" Hebrew label
- [x] Sidebar navigation updated to Hebrew labels: "דף הבית", "לקוחות", "משימות פתוחות", "ניתוחים", "הגדרות AI"
- [x] RTL sidebar slide fix: `ltr:-translate-x-full rtl:translate-x-full`
- [x] Mobile bottom navigation bar (`md:hidden fixed bottom-0`) with 3 thumb-friendly tabs: דף הבית / לקוחות / משימות

### Accessibility (IS 5568 / WCAG 2.1 AA)
- [x] `AccessibilityWidget` — floating FAB (`bottom-end`, above mobile bottom nav) with Sheet panel
  - Hebrew labels throughout; `aria-label="תפריט נגישות"`; active-count badge
  - **Visual:** High contrast (CSS `filter: invert(1) hue-rotate(180deg)`), Grayscale, Text scale (120/150/200%), Highlight links/buttons
  - **Navigation:** Enhanced 3px focus ring, Stop animations (epilepsy/ADHD safety — disables all transitions + hides `<video>`), Big cursor (40px SVG, black+white)
  - **Content:** Readable font (Assistant/Arial), Reading guide (cursor-following yellow band)
  - Reset-all button; settings persisted in `localStorage` key `a11y-settings`
  - Applied via CSS classes on `<html>`: `.a11y-high-contrast`, `.a11y-grayscale`, `.a11y-font-120/150/200`, `.a11y-highlight-links`, `.a11y-focus-ring`, `.a11y-stop-animations`, `.a11y-big-cursor`, `.a11y-readable-font`
  - Footer: link to `/accessibility` (הצהרת נגישות)
- [x] Skip navigation link: `<a href="#main-content" class="skip-nav">דלג לתוכן הראשי</a>` — visible on Tab press (WCAG 2.4.1)
- [x] `<main id="main-content" tabIndex={-1}>` landmark target in `Layout.tsx`
- [x] **`/accessibility`** — Accessibility Statement page (public, no auth required) in Hebrew; IS 5568 / WCAG 2.1 AA compliant content
- [x] Accessibility footer in provider Layout (desktop): link to `/accessibility` + "IS 5568 / WCAG 2.1 AA" label
- [x] **`CookieConsentBanner`** — Non-intrusive bottom banner; "אני מסכים/ה" / "דחייה" buttons; consent stored in `localStorage('cookie-consent')`; 1.2s delayed appearance; RTL layout

### Feature Discovery Hub
- [x] **`/features`** — Feature Guide page accessible to all providers
  - Bento Grid layout (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`) with `auto-rows` sizing
  - Feature cards: icon (Lucide), title, description, status badge (Active/New/Beta/Soon)
  - Data source: `src/config/features_registry.ts` (22 features across 5 categories)
  - Sidebar entry: "מדריך פיצ'רים" / "Feature Guide" / "Гид по функциям" (all 3 languages)
  - Mobile Bottom Nav entry: `BookOpen` icon
  - Full i18n: he/en/ru translation keys under `features.*`
  - High-contrast black/white theme; `min-h-[calc(100dvh-8rem)]` for iPhone

### UI/UX Features
- [x] Dark mode — class-based (`darkMode: 'class'`), persisted in localStorage, system-preference fallback
- [x] Dark/light toggle button in provider sidebar and client header
- [x] RTL/LTR toggle (`EN/עב`) in sidebar — sets `dir` + `lang` on `<html>`, persisted in localStorage
- [x] Hebrew + English localization (i18next + CSS logical properties)
- [x] Responsive design (mobile-first, full `sm:`/`md:`/`lg:` coverage)
- [x] Page transitions (Framer Motion)
- [x] Toast notifications (sonner)
- [x] Audio playback (`AudioPlayer`)
- [x] Client status grid (`ClientPulseGrid`) with sentiment sparklines
- [x] Session timeline (`TimeCapsule`) with LTR date formatting in RTL context
- [x] Accessibility via Radix UI primitives
- [x] WCAG AA compliance — 20 violations fixed (form labels, aria-labels, focus-visible, touch targets 44px)
- [x] Glassmorphism UI — `.glass`, `.glass-sidebar` utility classes on cards, sidebar, header
- [x] Post-Neumorphism shadows — `shadow-neu`, `shadow-glass` design tokens
- [x] OKLCH color palette — Sage Green primary, Slate Blue secondary, Cream/Graphite backgrounds
- [x] Inter (English) + Assistant (Hebrew) variable fonts; Hebrew text 1.125em scaling
- [x] Motion waveform in `RecordDialog` — framer-motion bars driven by `AnalyserNode` data
- [x] Pulse aura rings around mic button during recording
- [x] Privacy badge — "Processed in-memory. Never saved to disk."
- [x] Confidence badges (High/Medium/Low) on AI-generated tasks with tooltip
- [x] Draft Review state — Provider Approve/Reject per task before client visibility
- [x] Command palette `⌘K` on Provider Dashboard (search sessions, quick actions, navigation)
- [x] Talk-Time Distribution chart in Provider Analytics (Advisor vs. Client %)
- [x] Executive Summary card on Client Dashboard
- [x] Progress Checklist (5-step journey) on Client Dashboard
- [x] Skeleton loading on stats grids wired to `loading` state
- [x] Optimistic task completion toggles with revert-on-failure in both boards
- [x] Mobile-first board architecture — `useIsMobile()` ternary splits Mobile vs Desktop rendering
- [x] ProviderBoard mobile: 3-tab system (Summary | Tasks | Audio), fixed bottom tab bar, AnimatePresence slide transitions
- [x] ClientBoard mobile: 2-tab system (Summary | Tasks), client tasks first (most actionable), advisor tasks in collapsible `<details>`
- [x] Sticky glass session header on both boards (title + sentiment badge, never lost on scroll)
- [x] Bento content chunking — AI summary split into 3 cards + collapsible follow-up questions
- [x] Floating Bulk Complete CTA above tab bar in green zone (Tasks tab, ProviderBoard)
- [x] Scroll hijacking eliminated — `overscroll-contain` on all nested scroll containers
- [x] iPhone safe area support — `env(safe-area-inset-bottom)` on tab bar and CTA float
- [x] RTL progress bars — `[data-radix-progress-indicator]` fills right-to-left in `dir="rtl"`
- [x] Hebrew mobile font — 17px (`1.0625rem`) + `line-height: 1.7` at `< 768px`
- [x] `.mobile-tab-bar`, `.mobile-content-area`, `.cta-float`, `.scroll-isolated` CSS utilities
- [x] `.skip-nav`, `.a11y-*` CSS utility classes for accessibility modes
- [x] `dvh` viewport fix — `@supports (min-height: 100dvh)` overrides `min-h-screen`/`h-screen` to `100dvh`, fixes Safari iOS content cut-off
- [x] `viewport-fit=cover` in `index.html` viewport meta — enables notch/home indicator safe area
- [x] `useLoadingDelay(loading, 200)` hook — deferred spinner prevents flash-of-spinner on fast loads
- [x] Debounced search (250ms) in `/provider/clients` — reduces re-renders on rapid typing

### Developer & Ops Features
- [x] OpenAPI documentation (`/api/docs`)
- [x] Health check endpoint (`/api/health`)
- [x] Mock session generator (`/api/mock`, dev only)
- [x] Structured logging (Pino with request IDs)
- [x] Client-side error tracking (Sentry)
- [x] Graceful server shutdown (waits for in-flight audio jobs)
- [x] Automated audio expiry cleanup (every 24h)

---

## 5. API Endpoints

Base URL: `/api`

### Audio Processing
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/process-audio` | Provider | Upload audio → Gemini AI → save session + tasks |

**Rate limit:** 10 req/15min (audio tier)
**Body:** `multipart/form-data` — `audio` file + `clientEmail` + `systemPrompt`
**Response:** `{ session, tasks, usage }`

### Sessions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sessions` | Any | List sessions (paginated, filterable) |
| GET | `/sessions/:id` | Any | Single session detail |
| PUT | `/sessions/:id` | Provider | Update session metadata |
| DELETE | `/sessions/:id` | Provider | Delete session + tasks (cascade) |

**Query params for GET list:** `limit`, `cursor`, `search` (client email), `dateFrom`, `dateTo`

### Tasks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tasks` | Any | List tasks for a session (`?sessionId=X`) |
| POST | `/tasks` | Provider | Create task manually |
| PATCH | `/tasks/:id` | Client/Provider | Toggle task completion |
| PATCH | `/tasks/:id/details` | Provider | Update task title/description/assignee/priority |
| DELETE | `/tasks/:id` | Provider | Delete task |
| PATCH | `/tasks/bulk-complete` | Provider | Mark all session tasks complete |

### AI Prompt Config
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/config` | Provider | Fetch current system prompt |
| PUT | `/config` | Provider | Update prompt (archives old version) |
| GET | `/config/history` | Provider | Last 20 prompt versions |

### Analytics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/overview` | Provider | Session counts, completion rate, sentiment |
| GET | `/analytics/sessions/export` | Provider | CSV export (UTF-8 BOM) |

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/refresh` | Any | Refresh JWT token |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Server health status |
| GET | `/docs` | None | RapiDoc API documentation UI |
| GET | `/docs/spec` | None | OpenAPI JSON spec |

---

## 6. Database Schema

> **Schema version:** Canonical SQL (last updated 2026-03-30 + pgvector extension + `provider_client_overview` view added). When a new migration SQL is provided, this section is replaced with the latest version.

### Schema Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User roles (provider / client) + identity |
| `sessions` | Meeting records with AI-generated summaries |
| `tasks` | Action items derived from each session |
| `prompt_config` | Singleton AI system prompt + version history |

---

### Canonical SQL — Full Migration Script

```sql
-- ==========================================
-- 0. Extensions
-- ==========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ==========================================
-- 1. יצירת הטבלאות (Tables)
-- ==========================================

-- טבלת פרופילים: מנהלת את התפקידים של המשתמשים (יועץ או לקוח)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('provider', 'client')),
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- טבלת שיחות: שומרת את הפגישות, הכותרות והסיכומים של ה-AI
CREATE TABLE public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT,
  summary TEXT,
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_email TEXT
);

-- טבלת משימות: רשימת המטלות שנגזרות מכל שיחה
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee TEXT, -- למי מוקצית המשימה (Client / Advisor)
  priority TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. הדלקת מנגנון האבטחה (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. חוקי אבטחה ופרטיות (Policies)
-- ==========================================

-- פרופילים: כל משתמש רואה רק את הפרופיל של עצמו
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

-- שיחות: יועץ מנהל רק את השיחות שלו
CREATE POLICY "Providers manage their sessions"
ON public.sessions FOR ALL USING (auth.uid() = provider_id);

-- שיחות: לקוח רק צופה בשיחות שמשויכות לאימייל שלו
CREATE POLICY "Clients view their sessions"
ON public.sessions FOR SELECT USING (auth.jwt()->>'email' = client_email);

-- משימות: הגישה מותרת רק אם יש לך גישה לשיחה המקושרת
CREATE POLICY "Access tasks via session"
ON public.tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.id = tasks.session_id
    AND (sessions.provider_id = auth.uid() OR sessions.client_email = auth.jwt()->>'email')
  )
);

-- ==========================================
-- 4. אוטומציה (Triggers)
-- ==========================================

-- פונקציה שיוצרת פרופיל אוטומטית כשמשתמש חדש מתחבר עם גוגל
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'client') -- ברירת מחדל: לקוח
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- הטריגר שמפעיל את הפונקציה
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 5. ביצועים ומהירות (Indexes)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_sessions_provider ON public.sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client ON public.sessions(client_email);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON public.tasks(session_id);

-- ==========================================
-- 6. עדכוני זמן אמת (Realtime)
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- ==========================================
-- 7. Views
-- ==========================================

-- תצוגה מאוחדת לדאשבורד של יועץ: סטטוס לקוחות, מדד בריאות, פעילות אחרונה
-- מחשב client_health_status בהתבסס על סנטימנט Gemini ופיגור במשימות
CREATE OR REPLACE VIEW provider_client_overview AS
SELECT
    p.id AS client_id,
    p.full_name,
    p.email,
    COUNT(DISTINCT s.id) AS total_sessions,
    COUNT(t.id) FILTER (WHERE t.completed = false) AS pending_tasks_count,
    CASE
        WHEN COUNT(t.id) FILTER (WHERE t.completed = false AND t.created_at < NOW() - INTERVAL '7 days') > 5 THEN 'At-Risk'
        WHEN AVG(CASE WHEN s.sentiment = 'Positive' THEN 3 WHEN s.sentiment = 'Neutral' THEN 2 ELSE 1 END) < 1.5 THEN 'At-Risk'
        WHEN COUNT(t.id) FILTER (WHERE t.completed = false) > 0 THEN 'Active'
        ELSE 'Healthy'
    END AS client_health_status,
    MAX(s.created_at) AS last_interaction
FROM profiles p
LEFT JOIN sessions s ON s.client_email = p.email
LEFT JOIN tasks t ON t.session_id = s.id
WHERE p.role = 'client'
GROUP BY p.id, p.full_name, p.email;
```

---

### Column Reference

#### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK → auth.users | CASCADE DELETE |
| `role` | TEXT | CHECK: `provider` \| `client` |
| `email` | TEXT | Copied from auth.users |
| `full_name` | TEXT | From OAuth metadata |
| `created_at` | TIMESTAMPTZ | Auto |

#### `sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | gen_random_uuid() |
| `created_at` | TIMESTAMPTZ | Auto |
| `title` | TEXT | AI-generated Hebrew headline |
| `summary` | TEXT | AI-generated summary |
| `sentiment` | TEXT | `Positive` \| `Neutral` \| `At-Risk` — from Gemini |
| `follow_up_questions` | JSONB | Array of suggested questions from Gemini |
| `filename` | TEXT | Original audio filename |
| `audio_url` | TEXT | Not stored (privacy-first, always NULL) |
| `provider_id` | UUID FK → auth.users | CASCADE DELETE |
| `client_email` | TEXT | RLS key for client access |

#### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | gen_random_uuid() |
| `session_id` | UUID FK → sessions | CASCADE DELETE |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `assignee` | TEXT | `Client` \| `Advisor` |
| `priority` | TEXT | `High` \| `Medium` \| `Low` |
| `completed` | BOOLEAN | Default FALSE |
| `created_at` | TIMESTAMPTZ | Auto |

#### `provider_client_overview` (VIEW)
| Column | Type | Notes |
|--------|------|-------|
| `client_id` | UUID | From `profiles.id` |
| `full_name` | TEXT | From `profiles.full_name` |
| `email` | TEXT | From `profiles.email` |
| `total_sessions` | BIGINT | COUNT DISTINCT sessions |
| `pending_tasks_count` | BIGINT | Incomplete tasks across all sessions |
| `client_health_status` | TEXT | `'At-Risk'` \| `'Active'` \| `'Healthy'` — computed from overdue tasks + Gemini sentiment avg |
| `last_interaction` | TIMESTAMPTZ | MAX session created_at |

> **Health logic:** `At-Risk` if >5 tasks overdue >7 days OR avg sentiment score < 1.5. `Active` if any pending tasks. `Healthy` if all tasks done.

---

### RLS Policy Summary
| Table | Who | Access |
|-------|-----|--------|
| `profiles` | Self | SELECT own row only |
| `sessions` | Provider | ALL (own sessions via `provider_id`) |
| `sessions` | Client | SELECT where `client_email` = JWT email |
| `tasks` | Provider or Client | ALL via session membership check |

---

#### `prompt_config`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK | Always 1 (singleton, enforced by CHECK constraint) |
| `system_prompt` | TEXT | Active Hebrew AI system prompt |
| `updated_at` | TIMESTAMPTZ | Last update time |

---

### Indexes (complete)
```sql
idx_sessions_provider     ON sessions(provider_id)
idx_sessions_client       ON sessions(client_email)
idx_sessions_created_at   ON sessions(created_at DESC)
idx_tasks_session         ON tasks(session_id)
idx_profiles_email        ON profiles(email)
```

---

### Trigger: `on_auth_user_created`
Automatically inserts a row into `profiles` when a new user registers (including Google OAuth). Defaults `role` to `'client'` unless the registration metadata explicitly sets a different role.

---

## 7. Project Folder Structure

> Restructured 2026-04-06 — Domain-Driven Feature Architecture. All code is in `src/features/<domain>/`.

```
listen_agent/
│
├── src/                            # React frontend (Vite + TypeScript)
│   │
│   ├── features/                  # Domain-driven feature modules
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx               # Email/Google OAuth sign-in
│   │   │   │   ├── Signup.tsx              # Registration + role selection
│   │   │   │   ├── AuthCallback.tsx        # OAuth redirect handler
│   │   │   │   ├── ForgotPassword.tsx      # Password reset request
│   │   │   │   └── ResetPassword.tsx       # Token-based password reset
│   │   │   └── components/
│   │   │       └── ProtectedRoute.tsx      # Auth + role guard wrapper
│   │   │
│   │   ├── clients/
│   │   │   ├── pages/
│   │   │   │   ├── ProviderClients.tsx     # CRM bento grid + master-detail slide-in
│   │   │   │   └── ClientProfile.tsx       # Per-client detail view
│   │   │   └── components/
│   │   │       ├── ClientPulseGrid.tsx     # Client health cards + pulse ring
│   │   │       ├── AssignClientDialog.tsx  # Assign client to session dialog
│   │   │       ├── ProgressGraph.tsx       # Task completion chart (glassmorphism)
│   │   │       └── TimeCapsule.tsx         # Session history timeline
│   │   │
│   │   ├── sessions/
│   │   │   ├── pages/
│   │   │   │   ├── ClientDashboard.tsx     # Client: Executive Summary + Progress
│   │   │   │   └── ClientBoard.tsx         # Client: task board per session
│   │   │   └── components/
│   │   │       ├── RecordDialog.tsx        # Audio recording + waveform + pulse aura
│   │   │       └── AudioPlayer.tsx         # Session audio playback
│   │   │
│   │   ├── tasks/
│   │   │   ├── pages/
│   │   │   │   ├── ProviderBoard.tsx       # Provider: task board per session
│   │   │   │   └── ProviderTasks.tsx       # Unified task center — all pending tasks
│   │   │   └── components/
│   │   │       └── TaskReviewDialog.tsx    # Task editing modal + ConfidenceBadge
│   │   │
│   │   ├── analytics/
│   │   │   └── pages/
│   │   │       └── ProviderAnalytics.tsx   # Stats + CSV export + Talk-Time chart
│   │   │
│   │   ├── dashboard/
│   │   │   └── pages/
│   │   │       └── ProviderDashboard.tsx   # Session list + recording + ⌘K palette
│   │   │
│   │   └── agent-config/
│   │       └── pages/
│   │           └── AgentConfig.tsx         # AI prompt configuration UI
│   │
│   ├── shared/                    # Cross-feature shared code
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx              # Nav + sidebar + mobile bottom nav
│   │   │   │   ├── ClientLayout.tsx        # Client-facing layout shell
│   │   │   │   └── PageTransition.tsx      # Framer Motion page transitions
│   │   │   ├── widgets/
│   │   │   │   ├── AccessibilityWidget.tsx # FAB + Sheet — 9 a11y toggles, IS 5568
│   │   │   │   └── CookieConsentBanner.tsx # GDPR cookie consent banner
│   │   │   └── ui/                         # shadcn/ui primitives (19 used)
│   │   │       ├── alert-dialog.tsx   ├── badge.tsx      ├── button.tsx
│   │   │       ├── card.tsx           ├── checkbox.tsx   ├── command.tsx
│   │   │       ├── dialog.tsx         ├── dropdown-menu.tsx  ├── input.tsx
│   │   │       ├── scroll-area.tsx    ├── select.tsx     ├── sheet.tsx
│   │   │       ├── skeleton.tsx       ├── sonner.tsx     ├── table.tsx
│   │   │       ├── textarea.tsx       ├── toast.tsx      ├── toaster.tsx
│   │   │       └── tooltip.tsx
│   │   └── hooks/
│   │       ├── useRealtimeSessions.ts  # Supabase realtime for sessions
│   │       ├── useRealtimeTasks.ts     # Supabase realtime for tasks
│   │       ├── useLoadingDelay.ts      # Deferred spinner — shows after 200ms
│   │       ├── use-mobile.tsx          # Responsive breakpoint hook
│   │       └── use-toast.ts            # Toast imperative API
│   │
│   ├── core/                      # Infrastructure & global state
│   │   ├── api/
│   │   │   ├── supabaseClient.ts       # Supabase JS client init
│   │   │   └── apiClient.ts            # HTTP fetch wrapper + JWT refresh
│   │   ├── config/
│   │   │   └── sentry.ts               # Sentry error reporting init
│   │   ├── state/
│   │   │   └── AuthContext.tsx         # Supabase auth + role context
│   │   └── utils/
│   │       ├── utils.ts                # cn() + general helpers
│   │       └── storage.ts              # API type definitions + data endpoints
│   │
│   ├── pages/                     # Standalone top-level pages
│   │   ├── AccessibilityStatement.tsx  # IS 5568 accessibility statement
│   │   ├── FeaturesPage.tsx            # Feature Discovery Hub
│   │   └── NotFound.tsx                # 404 page
│   │
│   ├── i18n/                      # i18next localization config
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── en.json            # English translations
│   │       ├── he.json            # Hebrew translations
│   │       └── ru.json            # Russian translations
│   │
│   ├── config/
│   │   └── features_registry.ts   # User-facing feature inventory (source of truth)
│   │
│   ├── test/
│   │   └── setup.ts               # Vitest global setup (mocks, matchers)
│   │
│   ├── App.tsx                    # Route config + AppBootstrap (dark/RTL init)
│   ├── main.tsx                   # React app entry point
│   ├── index.css                  # Tailwind + OKLCH vars + .glass + .a11y-*
│   └── vite-env.d.ts
│
├── server/                        # Express.js backend (Node.js 20)
│   ├── index.js                   # Server init, middleware, startup jobs
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT validation via Supabase
│   │   ├── rateLimitMiddleware.js # API + audio rate limiters
│   │   ├── uploadMiddleware.js    # Multer (memory storage — no disk)
│   │   ├── errorHandler.js        # Global error handler
│   │   └── validateBody.js        # Zod request validation
│   ├── routes/
│   │   ├── process.js             # POST /api/process-audio
│   │   ├── sessions.js            # Session CRUD
│   │   ├── tasks.js               # Task CRUD + bulk ops
│   │   ├── config.js              # System prompt + history
│   │   ├── analytics.js           # Overview stats + CSV export
│   │   ├── auth.js                # Token refresh
│   │   ├── profiles.js            # User profile ops
│   │   ├── chat-history.js        # Chat history
│   │   └── transcripts.js         # Transcript retrieval
│   ├── services/
│   │   ├── GeminiService.js       # Google Gemini AI integration
│   │   ├── DatabaseService.js     # Supabase CRUD abstraction
│   │   └── EmailService.js        # Resend transactional email
│   ├── utils/
│   │   ├── logger.js              # Pino logger instance
│   │   ├── parseGeminiResponse.js # JSON extraction from AI output
│   │   ├── validateAudio.js       # Audio duration/format checks
│   │   └── deduplicateTasks.js    # Task deduplication logic
│   └── openapi.js                 # OpenAPI/RapiDoc spec definition
│
├── scripts/
│   └── migrate-imports.js         # One-time import migration script (2026-04-06)
│
├── e2e/                           # Playwright E2E tests
│   ├── agent-config.spec.ts
│   ├── client-task-board.spec.ts
│   ├── provider-dashboard.spec.ts
│   ├── session-isolation.spec.ts
│   ├── helpers.ts
│   └── load/
│       └── process-audio.k6.js
│
├── APP_MAP.md                     # This file — application map
├── CLAUDE.md                      # AI assistant configuration + coding rules
├── vite.config.ts                 # Vite config (proxy /api → :3001)
├── vitest.config.ts               # Test config (co-located tests, jsdom)
├── tailwind.config.ts             # Tailwind theme customization
├── tsconfig.json                  # TypeScript config
├── playwright.config.ts           # E2E test configuration
└── package.json                   # Dependencies + npm scripts
```

---

> **Maintenance Note:** This file is automatically updated by the AI assistant whenever new features, endpoints, or architectural changes are implemented. See the directive in `CLAUDE.md` for the update rule.
