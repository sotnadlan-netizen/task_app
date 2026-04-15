# AI Task Orchestrator — Claude Instructions

## Primary Reference

**Always read `APP-MAP.md` before making any changes.**
It is the single source of truth for architecture, data schema, page structure, component hierarchy, and security rules. Every decision must align with it.

---

## Architecture Rules

- **Frontend**: Next.js on Vercel. App Router only. No Pages Router.
- **Backend**: Python FastAPI on Render. All AI processing goes here.
- **Database**: Supabase (PostgreSQL + RLS + Realtime + Google OAuth).
- **Audio**: Never persisted to disk. Processed in-memory on the backend, then discarded.

---

## Database Rules

- **Never remove RLS** from any table. Every table must have Row Level Security enabled.
- **Every RLS policy** must scope by both `user_id = auth.uid()` AND `org_id`.
- **Platform admins** (`platform_admins` table) use `is_platform_admin()` security definer function in policies — never a recursive subquery on `org_memberships`.
- **Schema changes** must be done as SQL migrations in `supabase/migrations/`. Never alter the schema directly without a migration file.
- **The `service_role` key** is backend-only. Never expose it to the frontend.
- **The anon key** is frontend-safe because RLS enforces all access control.

---

## User Roles & Routing

| Role | Dashboard Route | Access |
|---|---|---|
| Platform Admin | `/dashboard/platform` | All orgs, global config |
| Org Admin | `/dashboard/admin` | Own org: members, quotas, prompts |
| Member | `/dashboard/member` | Recording hub, approval inbox, analytics |
| Participant | `/dashboard/participant` | Task list (read-only), edit requests |

- Role is resolved from `org_memberships.role` for the current org.
- Platform admin is resolved from the `platform_admins` table (only `shalevpenker97@gmail.com` and `omervigder1@gmail.com`).
- On login, check `platform_admins` first. If matched, route to `/dashboard/platform`. Otherwise route by org role.
- Users with no org membership are routed to `/no-org`.

---

## Audio Pipeline (Critical)

Follow this exact flow — do not deviate:

1. `MediaRecorder.start(1000)` — 1-second timeslices
2. `ondataavailable` → append chunk to **IndexedDB** (crash safety)
3. User stops → merge all chunks → `POST /api/audio/process`
4. Backend pipes audio to **Gemini 2.5 Flash** in memory
5. AI returns `{ summary, sentiment, tasks[] }`
6. Backend inserts into `sessions` + `tasks`, deducts capacity
7. Frontend receives 200 OK → **clears IndexedDB chunks**
8. On component mount → check IndexedDB for unfinished recordings → show crash recovery modal

---

## Security Mandates

- **Zero-Trust**: Every API call from the frontend must include `Authorization: Bearer <jwt>`.
- **Backend** verifies the JWT with Supabase on every request via `AuthService`.
- **Participant edits** go to `pending_tasks` (status=`pending`) — never directly to `tasks`.
- **Members/Admins** approve or reject pending tasks. Only approved edits reach `tasks`.
- **Sync lock**: When `task.external_sync_id IS NOT NULL`, set `task.is_locked = true`. UI must disable editing for locked tasks.
- **Capacity enforcement**: Hard block recording at ≤55 min remaining. Show warning at ≤70 min.

---

## Frontend Component Rules

- Use existing UI primitives in `frontend/src/components/ui/` — do not create new ones unless necessary.
- All data mutations go through the **FastAPI backend**, not directly to Supabase (except auth and realtime subscriptions).
- Realtime updates (tasks, notifications, sessions) use `RealtimeProvider` — subscribe via `useRealtime()`.
- Org context comes from `useOrganization()`. Never access org state directly.
- Auth state comes from `useSupabase()`. Never create a new Supabase client outside of `lib/supabase-browser.ts`.

---

## Accessibility

- The **IS 5568 / WCAG 2.1 AA** accessibility widget must remain on every dashboard page.
- It provides: grayscale mode, font scaling, RTL support.
- It is a persistent floating trigger — do not remove or hide it.

---

## What NOT to Do

- Do not add features not in `APP-MAP.md` or `project-guideline.md` without explicit instruction.
- Do not write audio chunks to disk or a server database — memory only.
- Do not bypass RLS using `service_role` from the frontend.
- Do not create new Supabase clients — use the existing ones in `lib/`.
- Do not commit `.env`, `.env.local`,`.env.example` or any file containing secrets.
- Do not add speculative abstractions or unused utilities.
