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
import { PageHeader, KpiTile } from "@/components/ui/lightning";
import { useLanguage } from "@/providers/language-provider";
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
  const { t } = useLanguage();
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
        setError(t("admin.errMemberLimit", { max: currentOrg.max_members }));
        return;
      }
      if (capacity > remainingCapacity) {
        setError(t("admin.errCapacity", { cap: capacity, rem: remainingCapacity, alloc: allocatedCapacity, total: currentOrg.total_capacity_min }));
        return;
      }
    }

    setLoading(true);
    const trimmedEmail = email.trim();

    const existingByEmail = members.find(
      (m) => m.profile?.email === trimmedEmail || m.invited_email === trimmedEmail
    );
    if (existingByEmail) {
      setError(t("admin.errAlreadyMember", { email: trimmedEmail }));
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
      setError(err instanceof Error ? err.message : t("admin.errAddMember"));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={isParticipant ? t("admin.addParticipant") : t("admin.addMember")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Capacity & member summary — only for non-participants */}
        {!isParticipant && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#fafaf9] border border-[#dddbda] rounded p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">{t("admin.capacityAvailable")}</p>
              <p
                className={`text-lg font-bold ${remainingCapacity === 0 ? "text-red-600" : "text-green-600"}`}
              >
                {remainingCapacity} {t("common.minutes")}
              </p>
              <p className="text-xs text-gray-400">
                {t("admin.allocatedOf", { alloc: allocatedCapacity, total: currentOrg.total_capacity_min })}
              </p>
            </div>
            <div className="bg-[#fafaf9] border border-[#dddbda] rounded p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">{t("admin.members")}</p>
              <p
                className={`text-lg font-bold ${currentMemberCount >= currentOrg.max_members ? "text-red-600" : "text-gray-800"}`}
              >
                {currentMemberCount} / {currentOrg.max_members}
              </p>
              <p className="text-xs text-gray-400">{t("admin.maxMembers")}</p>
            </div>
          </div>
        )}

        {!isParticipant && isOverAllocated && (
          <Alert variant="warning">
            {t("admin.overAllocated", { alloc: allocatedCapacity, total: currentOrg.total_capacity_min })}
          </Alert>
        )}

        {isParticipant && (
          <Alert variant="warning">
            {t("admin.participantWarning")}
          </Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("admin.userEmail")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t("memberHome.emailHelper")}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("admin.role")}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
          >
            <option value="admin">{t("roles.admin")}</option>
            <option value="member">{t("roles.member")}</option>
            <option value="participant">{t("roles.participant")}</option>
          </select>
        </div>

        {/* Capacity input — hidden for participants */}
        {!isParticipant && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin.capacityMinutes")}
              <span className="text-gray-400 font-normal ms-1">
                {t("admin.minAvailable", { rem: remainingCapacity })}
              </span>
            </label>
            <input
              type="number"
              min={0}
              max={remainingCapacity}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent
                ${capacity > remainingCapacity ? "border-red-400 focus:ring-red-500" : "border-[#dddbda] focus:ring-[#0070d2]/40"}`}
            />
            {capacity > remainingCapacity && (
              <p className="text-xs text-red-500 mt-1">
                {t("admin.exceedsBy", { count: capacity - remainingCapacity })}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={loading}>
            <UserPlus className="w-4 h-4 me-1" />
            {isParticipant ? t("admin.addParticipant") : t("admin.addMember")}
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
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    member.profile?.full_name ||
    member.profile?.email ||
    member.invited_email ||
    t("admin.thisMember");

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
      setError(err instanceof Error ? err.message : t("admin.errRemoveMember"));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("admin.removeMember")}>
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Alert variant="warning">
          {t("admin.removeConfirm", { name: displayName })}
        </Alert>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={handleRemove} loading={loading}>
            <Trash2 className="w-4 h-4 me-1" />
            {t("admin.remove")}
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
  const { t } = useLanguage();
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
      setError(t("admin.errQuotaLimit", { q: newQuota, max: maxAllowed, total: currentOrg.total_capacity_min, other: otherAllocated }));
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
      setError(err instanceof Error ? err.message : t("admin.errQuota"));
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
      setError(err instanceof Error ? err.message : t("admin.errRole"));
    }
    setSavingRole(null);
  };

  // Don't render while checking role
  if (orgLoading || currentRole !== "admin") return null;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Building2 className="w-5 h-5 text-white" />}
        eyebrow={t("console.organization")}
        title={t("admin.title")}
        breadcrumb={[currentOrg?.name || t("nav.organization"), t("admin.crumb")]}
        actions={
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 me-1" />
            {t("admin.addUser")}
          </Button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiTile
          label={t("admin.totalMinutesUsed")}
          value={`${totalUsed} / ${totalCapacity}`}
          icon={<Clock className="w-5 h-5" />}
        />
        <KpiTile
          label={t("admin.members")}
          value={nonParticipants.length}
          suffix={currentOrg ? `/ ${currentOrg.max_members}` : undefined}
          icon={<Users className="w-5 h-5" />}
        />
        <KpiTile
          label={t("admin.orgCapacity")}
          value={currentOrg?.total_capacity_min ?? "—"}
          suffix={t("common.minutes")}
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* ── Members Table (admin + member roles) ── */}
      <Card padding={false}>
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[#dddbda]">
          <CardHeader className="mb-0">
            <CardTitle>{t("admin.membersQuotas")}</CardTitle>
          </CardHeader>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 me-1" />
            {t("admin.addMember")}
          </Button>
        </div>

        {loading ? (
          <div className="px-6 pb-6 text-center py-8">
            <div className="animate-pulse text-sm text-gray-400">{t("admin.loadingMembers")}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#fafaf9] border-b border-[#dddbda]">
                <tr>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("admin.colMember")}</th>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("admin.colRole")}</th>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("admin.colUsedQuota")}</th>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("admin.colQuota")}</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dddbda]">
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
                      {t("admin.noMembers")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Participants Table ── */}
      <Card padding={false}>
        <div className="p-6 pb-4 flex items-center justify-between border-b border-[#dddbda]">
          <CardHeader className="mb-0">
            <CardTitle>{t("admin.participantsTitle")}</CardTitle>
          </CardHeader>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus className="w-4 h-4 me-1" />
            {t("admin.addParticipant")}
          </Button>
        </div>

        {loading ? (
          <div className="px-6 pb-6 text-center py-8">
            <div className="animate-pulse text-sm text-gray-400">{t("admin.loadingParticipants")}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#fafaf9] border-b border-[#dddbda]">
                <tr>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("admin.colParticipant")}</th>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("admin.colRole")}</th>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("admin.colStatus")}</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dddbda]">
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
                      {t("admin.noParticipants")}
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
  const { t } = useLanguage();
  return (
    <tr className="hover:bg-[#fafaf9] transition-colors">
      {/* Member info */}
      <td className="px-6 py-3">
        <div>
          <p className="font-medium text-gray-800">
            {m.profile?.full_name || m.invited_email || "—"}
          </p>
          <p className="text-xs text-gray-400">
            {m.profile?.email || m.invited_email}
            {!m.profile && m.invited_email && (
              <span className="ms-1 text-amber-500">{t("admin.pending")}</span>
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
            className="px-2 py-1 text-xs border border-[#dddbda] rounded bg-white focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent"
          >
            <option value="admin">{t("roles.admin")}</option>
            <option value="member">{t("roles.member")}</option>
            <option value="participant">{t("roles.participant")}</option>
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
              <div className="flex-1 max-w-[120px] h-2 bg-[#ecf5fe] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0070d2] to-[#1ab9ff] rounded-full transition-all"
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
              className="w-24 px-2 py-1 text-sm border border-[#dddbda] rounded bg-white
                focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent"
            />
          </td>
        </>
      ) : (
        <td className="px-6 py-3">
          <Badge variant="default">{t("admin.readOnly")}</Badge>
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
            className="p-1.5 rounded text-gray-300 hover:text-[#c23934] hover:bg-[#fde9e7] transition-colors"
            title={t("admin.remove")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
