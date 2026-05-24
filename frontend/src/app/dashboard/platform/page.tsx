"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { PageHeader, KpiTile } from "@/components/ui/lightning";
import type { Organization, OrgMembership, Profile, Session, UserRole } from "@/types";
import {
  Building2, Clock, Users, Activity, Plus, ChevronRight,
  ChevronLeft, Save, BarChart3, ListChecks, Trash2, Settings, UserPlus,
} from "lucide-react";
import { SystemPromptsPanel } from "@/components/platform/system-prompts-panel";
import { OrgPromptAssignment } from "@/components/platform/org-prompt-assignment";
import { useLanguage } from "@/providers/language-provider";

interface MemberWithProfile extends OrgMembership {
  profile: Profile;
}

interface OrgDetail {
  org: Organization;
  members: MemberWithProfile[];
  sessions: Session[];
  taskCount: number;
}

// ─── Create Org Modal ─────────────────────────────────────────────────────────
function CreateOrgModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(600);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [maxMembers, setMaxMembers] = useState(10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const token = session?.access_token || "";
    try {
      await api.createOrg({ name: name.trim(), total_capacity_min: capacity, max_members: maxMembers }, token);
      setName(""); setCapacity(600); setMaxMembers(10); onCreated(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platform.errCreateOrg"));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("platform.createOrg")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("platform.orgName")}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("platform.orgNamePlaceholder")} required
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("platform.totalCapacityLabel")}</label>
          <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("platform.maxMembers")}</label>
          <input type="number" min={1} value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value))}
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={loading}><Plus className="w-4 h-4 me-1" />{t("common.create")}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Org Modal ───────────────────────────────────────────────────────────
function EditOrgModal({ open, onClose, org, onSaved }: { open: boolean; onClose: () => void; org: Organization; onSaved: (updated: Organization) => void }) {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [name, setName] = useState(org.name);
  const [capacity, setCapacity] = useState(org.total_capacity_min);
  const [maxMembers, setMaxMembers] = useState(org.max_members);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setName(org.name); setCapacity(org.total_capacity_min); setMaxMembers(org.max_members); }, [org]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const token = session?.access_token || "";
    try {
      const updated = await api.updateOrg(org.id, { name: name.trim(), total_capacity_min: capacity, max_members: maxMembers }, token) as Organization;
      onSaved(updated); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platform.errUpdateOrg"));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("platform.editOrg")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("platform.orgName")}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("platform.totalCapacityLabel")}</label>
          <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("platform.maxMembers")}</label>
          <input type="number" min={1} value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value))}
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={loading}><Save className="w-4 h-4 me-1" />{t("common.saveChanges")}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────
function AddMemberModal({ open, onClose, org, members, onAdded }: {
  open: boolean;
  onClose: () => void;
  org: Organization;
  members: MemberWithProfile[];
  onAdded: () => void;
}) {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [capacity, setCapacity] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allocatedCapacity = members.reduce((s, m) => s + m.capacity_minutes, 0);
  const remainingCapacity = Math.max(0, org.total_capacity_min - allocatedCapacity);
  const isOverAllocated = allocatedCapacity > org.total_capacity_min;
  const currentMemberCount = members.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check member limit
    if (currentMemberCount >= org.max_members) {
      setError(t("platform.errMemberLimit", { max: org.max_members }));
      return;
    }

    // Check capacity
    if (capacity > remainingCapacity) {
      setError(t("platform.errCapacity", { cap: capacity, rem: remainingCapacity, total: org.total_capacity_min, alloc: allocatedCapacity }));
      return;
    }

    setLoading(true);
    const trimmedEmail = email.trim();

    // Check for duplicate membership by invited_email
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
      await api.addOrgMember(org.id, { email: trimmedEmail, role }, token);
      setEmail(""); setCapacity(120); onAdded(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errAddMember"));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("admin.addMember")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Capacity & member summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#fafaf9] border border-[#dddbda] rounded p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{t("admin.capacityAvailable")}</p>
            <p className={`text-lg font-bold ${remainingCapacity === 0 ? "text-red-600" : "text-green-600"}`}>
              {remainingCapacity} {t("common.minutes")}
            </p>
            <p className="text-xs text-gray-400">{t("admin.allocatedOf", { alloc: allocatedCapacity, total: org.total_capacity_min })}</p>
          </div>
          <div className="bg-[#fafaf9] border border-[#dddbda] rounded p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{t("admin.members")}</p>
            <p className={`text-lg font-bold ${currentMemberCount >= org.max_members ? "text-red-600" : "text-gray-800"}`}>
              {currentMemberCount} / {org.max_members}
            </p>
            <p className="text-xs text-gray-400">{t("admin.maxMembers")}</p>
          </div>
        </div>

        {isOverAllocated && (
          <Alert variant="warning">
            {t("platform.overAllocated", { alloc: allocatedCapacity, total: org.total_capacity_min })}
          </Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("admin.userEmail")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white" />
          <p className="text-xs text-gray-400 mt-1">{t("memberHome.emailHelper")}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("admin.role")}</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white">
            <option value="admin">{t("roles.admin")}</option>
            <option value="member">{t("roles.member")}</option>
            <option value="participant">{t("roles.participant")}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("admin.capacityMinutes")}
            <span className="text-gray-400 font-normal ms-1">{t("platform.minAvailableAllocate", { rem: remainingCapacity })}</span>
          </label>
          <input type="number" min={0} max={remainingCapacity} value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent
              ${capacity > remainingCapacity ? "border-red-400 focus:ring-red-500" : "border-[#dddbda] focus:ring-[#0070d2]/40"}`} />
          {capacity > remainingCapacity && (
            <p className="text-xs text-red-500 mt-1">{t("admin.exceedsBy", { count: capacity - remainingCapacity })}</p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={loading}><UserPlus className="w-4 h-4 me-1" />{t("admin.addMember")}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Org Confirm Modal ─────────────────────────────────────────────────
function DeleteOrgModal({ open, onClose, org, onDeleted }: { open: boolean; onClose: () => void; org: Organization; onDeleted: () => void }) {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const token = session?.access_token || "";
    try {
      await api.deleteOrg(org.id, token);
      onDeleted(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("platform.errDeleteOrg"));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("platform.deleteOrg")}>
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Alert variant="warning">
          {t("platform.deleteOrgWarning", { name: org.name })}
        </Alert>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("platform.typeToConfirm", { name: org.name })}
          </label>
          <input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="danger" onClick={handleDelete} loading={loading} disabled={confirm !== org.name}>
            <Trash2 className="w-4 h-4 me-1" />{t("platform.deleteOrg")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Org Detail View ──────────────────────────────────────────────────────────
function OrgDetailView({ detail, onBack, onRefresh, onDeleted }: {
  detail: OrgDetail;
  onBack: () => void;
  onRefresh: () => void;
  onDeleted: () => void;
}) {
  const { session } = useSupabase();
  const { t } = useLanguage();
  const [org, setOrg] = useState(detail.org);
  const { members, sessions, taskCount } = detail;
  const [editingQuotas, setEditingQuotas] = useState<Record<string, number>>({});
  const [savingQuota, setSavingQuota] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Split members and participants
  const nonParticipants = members.filter((m) => m.role !== "participant");
  const participants = members.filter((m) => m.role === "participant");

  const totalUsed = nonParticipants.reduce((s, m) => s + m.used_minutes, 0);
  const totalCapacity = nonParticipants.reduce((s, m) => s + m.capacity_minutes, 0);

  const handleQuotaSave = async (membershipId: string) => {
    const newQuota = editingQuotas[membershipId];
    if (newQuota === undefined) return;

    // Validate capacity
    const otherAllocated = nonParticipants
      .filter((m) => m.id !== membershipId)
      .reduce((s, m) => s + m.capacity_minutes, 0);
    const maxAllowed = org.total_capacity_min - otherAllocated;
    if (newQuota > maxAllowed) {
      setError(
        `Cannot set quota to ${newQuota} min. Only ${maxAllowed} min available ` +
        `(org total: ${org.total_capacity_min} min, other members: ${otherAllocated} min).`
      );
      return;
    }

    setSavingQuota(membershipId);
    setError(null);
    const token = session?.access_token || "";
    try {
      await api.updateMemberQuota(membershipId, newQuota, token);
      setEditingQuotas((prev) => { const n = { ...prev }; delete n[membershipId]; return n; });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errQuota"));
    }
    setSavingQuota(null);
  };

  const handleRoleChange = async (membershipId: string, newRole: UserRole) => {
    const token = session?.access_token || "";
    try {
      await api.updateMemberRole(org.id, membershipId, newRole, token);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errRole"));
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    const token = session?.access_token || "";
    try {
      await api.removeOrgMember(org.id, membershipId, token);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errRemoveMember"));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] px-5 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded hover:bg-[#f3f3f3] transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#706e6b] font-semibold">{t("platform.organizationLabel")}</p>
              <h1 className="text-[20px] font-bold text-[#080707] leading-tight">{org.name}</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAddMemberModal(true)}>
            <UserPlus className="w-4 h-4 me-1" />{t("admin.addMember")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
            <Settings className="w-4 h-4 me-1" />{t("platform.editConfig")}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 me-1" />{t("common.delete")}
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiTile label={t("admin.members")} value={nonParticipants.length} icon={<Users className="w-5 h-5" />} />
        <KpiTile label={t("memberHome.sessions")} value={sessions.length} icon={<BarChart3 className="w-5 h-5" />} />
        <KpiTile label={t("nav.tasks")} value={taskCount} icon={<ListChecks className="w-5 h-5" />} />
        <KpiTile label={t("platform.capacityUsed")} value={`${totalUsed}/${totalCapacity}`} suffix={t("common.minutes")} icon={<Clock className="w-5 h-5" />} />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* ── Members Table (admin + member) ── */}
      <Card padding={false}>
        <div className="p-6 pb-4 border-b border-[#dddbda]">
          <CardHeader className="mb-0"><CardTitle>{t("admin.membersQuotas")}</CardTitle></CardHeader>
        </div>
        {nonParticipants.length === 0 ? (
          <div className="px-6 pb-8 text-center py-6">
            <p className="text-sm text-gray-400 mb-3">{t("admin.noMembers")}</p>
            <Button size="sm" onClick={() => setShowAddMemberModal(true)}>
              <UserPlus className="w-4 h-4 me-1" />{t("platform.addFirstMember")}
            </Button>
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
                  <tr key={m.id} className="hover:bg-[#fafaf9] transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-800">{m.profile?.full_name || m.invited_email || "—"}</p>
                      <p className="text-xs text-gray-400">{m.profile?.email || m.invited_email}</p>
                      {!m.user_id && <span className="text-xs text-amber-500 font-medium">{t("platform.pendingInvite")}</span>}
                    </td>
                    <td className="px-6 py-3">
                      <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                        className="px-2 py-1 text-sm border border-[#dddbda] rounded bg-white focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent">
                        <option value="admin">{t("roles.admin")}</option>
                        <option value="member">{t("roles.member")}</option>
                        <option value="participant">{t("roles.participant")}</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[120px] h-2 bg-[#ecf5fe] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#0070d2] to-[#1ab9ff] rounded-full"
                            style={{ width: `${Math.min(100, (m.used_minutes / (m.capacity_minutes || 1)) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums">{m.used_minutes}/{m.capacity_minutes}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <input type="number" min={0}
                        value={editingQuotas[m.id] !== undefined ? editingQuotas[m.id] : m.capacity_minutes}
                        onChange={(e) => setEditingQuotas((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))}
                        className="w-24 px-2 py-1 text-sm border border-[#dddbda] rounded bg-white focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent" />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {editingQuotas[m.id] !== undefined && (
                          <Button size="sm" onClick={() => handleQuotaSave(m.id)} loading={savingQuota === m.id}>
                            <Save className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <button onClick={() => handleRemoveMember(m.id)}
                          className="p-1.5 rounded text-gray-300 hover:text-[#c23934] hover:bg-[#fde9e7] transition-colors" title={t("admin.remove")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Participants Table ── */}
      <Card padding={false}>
        <div className="p-6 pb-4 border-b border-[#dddbda]">
          <CardHeader className="mb-0"><CardTitle>{t("admin.participantsTitle")}</CardTitle></CardHeader>
        </div>
        {participants.length === 0 ? (
          <p className="px-6 pb-6 pt-4 text-sm text-gray-400">{t("platform.noParticipantsOrg")}</p>
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
                  <tr key={m.id} className="hover:bg-[#fafaf9] transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-800">{m.profile?.full_name || m.invited_email || "—"}</p>
                      <p className="text-xs text-gray-400">{m.profile?.email || m.invited_email}</p>
                      {!m.user_id && <span className="text-xs text-amber-500 font-medium">{t("platform.pendingInvite")}</span>}
                    </td>
                    <td className="px-6 py-3">
                      <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                        className="px-2 py-1 text-sm border border-[#dddbda] rounded bg-white focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent">
                        <option value="admin">{t("roles.admin")}</option>
                        <option value="member">{t("roles.member")}</option>
                        <option value="participant">{t("roles.participant")}</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="default">{t("admin.readOnly")}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <button onClick={() => handleRemoveMember(m.id)}
                        className="p-1.5 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50/60 transition-colors" title={t("admin.remove")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent Sessions */}
      <OrgPromptAssignment orgId={org.id} />

      <Card padding={false}>
        <div className="p-6 pb-4 border-b border-[#dddbda]">
          <CardHeader className="mb-0"><CardTitle>{t("platform.recentSessions")}</CardTitle></CardHeader>
        </div>
        {sessions.length === 0 ? (
          <p className="px-6 pb-6 pt-4 text-sm text-gray-400">{t("platform.noSessions")}</p>
        ) : (
          <div className="divide-y divide-[#dddbda]">
            {sessions.map((s) => (
              <div key={s.id} className="px-6 py-4 hover:bg-[#fafaf9] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold text-gray-800">{s.title || t("platform.untitledSession")}</h4>
                  <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{s.summary || t("platform.noSummary")}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-gray-400">{Math.round(s.duration_seconds / 60)} {t("common.minutes")}</span>
                  <span className="text-xs text-gray-400 capitalize">{t("platform.sentimentLabel", { value: s.sentiment })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <EditOrgModal open={showEditModal} onClose={() => setShowEditModal(false)} org={org}
        onSaved={(updated) => setOrg(updated)} />
      <AddMemberModal open={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} org={org}
        members={members} onAdded={onRefresh} />
      <DeleteOrgModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} org={org}
        onDeleted={onDeleted} />
    </div>
  );
}

// ─── Main Platform Page ───────────────────────────────────────────────────────
export default function PlatformPage() {
  const { supabase } = useSupabase();
  const { t } = useLanguage();
  const { isPlatformAdmin, loading: orgLoading } = useOrganization();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<OrgDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Role guard: only platform admins may access this page
  useEffect(() => {
    if (orgLoading) return;
    if (!isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [orgLoading, isPlatformAdmin, router]);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
    if (data) setOrganizations(data as Organization[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const loadOrgDetail = useCallback(async (org: Organization) => {
    setDetailLoading(true);
    const [membersRes, sessionsRes, tasksRes] = await Promise.all([
      supabase.from("org_memberships").select("*, profile:profiles(*)").eq("org_id", org.id).order("created_at", { ascending: true }),
      supabase.from("sessions").select("*").eq("org_id", org.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("tasks").select("id", { count: "exact" }).eq("org_id", org.id),
    ]);
    setSelectedDetail({
      org,
      members: (membersRes.data as MemberWithProfile[]) || [],
      sessions: (sessionsRes.data as Session[]) || [],
      taskCount: tasksRes.count || 0,
    });
    setDetailLoading(false);
  }, [supabase]);

  const totalCapacity = organizations.reduce((s, o) => s + o.total_capacity_min, 0);
  const totalUsed = organizations.reduce((s, o) => s + o.used_capacity_min, 0);

  // Don't render while checking role or if not platform admin
  if (orgLoading || !isPlatformAdmin) return null;

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#0070d2] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (selectedDetail) {
    return (
      <OrgDetailView
        detail={selectedDetail}
        onBack={() => setSelectedDetail(null)}
        onRefresh={() => loadOrgDetail(selectedDetail.org)}
        onDeleted={() => { setSelectedDetail(null); loadOrgs(); }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Activity className="w-5 h-5 text-white" />}
        eyebrow={t("console.platform")}
        title={t("platform.title")}
        breadcrumb={[t("nav.platform"), t("platform.crumb")]}
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 me-1" />{t("platform.newOrg")}
          </Button>
        }
      />

      {/* Global Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiTile label={t("platform.organizations")} value={organizations.length} icon={<Building2 className="w-5 h-5" />} />
        <KpiTile label={t("platform.totalCapacity")} value={totalCapacity} suffix={t("common.minutes")} icon={<Clock className="w-5 h-5" />} />
        <KpiTile label={t("platform.used")} value={totalUsed} suffix={t("common.minutes")} icon={<Activity className="w-5 h-5" />} />
        <KpiTile label={t("platform.utilization")} value={`${totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0}%`} icon={<Users className="w-5 h-5" />} />
      </div>

      {/* Org Table */}
      <Card padding={false}>
        <div className="p-6 pb-4 border-b border-[#dddbda]">
          <CardHeader className="mb-0"><CardTitle>{t("platform.allOrganizations")}</CardTitle></CardHeader>
        </div>
        {loading ? (
          <div className="px-6 pb-6 text-center py-8">
            <div className="animate-pulse text-sm text-gray-400">{t("platform.loadingOrgs")}</div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="px-6 pb-8 text-center py-8">
            <Building2 className="w-10 h-10 text-[#b3d9f6] mx-auto mb-3" />
            <p className="text-sm text-gray-400">{t("platform.noOrgs")}</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 me-2" />{t("platform.createFirstOrg")}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#fafaf9] border-b border-[#dddbda]">
                <tr>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("platform.colOrganization")}</th>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("platform.colCapacity")}</th>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("platform.colUsed")}</th>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("platform.colUtilization")}</th>
                  <th className="text-start px-6 py-3 font-medium text-gray-400 text-xs uppercase tracking-wide">{t("platform.colCreated")}</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dddbda]">
                {organizations.map((org) => {
                  const utilization = org.total_capacity_min > 0
                    ? Math.round((org.used_capacity_min / org.total_capacity_min) * 100) : 0;
                  return (
                    <tr key={org.id} className="hover:bg-[#fafaf9] transition-colors">
                      <td className="px-6 py-3 font-semibold text-gray-800">{org.name}</td>
                      <td className="px-6 py-3 text-gray-500">{org.total_capacity_min} {t("common.minutes")}</td>
                      <td className="px-6 py-3 text-gray-500">{org.used_capacity_min} {t("common.minutes")}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[100px] h-2 bg-[#ecf5fe] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#0070d2] to-[#1ab9ff] rounded-full" style={{ width: `${utilization}%` }} />
                          </div>
                          <Badge variant={utilization > 80 ? "danger" : utilization > 50 ? "warning" : "success"}>
                            {utilization}%
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-400">{new Date(org.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <button onClick={() => loadOrgDetail(org)}
                          className="flex items-center gap-1 text-[#0070d2] hover:text-[#005fb2] text-sm font-medium transition-colors">
                          {t("platform.manage")}<ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateOrgModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={loadOrgs} />

      {/* ── System Prompts CRUD ── */}
      <SystemPromptsPanel />
    </div>
  );
}
