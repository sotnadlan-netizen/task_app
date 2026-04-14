"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import type { Organization, OrgMembership, Profile, Session, UserRole } from "@/types";
import {
  Building2, Clock, Users, Activity, Plus, ChevronRight,
  ChevronLeft, Save, BarChart3, ListChecks, Trash2, Settings, UserPlus,
} from "lucide-react";

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
  const { supabase } = useSupabase();
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

    // Check for duplicate org name
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .ilike("name", name.trim())
      .maybeSingle();

    if (existing) {
      setError(`An organization named "${name.trim()}" already exists. Please choose a different name.`);
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.from("organizations").insert({ name: name.trim(), total_capacity_min: capacity, max_members: maxMembers });
    if (err) { setError(err.message); } else { setName(""); setCapacity(600); setMaxMembers(10); onCreated(); onClose(); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Organization">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Capacity (minutes)</label>
          <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
          <input type="number" min={1} value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}><Plus className="w-4 h-4 mr-1" />Create</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Org Modal ───────────────────────────────────────────────────────────
function EditOrgModal({ open, onClose, org, onSaved }: { open: boolean; onClose: () => void; org: Organization; onSaved: (updated: Organization) => void }) {
  const { supabase } = useSupabase();
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
    const { data, error: err } = await supabase
      .from("organizations")
      .update({ name: name.trim(), total_capacity_min: capacity, max_members: maxMembers })
      .eq("id", org.id)
      .select()
      .single();
    if (err) { setError(err.message); } else { onSaved(data as Organization); onClose(); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Organization">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Capacity (minutes)</label>
          <input type="number" min={0} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
          <input type="number" min={1} value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}><Save className="w-4 h-4 mr-1" />Save Changes</Button>
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
  const { supabase } = useSupabase();
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
      setError(
        `This organization has reached its member limit of ${org.max_members}. ` +
        `Increase the max members in Edit Config to add more.`
      );
      return;
    }

    // Check capacity
    if (capacity > remainingCapacity) {
      setError(
        `Not enough capacity. You're trying to allocate ${capacity} min, ` +
        `but only ${remainingCapacity} min remain out of ${org.total_capacity_min} min total ` +
        `(${allocatedCapacity} min already allocated).`
      );
      return;
    }

    setLoading(true);
    const trimmedEmail = email.trim();

    // Check for duplicate membership by invited_email
    const existingByEmail = members.find(
      (m) => m.profile?.email === trimmedEmail || m.invited_email === trimmedEmail
    );
    if (existingByEmail) {
      setError(`${trimmedEmail} is already a member of this organization.`);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", trimmedEmail)
      .maybeSingle();

    const insertPayload = profile
      ? { user_id: profile.id, org_id: org.id, role, capacity_minutes: capacity }
      : { invited_email: trimmedEmail, org_id: org.id, role, capacity_minutes: capacity };

    const { error: insertErr } = await supabase.from("org_memberships").insert(insertPayload);

    if (insertErr) { setError(insertErr.message); } else { setEmail(""); setCapacity(120); onAdded(); onClose(); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Capacity & member summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Capacity Available</p>
            <p className={`text-lg font-bold ${remainingCapacity === 0 ? "text-red-600" : "text-green-600"}`}>
              {remainingCapacity} min
            </p>
            <p className="text-xs text-gray-400">{allocatedCapacity} / {org.total_capacity_min} min allocated</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Members</p>
            <p className={`text-lg font-bold ${currentMemberCount >= org.max_members ? "text-red-600" : "text-gray-800"}`}>
              {currentMemberCount} / {org.max_members}
            </p>
            <p className="text-xs text-gray-400">max members</p>
          </div>
        </div>

        {isOverAllocated && (
          <Alert variant="warning">
            Existing members are allocated {allocatedCapacity} min, which exceeds the org total of {org.total_capacity_min} min.
            Increase the org capacity in <strong>Edit Config</strong> before adding more.
          </Alert>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          <p className="text-xs text-gray-400 mt-1">If the user hasn&apos;t signed in yet, they&apos;ll be linked automatically on first login.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="participant">Participant</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capacity (minutes)
            <span className="text-gray-400 font-normal ml-1">— {remainingCapacity} min available to allocate</span>
          </label>
          <input type="number" min={0} max={remainingCapacity} value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:border-transparent
              ${capacity > remainingCapacity ? "border-red-400 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500"}`} />
          {capacity > remainingCapacity && (
            <p className="text-xs text-red-500 mt-1">Exceeds available capacity by {capacity - remainingCapacity} min</p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}><UserPlus className="w-4 h-4 mr-1" />Add Member</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Org Confirm Modal ─────────────────────────────────────────────────
function DeleteOrgModal({ open, onClose, org, onDeleted }: { open: boolean; onClose: () => void; org: Organization; onDeleted: () => void }) {
  const { supabase } = useSupabase();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from("organizations").delete().eq("id", org.id);
    if (err) { setError(err.message); } else { onDeleted(); onClose(); }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete Organization">
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Alert variant="warning">
          This will permanently delete <strong>{org.name}</strong> and all its sessions, tasks, and memberships. This cannot be undone.
        </Alert>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type <span className="font-mono text-red-600">{org.name}</span> to confirm
          </label>
          <input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={loading} disabled={confirm !== org.name}>
            <Trash2 className="w-4 h-4 mr-1" />Delete Organization
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
  const { supabase } = useSupabase();
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
    const { error: err } = await supabase.from("org_memberships").update({ capacity_minutes: newQuota }).eq("id", membershipId);
    if (err) { setError(err.message); } else {
      setEditingQuotas((prev) => { const n = { ...prev }; delete n[membershipId]; return n; });
      onRefresh();
    }
    setSavingQuota(null);
  };

  const handleRoleChange = async (membershipId: string, newRole: UserRole) => {
    const { error: err } = await supabase.from("org_memberships").update({ role: newRole }).eq("id", membershipId);
    if (err) setError(err.message);
    else onRefresh();
  };

  const handleRemoveMember = async (membershipId: string) => {
    const { error: err } = await supabase.from("org_memberships").delete().eq("id", membershipId);
    if (err) setError(err.message);
    else onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <p className="text-sm text-gray-500">Created {new Date(org.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAddMemberModal(true)}>
            <UserPlus className="w-4 h-4 mr-1" />Add Member
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
            <Settings className="w-4 h-4 mr-1" />Edit Config
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="w-4 h-4 mr-1" />Delete
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <div><p className="text-sm text-gray-500">Members</p><p className="text-xl font-bold">{nonParticipants.length}</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div>
            <div><p className="text-sm text-gray-500">Sessions</p><p className="text-xl font-bold">{sessions.length}</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><ListChecks className="w-5 h-5" /></div>
            <div><p className="text-sm text-gray-500">Tasks</p><p className="text-xl font-bold">{taskCount}</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <div><p className="text-sm text-gray-500">Capacity Used</p><p className="text-xl font-bold">{totalUsed}/{totalCapacity} min</p></div>
          </div>
        </Card>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* ── Members Table (admin + member) ── */}
      <Card padding={false}>
        <div className="p-6 pb-0">
          <CardHeader><CardTitle>Members &amp; Quotas</CardTitle></CardHeader>
        </div>
        {nonParticipants.length === 0 ? (
          <div className="px-6 pb-8 text-center py-6">
            <p className="text-sm text-gray-400 mb-3">No members yet.</p>
            <Button size="sm" onClick={() => setShowAddMemberModal(true)}>
              <UserPlus className="w-4 h-4 mr-1" />Add First Member
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Member</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Used / Quota</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Quota (min)</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {nonParticipants.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{m.profile?.full_name || m.invited_email || "—"}</p>
                      <p className="text-xs text-gray-500">{m.profile?.email || m.invited_email}</p>
                      {!m.user_id && <span className="text-xs text-yellow-600 font-medium">Pending invite</span>}
                    </td>
                    <td className="px-6 py-3">
                      <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                        className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="participant">Participant</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[120px] h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, (m.used_minutes / (m.capacity_minutes || 1)) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums">{m.used_minutes}/{m.capacity_minutes}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <input type="number" min={0}
                        value={editingQuotas[m.id] !== undefined ? editingQuotas[m.id] : m.capacity_minutes}
                        onChange={(e) => setEditingQuotas((prev) => ({ ...prev, [m.id]: Number(e.target.value) }))}
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {editingQuotas[m.id] !== undefined && (
                          <Button size="sm" onClick={() => handleQuotaSave(m.id)} loading={savingQuota === m.id}>
                            <Save className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <button onClick={() => handleRemoveMember(m.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove">
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
        <div className="p-6 pb-0">
          <CardHeader><CardTitle>Participants</CardTitle></CardHeader>
        </div>
        {participants.length === 0 ? (
          <p className="px-6 pb-6 pt-4 text-sm text-gray-400">No participants in this organization.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Participant</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {participants.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{m.profile?.full_name || m.invited_email || "—"}</p>
                      <p className="text-xs text-gray-500">{m.profile?.email || m.invited_email}</p>
                      {!m.user_id && <span className="text-xs text-yellow-600 font-medium">Pending invite</span>}
                    </td>
                    <td className="px-6 py-3">
                      <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value as UserRole)}
                        className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="participant">Participant</option>
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="default">Read-only access</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <button onClick={() => handleRemoveMember(m.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove">
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
      <Card padding={false}>
        <div className="p-6 pb-0">
          <CardHeader><CardTitle>Recent Sessions</CardTitle></CardHeader>
        </div>
        {sessions.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-gray-400">No sessions yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((s) => (
              <div key={s.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900">{s.title || "Untitled Session"}</h4>
                  <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{s.summary || "No summary."}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-gray-400">{Math.round(s.duration_seconds / 60)} min</span>
                  <span className="text-xs text-gray-400 capitalize">Sentiment: {s.sentiment}</span>
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
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Administration</h1>
          <p className="text-sm text-gray-500">Global organization configuration and monitoring.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />New Organization
        </Button>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
            <div><p className="text-sm text-gray-500">Organizations</p><p className="text-xl font-bold">{organizations.length}</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <div><p className="text-sm text-gray-500">Total Capacity</p><p className="text-xl font-bold">{totalCapacity} min</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center"><Activity className="w-5 h-5" /></div>
            <div><p className="text-sm text-gray-500">Used</p><p className="text-xl font-bold">{totalUsed} min</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <div><p className="text-sm text-gray-500">Utilization</p><p className="text-xl font-bold">{totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0}%</p></div>
          </div>
        </Card>
      </div>

      {/* Org Table */}
      <Card padding={false}>
        <div className="p-6 pb-0">
          <CardHeader><CardTitle>All Organizations</CardTitle></CardHeader>
        </div>
        {loading ? (
          <div className="px-6 pb-6 text-center py-8">
            <div className="animate-pulse text-sm text-gray-400">Loading organizations...</div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="px-6 pb-8 text-center py-8">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No organizations yet.</p>
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />Create first organization
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Organization</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Capacity</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Used</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Utilization</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Created</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {organizations.map((org) => {
                  const utilization = org.total_capacity_min > 0
                    ? Math.round((org.used_capacity_min / org.total_capacity_min) * 100) : 0;
                  return (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{org.name}</td>
                      <td className="px-6 py-3 text-gray-600">{org.total_capacity_min} min</td>
                      <td className="px-6 py-3 text-gray-600">{org.used_capacity_min} min</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[100px] h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${utilization}%` }} />
                          </div>
                          <Badge variant={utilization > 80 ? "danger" : utilization > 50 ? "warning" : "success"}>
                            {utilization}%
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{new Date(org.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <button onClick={() => loadOrgDetail(org)}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                          Manage<ChevronRight className="w-4 h-4" />
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
    </div>
  );
}
