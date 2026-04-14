"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { RecordingHub } from "@/components/recording/recording-hub";
import { TaskList } from "@/components/tasks/task-list";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import type { Session } from "@/types";
import { BarChart3, Clock, ListChecks, UserPlus } from "lucide-react";

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

    // Check if already a member
    const { data: existing } = await supabase
      .from("org_memberships")
      .select("id")
      .eq("org_id", currentOrg.id)
      .or(
        `invited_email.eq.${trimmedEmail}`
      );

    // Also check by profile email
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
      // Check membership by user_id
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

  // ── Role guard: admins and members only ────────────────────────────────────
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
              <div
                key={s.id}
                className="p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {s.title || "Untitled Session"}
                  </h4>
                  <span className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {s.summary}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tasks */}
      <TaskList />

      {/* Add Participant Modal */}
      <AddParticipantModal
        open={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
      />
    </div>
  );
}
