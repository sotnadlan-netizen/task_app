"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { RecordingHub } from "@/components/recording/recording-hub";
import { TaskList } from "@/components/tasks/task-list";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import type { Session, Task, OrgMembership, Profile } from "@/types";
import { BarChart3, Clock, ListChecks, UserPlus, Users } from "lucide-react";

interface MemberWithProfile extends OrgMembership {
  profile: Profile | null;
}

const priorityColors = {
  low: "default" as const,
  medium: "info" as const,
  high: "warning" as const,
  critical: "danger" as const,
};

// ─── Session Detail Modal ─────────────────────────────────────────────────────
function SessionDetailModal({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const { supabase } = useSupabase();
  const { currentOrg } = useOrganization();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    async function load() {
      setLoading(true);
      const [taskRes, memberRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("org_memberships")
          .select("*, profile:profiles(*)")
          .eq("org_id", session.org_id),
      ]);
      if (taskRes.data) setTasks(taskRes.data as Task[]);
      if (memberRes.data) setMembers(memberRes.data as MemberWithProfile[]);
      setLoading(false);
    }
    load();
  }, [supabase, currentOrg, session]);

  const durationMin = Math.round(session.duration_seconds / 60);

  return (
    <Modal open onClose={onClose} title={session.title || "Session Details"}>
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{new Date(session.created_at).toLocaleString()}</span>
          {durationMin > 0 && <span>· {durationMin} min</span>}
          {session.sentiment && (
            <span className="capitalize">· {session.sentiment}</span>
          )}
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Summary</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {session.summary || "No summary available."}
          </p>
        </div>

        {/* Participants (org members) */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              People in this session
            </span>
          </h3>
          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse">Loading...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
                >
                  <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-[10px]">
                    {(m.profile?.full_name || m.profile?.email || m.invited_email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <span>
                    {m.profile?.full_name || m.profile?.email || m.invited_email || "Unknown"}
                  </span>
                  <span className="text-gray-400 capitalize">({m.role})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Tasks ({tasks.length})
          </h3>
          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse">Loading...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-400">No tasks generated from this session.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-3 rounded-lg border text-sm ${
                    t.status === "done"
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium ${t.status === "done" ? "text-green-700 line-through" : "text-gray-900"}`}
                      >
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={priorityColors[t.priority]}>{t.priority}</Badge>
                      <Badge
                        variant={
                          t.status === "done"
                            ? "success"
                            : t.status === "in_progress"
                              ? "info"
                              : "default"
                        }
                      >
                        {t.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Participant Modal ────────────────────────────────────────────────────
function AddParticipantModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { supabase } = useSupabase();
  const { currentOrg } = useOrganization();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!currentOrg) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const trimmedEmail = email.trim();

    const { data: existing } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("org_id", currentOrg.id)
      .or(`invited_email.eq.${trimmedEmail}`);

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", trimmedEmail)
      .maybeSingle();

    if (existing && existing.length > 0) {
      setError(`${trimmedEmail} is already in this organization.`);
      setLoading(false);
      return;
    }

    if (existingProfile) {
      const { data: existingById } = await supabase
        .from("org_memberships")
        .select("id")
        .eq("org_id", currentOrg.id)
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      if (existingById) {
        setError(`${trimmedEmail} is already in this organization.`);
        setLoading(false);
        return;
      }
    }

    const insertPayload = existingProfile
      ? { user_id: existingProfile.id, org_id: currentOrg.id, role: "participant", capacity_minutes: 0 }
      : { invited_email: trimmedEmail, org_id: currentOrg.id, role: "participant", capacity_minutes: 0 };

    const { error: insertErr } = await supabase.from("org_memberships").insert(insertPayload);

    if (insertErr) {
      setError(insertErr.message);
    } else {
      setSuccess(`${trimmedEmail} added as participant.`);
      setEmail("");
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Participant">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Alert variant="warning">
          Participants have read-only task access and do not consume recording capacity.
        </Alert>

        {error && <Alert variant="error">{error}</Alert>}
        {success && (
          <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            If the user hasn&apos;t signed in yet, they&apos;ll be linked automatically on first login.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" loading={loading}>
            <UserPlus className="w-4 h-4 mr-1" />
            Add Participant
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Member Page ──────────────────────────────────────────────────────────────
export default function MemberPage() {
  const { supabase } = useSupabase();
  const { currentOrg, capacity, currentRole, loading: orgLoading } = useOrganization();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    if (orgLoading) return;
    if (currentRole === "participant") {
      router.replace("/dashboard/participant");
    }
  }, [orgLoading, currentRole, router]);

  const loadStats = useCallback(async () => {
    if (!currentOrg) return;

    const [sessionRes, taskRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("tasks")
        .select("id", { count: "exact" })
        .eq("org_id", currentOrg.id),
    ]);

    if (sessionRes.data) setSessions(sessionRes.data as Session[]);
    if (taskRes.count !== null) setTaskCount(taskRes.count);
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (orgLoading || currentRole === "participant") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Member Dashboard</h1>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowAddParticipant(true)}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          Add Participant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sessions</p>
              <p className="text-xl font-bold">{sessions.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-xl font-bold">{taskCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="text-xl font-bold">
                {capacity?.remaining_minutes ?? "—"} min
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recording Hub */}
      <RecordingHub />

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className="w-full text-left p-3 rounded-lg bg-gray-50 border border-gray-100
                  hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                    {s.title || "Untitled Session"}
                  </h4>
                  <span className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{s.summary}</p>
                <p className="text-xs text-indigo-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to view details →
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Tasks */}
      <TaskList />

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {/* Add Participant Modal */}
      <AddParticipantModal
        open={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
      />
    </div>
  );
}
