"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { PromptEditor } from "@/components/inbox/prompt-editor";
import { PromptSelector } from "@/components/inbox/prompt-selector";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import type { OrgMembership, Profile, UserRole } from "@/types";
import { api } from "@/lib/api";
import { Users, Clock, Building2, Save, UserPlus, Trash2 } from "lucide-react";

type MemberWithProfile = Omit<OrgMembership, "profile"> & {
  profile?: Profile | null;
};

// ─── Add Member Modal ─────────────────────────────────────────────────────────
function AddMemberModal({
  open,
  onClose,
  onAdded,
  members,
  defaultRole = "member",
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  members: MemberWithProfile[];
  /** Pre-select a role (e.g. "participant" from member page shortcut) */
  defaultRole?: UserRole;
}) {
  const { supabase, session } = useSupabase();
  const { currentOrg } = useOrganization();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [capacity, setCapacity] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset role when defaultRole prop changes (e.g. modal re-opened)
  useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole, open]);

  if (!currentOrg) return null;

  const isParticipant = role === "participant";

  // Capacity numbers (only relevant for non-participants)
  const nonParticipantMembers = members.filter((m) => m.role !== "participant");
  const allocatedCapacity = nonParticipantMembers.reduce((s, m) => s + m.capacity_minutes, 0);
  const remainingCapacity = Math.max(0, currentOrg.total_capacity_min - allocatedCapacity);
  const isOverAllocated = allocatedCapacity > currentOrg.total_capacity_min;
  const currentMemberCount = members.filter((m) => m.role !== "participant").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isParticipant) {
      if (currentMemberCount >= currentOrg.max_members) {
        setError(
          `This organization has reached its member limit of ${currentOrg.max_members}. Contact your platform admin to increase it.`
        );
        return;
      }
      if (capacity > remainingCapacity) {
        setError(
          `Not enough capacity. Trying to allocate ${capacity} min, but only ${remainingCapacity} min remain ` +
            `(${allocatedCapacity} / ${currentOrg.total_capacity_min} min allocated).`
        );
        return;
      }
    }

    setLoading(true);
    const trimmedEmail = email.trim();

    const existingByEmail = members.find(
      (m) => m.profile?.email === trimmedEmail || m.invited_email === trimmedEmail
    );
    if (existingByEmail) {
      setError(`${trimmedEmail} is already a member of this organization.`);
      setLoading(false);
      return;
    }

    const token = session?.access_token || "";
    try {
      await api.addOrgMember(currentOrg.id, { email: trimmedEmail, role }, token);
      setEmail("");
      setCapacity(120);
      setRole(defaultRole);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={isParticipant ? "Add Participant" : "Add Member"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Capacity & member summary — only for non-participants */}
        {!isParticipant && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-violet-50/60 rounded-2xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Capacity Available</p>
              <p
                className={`text-lg font-bold ${remainingCapacity === 0 ? "text-red-600" : "text-green-600"}`}
              >
                {remainingCapacity} min
              </p>
              <p className="text-xs text-gray-400">
                {allocatedCapacity} / {currentOrg.total_capacity_min} min allocated
              </p>
            </div>
            <div className="bg-violet-50/60 rounded-2xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Members</p>
              <p
                className={`text-lg font-bold ${currentMemberCount >= currentOrg.max_members ? "text-red-600" : "text-gray-800"}`}
              >
                {currentMemberCount} / {currentOrg.max_members}
              </p>
              <p className="text-xs text-gray-400">max members</p>
            </div>
          </div>
        )}

        {!isParticipant && isOverAllocated && (
          <Alert variant="warning">
            Existing members are allocated {allocatedCapacity} min, which exceeds the org total of{" "}
            {currentOrg.total_capacity_min} min. Contact your platform admin to increase capacity.
          </Alert>
        )}

        {isParticipant && (
          <Alert variant="warning">
            Participants have read-only task access and do not consume recording capacity.
          </Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full px-3 py-2 border border-violet-100 rounded-2xl text-sm focus:ring-2 focus:ring-violet-200 focus:border-transparent bg-white/80"
          />
          <p className="text-xs text-gray-400 mt-1">
            If the user hasn&apos;t signed in yet, they&apos;ll be linked automatically on first login.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-violet-100 rounded-2xl text-sm focus:ring-2 focus:ring-violet-200 focus:border-transparent bg-white/80"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="participant">Participant</option>
          </select>
        </div>

        {/* Capacity input — hidden for participants */}
        {!isParticipant && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity (minutes)
              <span className="text-gray-400 font-normal ml-1">
                — {remainingCapacity} min available
              </span>
            </label>
            <input
              type="number"
              min={0}
              max={remainingCapacity}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent
                ${capacity > remainingCapacity ? "border-red-400 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`}
            />
            {capacity > remainingCapacity && (
              <p className="text-xs text-red-500 mt-1">
                Exceeds available capacity by {capacity - remainingCapacity} min
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            <UserPlus className="w-4 h-4 mr-1" />
            {isParticipant ? "Add Participant" : "Add Member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Remove Member Confirm Modal ──────────────────────────────────────────────
function RemoveMemberModal({
  open,
  onClose,
  member,
  onRemoved,
}: {
  open: boolean;
  onClose: () => void;
  member: MemberWithProfile;
  onRemoved: () => void;
}) {
  const { session } = useSupabase();
  const { currentOrg } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    member.profile?.full_name ||
    member.profile?.email ||
    member.invited_email ||
    "this member";

  const handleRemove = async () => {
    if (!currentOrg) return;
    setLoading(true);
    setError(null);
    const token = session?.access_token || "";
    try {
      await api.removeOrgMember(currentOrg.id, member.id, token);
      onRemoved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Remove Member">
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Alert variant="warning">
          Remove <strong>{displayName}</strong> from this organization? They will lose all access
          immediately.
        </Alert>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRemove} loading={loading}>
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { session } = useSupabase();
  const { currentOrg, currentRole, loading: orgLoading } = useOrganization();
  const router = useRouter();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuotas, setEditingQuotas] = useState<Record<string, number>>({});
  const [editingRoles, setEditingRoles] = useState<Record<string, UserRole>>({});
  const [savingQuota, setSavingQuota] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removingMember, setRemovingMember] = useState<MemberWithProfile | null>(null);

  // ── Role guard: only admins may access this page ──────────────────────────
  useEffect(() => {
    if (orgLoading) return;
    if (currentRole !== "admin") {
      if (currentRole === "member") router.replace("/dashboard/member");
      else if (currentRole === "participant") router.replace("/dashboard/participant");
      else router.replace("/dashboard");
    }
  }, [orgLoading, currentRole, router]);

  const loadMembers = useCallback(async () => {
    if (!currentOrg || !session) return;
    setLoading(true);
    try {
      const data = await api.getOrgMembers(currentOrg.id, session.access_token);
      setMembers(data as MemberWithProfile[]);
    } catch {
      // silently fail — members list stays empty
    }
    setLoading(false);
  }, [currentOrg, session]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Split into members (admin+member) and participants
  const nonParticipants = members.filter((m) => m.role !== "participant");
  const participants = members.filter((m) => m.role === "participant");

  const totalCapacity = nonParticipants.reduce((sum, m) => sum + m.capacity_minutes, 0);
  const totalUsed = nonParticipants.reduce((sum, m) => sum + m.used_minutes, 0);

  const handleQuotaSave = async (membershipId: string) => {
    const newQuota = editingQuotas[membershipId];
    if (newQuota === undefined) return;
    if (!currentOrg) return;

    // Validate against remaining org capacity
    const otherAllocated = nonParticipants
      .filter((m) => m.id !== membershipId)
      .reduce((s, m) => s + m.capacity_minutes, 0);
    const maxAllowed = currentOrg.total_capacity_min - otherAllocated;

    if (newQuota > maxAllowed) {
      setError(
        `Cannot set quota to ${newQuota} min. Only ${maxAllowed} min available ` +
          `(org total: ${currentOrg.total_capacity_min} min, other members: ${otherAllocated} min).`
      );
      return;
    }

    setSavingQuota(membershipId);
    setError(null);

    try {
      await api.updateMemberQuota(membershipId, newQuota, session?.access_token || "");
      setEditingQuotas((prev) => {
        const next = { ...prev };
        delete next[membershipId];
        return next;
      });
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quota");
    }
    setSavingQuota(null);
  };

  const handleRoleSave = async (membershipId: string) => {
    const newRole = editingRoles[membershipId];
    if (!newRole) return;

    setSavingRole(membershipId);
    setError(null);

    if (!currentOrg) return;
    try {
      await api.updateMemberRole(currentOrg.id, membershipId, newRole, session?.access_token || "");
      setEditingRoles((prev) => {
        const next = { ...prev };
        delete next[membershipId];
        return next;
      });
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
    setSavingRole(null);
  };

  // Don't render while checking role
  if (orgLoading || currentRole !== "admin") return null;

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-800">דף בית — ניהול ארגון</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card gradient="from-violet-50 to-fuchsia-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-400 text-white flex items-center justify-center shadow-sm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Minutes Used</p>
              <p className="text-xl font-bold text-gray-800">
                {totalUsed} / {totalCapacity}
              </p>
            </div>
          </div>
        </Card>

        <Card gradient="from-sky-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-400 text-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Members</p>
              <p className="text-xl font-bold text-gray-800">
                {nonParticipants.length}
                {currentOrg && (
                  <span className="text-sm font-normal text-gray-400 ml-1">
                    / {currentOrg.max_members}
                  </span>
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card gradient="from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-400 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Org Capacity</p>
              <p className="text-xl font-bold text-gray-800">
                {currentOrg?.total_capacity_min ?? "—"} min
              </p>
            </div>
          </div>
        </Card>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* ── Members Table (admin + member roles) ── */}
      <Card padding={false} gradient="from-violet-50/60 to-fuchsia-50/40">
        <div className="p-6 pb-4 flex items-center justify-between border-b border-violet-100/60">
          <CardHeader className="mb-0">
            <CardTitle>Members &amp; Quotas</CardTitle>
          </CardHeader>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 mr-1" />
            Add Member
          </Button>
        </div>

        {loading ? (
          <div className="px-6 pb-6 text-center py-8">
            <div className="animate-pulse text-sm text-gray-400">Loading members...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/40 border-b border-violet-100/60">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Member</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Used / Quota</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Quota (min)</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-50/60">
                {nonParticipants.map((m) => (
                  <MemberRow
                    key={m.id}
                    m={m}
                    editingQuotas={editingQuotas}
                    setEditingQuotas={setEditingQuotas}
                    editingRoles={editingRoles}
                    setEditingRoles={setEditingRoles}
                    savingQuota={savingQuota}
                    savingRole={savingRole}
                    onSaveQuota={handleQuotaSave}
                    onSaveRole={handleRoleSave}
                    onRemove={() => setRemovingMember(m)}
                    showCapacity
                  />
                ))}
                {nonParticipants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                      No members yet. Add the first one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Participants Table ── */}
      <Card padding={false} gradient="from-pink-50/60 to-rose-50/40">
        <div className="p-6 pb-4 flex items-center justify-between border-b border-pink-100/60">
          <CardHeader className="mb-0">
            <CardTitle>Participants</CardTitle>
          </CardHeader>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add Participant
          </Button>
        </div>

        {loading ? (
          <div className="px-6 pb-6 text-center py-8">
            <div className="animate-pulse text-sm text-gray-400">Loading participants...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/40 border-b border-pink-100/60">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Participant</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50/60">
                {participants.map((m) => (
                  <MemberRow
                    key={m.id}
                    m={m}
                    editingQuotas={editingQuotas}
                    setEditingQuotas={setEditingQuotas}
                    editingRoles={editingRoles}
                    setEditingRoles={setEditingRoles}
                    savingQuota={savingQuota}
                    savingRole={savingRole}
                    onSaveQuota={handleQuotaSave}
                    onSaveRole={handleRoleSave}
                    onRemove={() => setRemovingMember(m)}
                    showCapacity={false}
                  />
                ))}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">
                      No participants yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Global System Prompt Selector (from platform admin library) */}
      <PromptSelector />

      {/* Local Org Prompt Editor (fallback / override) */}
      <PromptEditor />

      {/* Modals */}
      <AddMemberModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={loadMembers}
        members={members}
      />

      {removingMember && (
        <RemoveMemberModal
          open={!!removingMember}
          onClose={() => setRemovingMember(null)}
          member={removingMember}
          onRemoved={loadMembers}
        />
      )}
    </div>
  );
}

// ─── Shared Row Component ─────────────────────────────────────────────────────
function MemberRow({
  m,
  editingQuotas,
  setEditingQuotas,
  editingRoles,
  setEditingRoles,
  savingQuota,
  savingRole,
  onSaveQuota,
  onSaveRole,
  onRemove,
  showCapacity,
}: {
  m: MemberWithProfile;
  editingQuotas: Record<string, number>;
  setEditingQuotas: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editingRoles: Record<string, UserRole>;
  setEditingRoles: React.Dispatch<React.SetStateAction<Record<string, UserRole>>>;
  savingQuota: string | null;
  savingRole: string | null;
  onSaveQuota: (id: string) => void;
  onSaveRole: (id: string) => void;
  onRemove: () => void;
  showCapacity: boolean;
}) {
  return (
    <tr className="hover:bg-white/50 transition-colors">
      {/* Member info */}
      <td className="px-6 py-3">
        <div>
          <p className="font-medium text-gray-800">
            {m.profile?.full_name || m.invited_email || "—"}
          </p>
          <p className="text-xs text-gray-400">
            {m.profile?.email || m.invited_email}
            {!m.profile && m.invited_email && (
              <span className="ml-1 text-amber-500">(pending)</span>
            )}
          </p>
        </div>
      </td>

      {/* Role — editable dropdown */}
      <td className="px-6 py-3">
        <div className="flex items-center gap-2">
          <select
            value={editingRoles[m.id] !== undefined ? editingRoles[m.id] : m.role}
            onChange={(e) =>
              setEditingRoles((prev) => ({
                ...prev,
                [m.id]: e.target.value as UserRole,
              }))
            }
            className="px-2 py-1 text-xs border border-violet-100 rounded-xl bg-white/80 focus:ring-2 focus:ring-violet-200 focus:border-transparent"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="participant">Participant</option>
          </select>
          {editingRoles[m.id] !== undefined && (
            <Button
              size="sm"
              onClick={() => onSaveRole(m.id)}
              loading={savingRole === m.id}
            >
              <Save className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </td>

      {/* Capacity or status */}
      {showCapacity ? (
        <>
          <td className="px-6 py-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 max-w-[120px] h-2 bg-violet-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-400 to-pink-400 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (m.used_minutes / (m.capacity_minutes || 1)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 tabular-nums">
                {m.used_minutes}/{m.capacity_minutes}
              </span>
            </div>
          </td>

          <td className="px-6 py-3">
            <input
              type="number"
              min={0}
              value={
                editingQuotas[m.id] !== undefined ? editingQuotas[m.id] : m.capacity_minutes
              }
              onChange={(e) =>
                setEditingQuotas((prev) => ({
                  ...prev,
                  [m.id]: Number(e.target.value),
                }))
              }
              className="w-24 px-2 py-1 text-sm border border-violet-100 rounded-xl bg-white/80
                focus:ring-2 focus:ring-violet-200 focus:border-transparent"
            />
          </td>
        </>
      ) : (
        <td className="px-6 py-3">
          <Badge variant="default">Read-only access</Badge>
        </td>
      )}

      {/* Actions */}
      <td className="px-6 py-3">
        <div className="flex items-center gap-2">
          {showCapacity && editingQuotas[m.id] !== undefined && (
            <Button
              size="sm"
              onClick={() => onSaveQuota(m.id)}
              loading={savingQuota === m.id}
            >
              <Save className="w-3.5 h-3.5" />
            </Button>
          )}
          <button
            onClick={onRemove}
            className="p-1.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50/60 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
