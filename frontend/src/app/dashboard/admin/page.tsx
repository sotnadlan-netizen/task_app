"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { PromptEditor } from "@/components/inbox/prompt-editor";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import type { OrgMembership, Profile } from "@/types";
import { Users, Clock, Building2, Save } from "lucide-react";

interface MemberWithProfile extends OrgMembership {
  profile: Profile;
}

export default function AdminPage() {
  const { supabase } = useSupabase();
  const { currentOrg } = useOrganization();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuotas, setEditingQuotas] = useState<
    Record<string, number>
  >({});
  const [savingQuota, setSavingQuota] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    const { data } = await supabase
      .from("org_memberships")
      .select("*, profile:profiles(*)")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: true });

    if (data) setMembers(data as MemberWithProfile[]);
    setLoading(false);
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const totalCapacity = members.reduce(
    (sum, m) => sum + m.capacity_minutes,
    0
  );
  const totalUsed = members.reduce((sum, m) => sum + m.used_minutes, 0);

  const handleQuotaSave = async (membershipId: string) => {
    const newQuota = editingQuotas[membershipId];
    if (newQuota === undefined) return;

    setSavingQuota(membershipId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("org_memberships")
        .update({ capacity_minutes: newQuota })
        .eq("id", membershipId);

      if (updateError) throw updateError;

      setEditingQuotas((prev) => {
        const next = { ...prev };
        delete next[membershipId];
        return next;
      });
      loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quota");
    } finally {
      setSavingQuota(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Organization Admin
      </h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Minutes</p>
              <p className="text-xl font-bold">
                {totalUsed} / {totalCapacity}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Members</p>
              <p className="text-xl font-bold">{members.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Allocation</p>
              <p className="text-xl font-bold">{totalCapacity} min</p>
            </div>
          </div>
        </Card>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Member Management Table */}
      <Card padding={false}>
        <div className="p-6 pb-0">
          <CardHeader>
            <CardTitle>Members & Quotas</CardTitle>
          </CardHeader>
        </div>

        {loading ? (
          <div className="px-6 pb-6 text-center py-8">
            <div className="animate-pulse text-sm text-gray-400">
              Loading members...
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    Member
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    Used / Quota
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    Quota (min)
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {m.profile?.full_name || "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {m.profile?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={
                          m.role === "admin"
                            ? "info"
                            : m.role === "member"
                              ? "success"
                              : "default"
                        }
                      >
                        {m.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[120px] h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (m.used_minutes / m.capacity_minutes) * 100)}%`,
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
                          editingQuotas[m.id] !== undefined
                            ? editingQuotas[m.id]
                            : m.capacity_minutes
                        }
                        onChange={(e) =>
                          setEditingQuotas((prev) => ({
                            ...prev,
                            [m.id]: Number(e.target.value),
                          }))
                        }
                        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-lg
                          focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-6 py-3">
                      {editingQuotas[m.id] !== undefined && (
                        <Button
                          size="sm"
                          onClick={() => handleQuotaSave(m.id)}
                          loading={savingQuota === m.id}
                        >
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Prompt Editor */}
      <PromptEditor />
    </div>
  );
}
