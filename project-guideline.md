Project Overview: AI Task Orchestrator
A privacy-first, multi-tenant platform that leverages Gemini 2.5 Flash to transform
live audio into actionable tasks.
�� The 5 Legendary Features (Updated)
1. AI Audio → Structured Session: Auto-generates summaries, sentiment, and
tasks in-browser.
2. Privacy-First Ephemeral Audio: Audio processed in-memory; zero disk
footprint.
3. Editable AI Prompt &amp; History: Version-controlled system prompts for
Admins.
4. IS 5568 / WCAG 2.1 AA Widget: Persistent accessibility trigger tailored to
Israeli Standard 5568.
5. Real-Time Collaboration: Instant task sync via Supabase Realtime.

�� Architecture &amp; UI Strategy
1. Adaptive Design (Mobile &amp; Desktop)
● Unified Codebase: Responsive components that adapt layouts (e.g.,
Sidebars on Desktop become Bottom Sheets on Mobile).
● Mobile Context: Optimized &quot;Big Button&quot; recording interface for on-the-go
sessions.
2. Notification &amp; Approval System
● The Inbox: A dedicated notification center for Members/Admins to approve or
reject Participant task edits.
● Sync Guardrail: Once a task is synced to an external platform (Jira/Monday),
editing is locked on our platform to prevent data desync.
3. &quot;Low Balance&quot; Guardrail
● Warning Threshold: UI displays a &quot;Low Capacity&quot; alert at 70 minutes.
● Hard Block: The &quot;Start Recording&quot; button is disabled and greyed out at 55
minutes remaining.

�� User Roles &amp; Multi-Org Logic
● Multi-Role Account Support: A single Google account can hold different
roles (Admin, Member, Participant) across multiple Organizations.
● Dashboard Context: The user dashboard is Organization-specific. A
&quot;Switch Organization&quot; selector in the Global Navigation updates the context,
tasks, and RLS permissions.

�� Page Specifications
1. Platform Page (Shalev &amp; Omer)
● Global Org configuration and log monitoring.
2. Organization Admin Page (Metrics Focus)
● Core Metrics: Total Minutes, Member Count, and Total Capacity Allocation
across all members.
● Management: User provisioning and quota setting.
3. Organization Member Page
● Recording Hub: Active recording interface with session timers.
● Approval Inbox: Review and approve Participant task modifications.
● Analytics: Personal dashboard showing meetings and tasks assigned to
them.
4. Organization Participant Page
● Task List: View-only for approved tasks; &quot;Edit Request&quot; mode for changes.
● Multi-Org View: Ability to filter tasks by the specific Organization currently
selected.

⚙️ Organization Configuration &amp; Database
● Israeli Standard 5568 Accessibility: A persistent, high-visibility floating
trigger (bottom-right/left) providing grayscale, font scaling, and RTL support.
● Supabase RLS Strategy: Policies must check both user_id AND org_id for
every query to ensure data isolation during multi-org switching.

��️ Security &amp; Technical Mandate
● Stack: Vercel (Frontend), Render (Backend), Supabase (BaaS).
● Rule: Zero-Trust validation. Participant edits are stored in a pending_tasks
table and only move to tasks after Member signature.

Important notice -
System Directive: Prevent Audio Loss on Browser Refresh (IndexedDB)
Claude, we have a critical vulnerability in the frontend: If the user accidentally refreshes the
browser or the tab crashes during a long audio recording, the MediaRecorder chunks stored in
RAM are permanently lost.
I do not want to implement WebSockets for backend streaming yet. Instead, please implement a
local frontend safety net using IndexedDB (you can use a wrapper library like idb or localforage,
or write native IndexedDB logic).
Required Flow:
Chunking: Start the MediaRecorder with a timeslice (e.g., mediaRecorder.start(1000)).
Local Persistence: On every dataavailable event, append the new audio Blob chunk to an
IndexedDB store specific to the current session.
Crash Recovery: When the recording component mounts, it must first check IndexedDB. If an
unfinished recording exists from a previous crash/refresh, prompt the user (or automatically
recover it) to either:
Send the recovered audio to the backend (Render).
Discard it.
Cleanup: Once the audio is successfully uploaded to the backend (receive a 200 OK), clear the
chunks from IndexedDB.
Please update the recording component to include this local persistence logic.
