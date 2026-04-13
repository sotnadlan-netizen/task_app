"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Organization } from "@/types";
import { Building2, Clock, Users, Activity } from "lucide-react";

export default function PlatformPage() {
  const { supabase } = useSupabase();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setOrganizations(data as Organization[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadOrgs();
  }, [loadOrgs]);

  const totalCapacity = organizations.reduce(
    (sum, o) => sum + o.total_capacity_min,
    0
  );
  const totalUsed = organizations.reduce(
    (sum, o) => sum + o.used_capacity_min,
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        Platform Administration
      </h1>
      <p className="text-sm text-gray-500">
        Global organization configuration and monitoring.
      </p>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Organizations</p>
              <p className="text-xl font-bold">{organizations.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Capacity</p>
              <p className="text-xl font-bold">{totalCapacity} min</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Used</p>
              <p className="text-xl font-bold">{totalUsed} min</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Utilization</p>
              <p className="text-xl font-bold">
                {totalCapacity > 0
                  ? Math.round((totalUsed / totalCapacity) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Org Table */}
      <Card padding={false}>
        <div className="p-6 pb-0">
          <CardHeader>
            <CardTitle>All Organizations</CardTitle>
          </CardHeader>
        </div>

        {loading ? (
          <div className="px-6 pb-6 text-center py-8">
            <div className="animate-pulse text-sm text-gray-400">
              Loading organizations...
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    Organization
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    Capacity
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    Used
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    Utilization
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {organizations.map((org) => {
                  const utilization =
                    org.total_capacity_min > 0
                      ? Math.round(
                          (org.used_capacity_min / org.total_capacity_min) *
                            100
                        )
                      : 0;

                  return (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {org.name}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {org.total_capacity_min} min
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {org.used_capacity_min} min
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[100px] h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                          <Badge
                            variant={
                              utilization > 80
                                ? "danger"
                                : utilization > 50
                                  ? "warning"
                                  : "success"
                            }
                          >
                            {utilization}%
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
