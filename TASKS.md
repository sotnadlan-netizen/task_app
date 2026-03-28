# TASKS.md — AI Service-Provider SaaS Roadmap

> **Project**: Listen Agent — AI-powered mortgage advisory platform (Hebrew-first, Israeli market)
> **Lead Architect**: Claude Code
> **Last Updated**: 2026-03-29
> **Stack**: React/TypeScript · Node.js/Express · Supabase · Google Gemini · Vercel/Render

---

## Legend

| Status        | Meaning                              |
|---------------|--------------------------------------|
| `Done`        | Implemented and verified in codebase |
| `In-Progress` | Partially implemented or underway    |
| `Todo`        | Planned, not yet started             |

---

## [Backend]

### Authentication & Authorization

| ID     | Description                                                               | Status |
|--------|---------------------------------------------------------------------------|--------|
| BE-001 | Set up Express server with Helmet security headers and CORS configuration | `Done` |
| BE-002 | Implement JWT validation middleware using Supabase service role key       | `Done` |
| BE-003 | Implement role-based access control (provider vs client) in middleware    | `Done` |
| BE-004 | Create `POST /api/profiles` endpoint to persist user profile on signup    | `Done` |
| BE-005 | Add rate limiting middleware to all authenticated endpoints               | `Done` |
| BE-006 | Add refresh-token rotation support for long-lived sessions                | `Done` |

### Session Management

| ID     | Description                                                                                    | Status |
|--------|------------------------------------------------------------------------------------------------|--------|
| BE-007 | Create `GET /api/sessions` endpoint with provider/client role filtering                        | `Done` |
| BE-008 | Create `POST /api/process-audio` endpoint: receive audio, trigger AI pipeline, persist session | `Done` |
| BE-009 | Implement audio file cleanup after successful AI processing                                    | `Done` |
| BE-010 | Add `DELETE /api/sessions/:id` endpoint (provider-only, cascade deletes tasks)                 | `Done` |
| BE-011 | Add `GET /api/sessions/:id` endpoint for single session detail                                 | `Done` |
| BE-012 | Implement pagination for `GET /api/sessions` (cursor-based)                                    | `Done` |
| BE-013 | Add full-text search filter to `GET /api/sessions` (by client email, date range)               | `Done` |

### Task Management

| ID     | Description                                                                              | Status                                       |
|--------|------------------------------------------------------------------------------------------|----------------------------------------------|
| BE-014 | Create `GET /api/tasks?sessionId=X` endpoint with session ownership check                | `Done`                                       |
| BE-015 | Create `PATCH /api/tasks/:id` endpoint to toggle task completion (assignee-scoped)       | `Done`                                       |
| BE-016 | Create `DELETE /api/tasks/:id` endpoint (provider-only)                                  | `Done`                                       |
| BE-017 | Create `POST /api/tasks` endpoint for manually adding tasks to a session                 | `Done`                                       |
| BE-018 | Create `PATCH /api/tasks/:id/details` endpoint to edit task title, description, priority | `Done` <!-- [QA-Approved] 7/7 tests pass --> |
| BE-019 | Add bulk `PATCH /api/tasks/bulk-complete` endpoint for batch completion                  | `Done`                                       |

### File & Audio Storage

| ID     | Description                                                                           | Status                                       |
|--------|---------------------------------------------------------------------------------------|----------------------------------------------|
| BE-020 | Implement Multer middleware for audio upload (100 MB limit, MIME validation)          | `Done`                                       |
| BE-021 | Integrate Supabase Storage to persist uploaded audio files and save `audio_url` in DB | `Done`                                       |
| BE-022 | Create `GET /api/sessions/:id/audio` signed-URL endpoint for secure playback          | `Done` <!-- [QA-Approved] 8/8 tests pass --> |
| BE-023 | Add audio file expiry policy (auto-delete from storage after N days)                  | `Done`                                       |

### Configuration & Prompt Management

| ID     | Description                                                               | Status                                                                 |
|--------|---------------------------------------------------------------------------|------------------------------------------------------------------------|
| BE-024 | Create `GET /api/config` endpoint to fetch active system prompt           | `Done` <!-- [QA-Approved] 3/3 tests pass -->                           |
| BE-025 | Create `PUT /api/config` endpoint to update system prompt (provider-only) | `Done` <!-- [QA-Approved] 4/4 tests pass -->                           |
| BE-026 | Seed default Hebrew system prompt in `prompt_config` table on first run   | `Done`                                                                 |
| BE-027 | Add prompt versioning: store history of prompt changes with timestamps    | `Done` <!-- [QA-Approved] 4/4 tests pass (config/history endpoint) --> |

### Notifications

| ID     | Description                                                                 | Status |
|--------|-----------------------------------------------------------------------------|--------|
| BE-028 | Integrate email service (e.g., Resend or SendGrid) for transactional emails | `Done` <!-- Resend SDK integrated in server/services/EmailService.js --> |
| BE-029 | Send email to client when new session with assigned tasks is created        | `Done` <!-- sendNewSessionEmail called in routes/process.js after saveSession --> |
| BE-030 | Send reminder email to client for incomplete tasks (scheduled job)          | `Done` <!-- setInterval job in server/index.js using db.getPendingClientTaskSessions() --> |
| BE-031 | Send confirmation email to provider when client completes all tasks         | `Done` <!-- sendAllTasksCompleteEmail called in routes/tasks.js PATCH /:id --> |

### Analytics & Reporting

| ID     | Description                                                                          | Status                                       |
|--------|--------------------------------------------------------------------------------------|----------------------------------------------|
| BE-032 | Create `GET /api/analytics/overview` endpoint: task completion rates, session counts | `Done` <!-- [QA-Approved] 3/3 tests pass --> |
| BE-033 | Create `GET /api/analytics/sessions/export` endpoint: CSV/PDF export of session data | `Done` <!-- [QA-Approved] 5/5 tests pass --> |

### Developer & Ops

| ID     | Description                                                                  | Status |
|--------|------------------------------------------------------------------------------|--------|
| BE-034 | Create `GET /health` health check endpoint                                   | `Done` |
| BE-035 | Create `POST /api/mock-data` endpoint to seed realistic Hebrew mock sessions | `Done` |
| BE-036 | Add structured request logging (request ID, duration, status code)           | `Done` |
| BE-037 | Add global error handler middleware with sanitized error responses           | `Done` |
| BE-038 | Write OpenAPI/Swagger spec for all API endpoints                             | `Done` |

---

## [Frontend]

### Authentication

| ID     | Description                                                                    | Status |
|--------|--------------------------------------------------------------------------------|--------|
| FE-001 | Build Login page (email/password) with role-based redirect post-auth           | `Done` |
| FE-002 | Build Signup page with role selection (Provider / Client) and profile creation | `Done` |
| FE-003 | Implement `AuthContext` for global auth state (session, user, role)            | `Done` |
| FE-004 | Implement `ProtectedRoute` component for role-gated navigation                 | `Done` |
| FE-005 | Add "Forgot Password" flow using Supabase password reset email                 | `Done` |
| FE-006 | Add logout confirmation dialog with session cleanup                            | `Done` |

### Provider Dashboard

| ID     | Description                                                                                                                                  | Status |
|--------|----------------------------------------------------------------------------------------------------------------------------------------------|--------|
| FE-007 | Build Provider Dashboard with session list, task stats, and empty state                                                                      | `Done` |
| FE-008 | Build `RecordDialog` with in-browser mic recording and real-time waveform                                                                    | `Done` |
| FE-009 | Add client email input field inside `RecordDialog` before recording starts                                                                   | `Done` |
| FE-010 | Show upload progress indicator and AI processing state after recording stops                                                                 | `Done` |
| FE-011 | Add session search bar (filter by client email or date)                                                                                      | `Done` |
| FE-012 | Add session delete action with confirmation dialog                                                                                           | `Done` |
| FE-013 | Add date range picker filter to session list                                                                                                 | `Done` |
| FE-043 | Build `TaskReviewDialog` — review, edit, and approve AI tasks before client sees them                                                        | `Done` |
| FE-045 | Add "Client Pulse" traffic-light card grid on Provider Dashboard (green/yellow/red by task completion rate, Send Reminder stub on red cards) | `Done` |

### Task Board (Kanban)

| ID     | Description                                                                   | Status |
|--------|-------------------------------------------------------------------------------|--------|
| FE-014 | Build Kanban board with "Advisor Tasks" and "Client Tasks" columns            | `Done` |
| FE-015 | Implement task completion toggle (checkbox) scoped by assignee role           | `Done` |
| FE-016 | Render priority badges (High/Medium/Low) with Hebrew labels and color coding  | `Done` |
| FE-017 | Add manual task creation form on the board (provider-only)                    | `Done` |
| FE-018 | Add inline task editing (title, description, priority) on task cards          | `Done` |
| FE-019 | Add task delete button on card (provider-only)                                | `Done` |
| FE-020 | Add drag-and-drop reordering within a column                                  | `Done` <!-- @dnd-kit/sortable DndContext + SortableContext + handleDragEnd in ProviderBoard.tsx --> |
| FE-021 | Add "All Done" celebration animation when all tasks in a column are completed | `Done` |

### Client Dashboard

| ID     | Description                                                                             | Status                                                                             |
|--------|-----------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| FE-022 | Build Client Dashboard showing sessions assigned to the logged-in client                | `Done` <!-- [QA-Approved] 13/13 tests pass -->                                     |
| FE-023 | Show per-session task completion progress (e.g., 3/5 tasks done)                        | `Done` <!-- [QA-Approved] covered in ClientDashboard tests -->                     |
| FE-024 | Make client task board read-only for advisor tasks, interactive for client tasks        | `Done`                                                                             |
| FE-025 | Add client notification banner when new tasks are assigned                              | `Done` <!-- [QA-Approved] banner show/dismiss covered in ClientDashboard tests --> |
| FE-043 | Add `ProgressGraph` radial SVG ring showing monthly goal completion on Client Dashboard | `Done`                                                                             |
| FE-044 | Add `TimeCapsule` component showing most recent session summary as bullet points        | `Done`                                                                             |

### Audio Playback

| ID     | Description                                                                 | Status |
|--------|-----------------------------------------------------------------------------|--------|
| FE-026 | Add audio player component on session detail / board page (requires BE-022) | `Done` |
| FE-027 | Show audio duration and waveform preview on session card                    | `Done` |

### Agent Configuration

| ID     | Description                                                     | Status                                                     |
|--------|-----------------------------------------------------------------|------------------------------------------------------------|
| FE-028 | Build Agent Config page with textarea for system prompt editing | `Done` <!-- [QA-Approved] 9/9 tests pass -->               |
| FE-029 | Display unsaved changes indicator and save/reset controls       | `Done` <!-- [QA-Approved] covered in AgentConfig tests --> |
| FE-030 | Show JSON schema hint to guide prompt authors                   | `Done` <!-- [QA-Approved] covered in AgentConfig tests --> |
| FE-031 | Add prompt version history view (requires BE-027)               | `Done`                                                     |

### Analytics & Reports

| ID     | Description                                                                 | Status |
|--------|-----------------------------------------------------------------------------|--------|
| FE-032 | Build Analytics page: charts for session frequency and task completion rate | `Done` |
| FE-033 | Add CSV export button for session/task data (requires BE-033)               | `Done` |

### UI / UX & Infrastructure

| ID     | Description                                                             | Status |
|--------|-------------------------------------------------------------------------|--------|
| FE-034 | Set up Radix UI component library with Tailwind CSS design tokens       | `Done` |
| FE-035 | Set up TanStack React Query for server state caching and invalidation   | `Done` |
| FE-036 | Add global toast notifications using `sonner`                           | `Done` |
| FE-037 | Add skeleton loading states to session list and task board              | `Done` |
| FE-038 | Implement full RTL layout support for Hebrew text across all pages      | `Done` |
| FE-039 | Add i18n framework (`i18next`) and extract all hardcoded Hebrew strings | `Done` <!-- react-i18next + src/i18n/index.ts + he.json translations; components use useTranslation --> |
| FE-040 | Build responsive mobile layout for Provider and Client dashboards       | `Done` |
| FE-041 | Add empty state illustrations for sessions list and task board          | `Done` |
| FE-042 | Set up Vercel deployment with SPA rewrite rules                         | `Done` |

---

## [AI-Integration]

### Core Pipeline

| ID     | Description                                                                | Status |
|--------|----------------------------------------------------------------------------|--------|
| AI-001 | Integrate Google Generative AI SDK (`@google/generative-ai`)               | `Done` |
| AI-002 | Implement `GeminiService`: encode audio to base64 and send to Gemini model | `Done` |
| AI-003 | Design structured JSON output schema: `{ summary, tasks[] }`               | `Done` |
| AI-004 | Implement JSON response parser with markdown code-fence stripping fallback | `Done` |
| AI-005 | Add `DEBUG_GEMINI` env flag to log raw Gemini responses during development | `Done` |
| AI-006 | Store model name in env var (`GEMINI_MODEL`) for easy version upgrades     | `Done` |

### Prompt Engineering

| ID     | Description                                                                     | Status |
|--------|---------------------------------------------------------------------------------|--------|
| AI-007 | Write default Hebrew system prompt optimized for mortgage advisory context      | `Done` |
| AI-008 | Enforce strict JSON schema in prompt to minimize parsing failures               | `Done` |
| AI-009 | Add few-shot examples to default prompt for priority classification accuracy    | `Done` |
| AI-010 | Experiment with Gemini function-calling / tool-use for guaranteed schema output | `Done` <!-- generationConfig.responseMimeType + responseSchema added to GeminiService.js --> |
| AI-011 | Evaluate Gemini 2.5 Pro vs Flash on transcription accuracy for Hebrew audio     | `Todo` |

### Reliability & Quality

| ID     | Description                                                              | Status |
|--------|--------------------------------------------------------------------------|--------|
| AI-012 | Add retry logic with exponential backoff for transient Gemini API errors | `Done` |
| AI-013 | Implement request timeout and graceful degradation if AI pipeline fails  | `Done` |
| AI-014 | Add input validation: reject audio files shorter than 3 seconds          | `Done` |
| AI-015 | Log AI token usage and cost per request to a `usage_logs` table          | `Done` |
| AI-016 | Add post-processing step to deduplicate extracted tasks with same title  | `Done` |

### Future AI Capabilities

| ID     | Description                                                                  | Status        |
|--------|------------------------------------------------------------------------------|---------------|
| AI-017 | Add speaker diarization: distinguish advisor vs client voice in transcript   | `Todo`        |
| AI-018 | Auto-generate session title from summary (short 5-word headline)             | `Done`        |
| AI-019 | Implement sentiment analysis on session to flag at-risk client relationships | `Done` <!-- sentiment field in Gemini schema, DB, and ProviderBoard badge --> |
| AI-020 | Add follow-up question suggestions for advisor based on session gaps         | `Done` <!-- followUpQuestions field in Gemini schema, DB, and ProviderBoard panel --> |

---

## [QA]

### Unit Tests

| ID     | Description                                                                   | Status                                         |
|--------|-------------------------------------------------------------------------------|------------------------------------------------|
| QA-001 | Set up Vitest and `@testing-library/react` in the project                     | `Done`                                         |
| QA-002 | Write unit tests for `GeminiService`: JSON parsing, error handling            | `Done` <!-- [QA-Approved] 7/7 tests pass -->   |
| QA-003 | Write unit tests for `DatabaseService`: query logic and RLS bypass            | `Done` <!-- [QA-Approved] 20/20 tests pass --> |
| QA-004 | Write unit tests for `authMiddleware`: valid token, missing token, wrong role | `Done` <!-- [QA-Approved] 6/6 tests pass -->   |
| QA-005 | Write unit tests for `RecordDialog` component: recording state transitions    | `Done` <!-- [QA-Approved] 8/8 tests pass -->   |
| QA-006 | Write unit tests for `ProtectedRoute`: redirects for unauthorized roles       | `Done` <!-- [QA-Approved] 6/6 tests pass -->   |

### Integration Tests

| ID     | Description                                                                      | Status                                         |
|--------|----------------------------------------------------------------------------------|------------------------------------------------|
| QA-007 | Write integration tests for `POST /api/process-audio` with a fixture audio file  | `Done` <!-- [QA-Approved] 11/11 tests pass --> |
| QA-008 | Write integration tests for `GET /api/sessions` with provider vs client token    | `Done` <!-- [QA-Approved] 12/12 tests pass --> |
| QA-009 | Write integration tests for `PATCH /api/tasks/:id` completion toggle permissions | `Done` <!-- [QA-Approved] 19/19 tests pass --> |
| QA-010 | Write integration tests for `POST /api/profiles` signup → profile creation flow  | `Done` <!-- [QA-Approved] 4/4 tests pass -->   |

### End-to-End Tests

| ID     | Description                                                                       | Status                                                                           |
|--------|-----------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| QA-011 | Set up Playwright for E2E tests against the Vercel preview environment            | `Done` <!-- [QA-Approved] playwright.config.ts, chromium, webServer fallback --> |
| QA-012 | E2E test: Provider signs up, records audio, views session, sees tasks on board    | `Done` <!-- [QA-Approved] e2e/provider-dashboard.spec.ts, 6 tests -->            |
| QA-013 | E2E test: Client logs in, views assigned session, checks off assigned task        | `Done` <!-- [QA-Approved] e2e/client-task-board.spec.ts, 4 tests -->             |
| QA-014 | E2E test: Provider edits system prompt, re-processes session, verifies new output | `Done` <!-- [QA-Approved] e2e/agent-config.spec.ts, 4 tests -->                  |
| QA-015 | E2E test: Unauthorized client cannot access another client's session              | `Done` <!-- [QA-Approved] e2e/session-isolation.spec.ts, 4 tests -->             |

### Performance & Security

| ID     | Description                                                                   | Status                                         |
|--------|-------------------------------------------------------------------------------|------------------------------------------------|
| QA-016 | Load test `POST /api/process-audio` with concurrent uploads (k6 or Artillery) | `Done` <!-- e2e/load/process-audio.k6.js with ramp-up/sustained scenarios and thresholds --> |
| QA-017 | Run OWASP ZAP scan against staging API for common vulnerabilities             | `Todo`                                         |
| QA-018 | Audit Supabase RLS policies for row-level data isolation                      | `Done` <!-- RLS intentionally disabled; service_role key + WHERE-clause enforcement documented in supabase_schema.sql --> |
| QA-019 | Validate audio MIME type bypass attempt is rejected at server boundary        | `Done` <!-- [QA-Approved] 10/10 tests pass --> |

### CI/CD

| ID     | Description                                                            | Status                                                                                    |
|--------|------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| QA-020 | Set up GitHub Actions pipeline: lint → unit test → build on every PR   | `Done` <!-- [QA-Approved] .github/workflows/ci.yml created -->                            |
| QA-021 | Add E2E test stage to GitHub Actions (runs against Vercel preview URL) | `Done` <!-- [QA-Approved] ci.yml e2e job, gated on E2E_BASE_URL secret -->                |
| QA-022 | Add code coverage reporting (threshold ≥ 70%) in CI pipeline           | `Done` <!-- [QA-Approved] vitest coverage-v8, thresholds 70%, artifact upload in CI -->   |
| QA-023 | Set up Dependabot for automated dependency security updates            | `Done` <!-- [QA-Approved] .github/dependabot.yml with npm + github-actions ecosystems --> |

---

## Summary

| Role           | Done    | In-Progress | Todo   | Total   |
|----------------|---------|-------------|--------|---------|
| Backend        | 38      | 0           | 0      | 38      |
| Frontend       | 45      | 0           | 1      | 46      |
| AI-Integration | 18      | 0           | 2      | 20      |
| QA             | 22      | 0           | 1      | 23      |
| **Total**      | **123** | **0**       | **4**  | **127** |
