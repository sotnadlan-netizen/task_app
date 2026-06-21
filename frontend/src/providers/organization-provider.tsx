"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "./supabase-provider";
import { api } from "@/lib/api";
import type {
  Organization,
  OrgMembership,
  UserRole,
  CapacityInfo,
} from "@/types";

const LOW_BALANCE_THRESHOLD = 10;
const HARD_BLOCK_THRESHOLD = 0;

interface OrganizationContextType {
  organizations: Organization[];
  memberships: OrgMembership[];
  currentOrg: Organization | null;
  currentMembership: OrgMembership | null;
  currentRole: UserRole | null;
  capacity: CapacityInfo | null;
  loading: boolean;
  isPlatformAdmin: boolean;
  switchOrganization: (orgId: string) => void;
  applyOrgUpdate: (updated: Organization) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { supabase, user } = useSupabase();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setMemberships([]);
      setCurrentOrgId(null);
      setLoading(false);
      return;
    }

    async function loadOrganizations() {
      // Check platform admin status first
      const { data: platformAdminData } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (platformAdminData) {
        setIsPlatformAdmin(true);
        setLoading(false);
        router.push("/dashboard/platform");
        return;
      }

      const { data: membershipData } = await supabase
        .from("org_memberships")
        .select("*, organization:organizations(*)")
        .eq("user_id", user!.id);

      if (membershipData && membershipData.length > 0) {
        const orgs = membershipData.map(
          (m: OrgMembership & { organization: Organization }) => m.organization
        );
        setMemberships(membershipData);
        setOrganizations(orgs);

        const savedOrgId = localStorage.getItem("current_org_id");
        const validSaved = orgs.find(
          (o: Organization) => o.id === savedOrgId
        );
        setCurrentOrgId(validSaved ? savedOrgId : orgs[0].id);
      } else {
        // First login with no org. If the user clicked "Start free" on the
        // landing page, auto-provision a trial workspace instead of sending
        // them to /no-org.
        const pendingTrial =
          typeof window !== "undefined" &&
          localStorage.getItem("pending_trial");
        if (pendingTrial) {
          localStorage.removeItem("pending_trial");
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            await api.startTrial(session?.access_token || "");
            // Reload now that the trial org + admin membership exist, then drop
            // the user straight into the recording view so they can start using
            // the app immediately (as admin they keep the admin↔member toggle).
            await loadOrganizations();
            router.push("/dashboard/member");
            return;
          } catch {
            // Provisioning failed (e.g. trial already used) — fall through.
          }
        }
        router.push("/no-org");
      }
      setLoading(false);
    }

    loadOrganizations();
  }, [user, supabase]);

  const switchOrganization = useCallback(
    (orgId: string) => {
      // Re-selecting the current org is a no-op — otherwise the user gets
      // bounced back to their role home page for no reason.
      if (orgId === currentOrgId) return;

      const prevMembership = memberships.find((m) => m.org_id === currentOrgId);
      const newMembership = memberships.find((m) => m.org_id === orgId);

      setCurrentOrgId(orgId);
      localStorage.setItem("current_org_id", orgId);

      // Only re-route when the role actually differs between orgs; switching
      // between same-role orgs keeps the user on the page they were viewing.
      if (newMembership && newMembership.role !== prevMembership?.role) {
        const role = newMembership.role;
        if (role === "admin") router.push("/dashboard/admin");
        else if (role === "member") router.push("/dashboard/member");
        else router.push("/dashboard/participant");
      }
    },
    [memberships, router, currentOrgId]
  );

  // Patch a single org in place (e.g. after a logo upload) so the header and
  // settings reflect the change without a full reload.
  const applyOrgUpdate = useCallback((updated: Organization) => {
    setOrganizations((prev) =>
      prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
    );
  }, []);

  const currentOrg =
    organizations.find((o) => o.id === currentOrgId) || null;
  const currentMembership =
    memberships.find((m) => m.org_id === currentOrgId) || null;
  const currentRole = currentMembership?.role || null;

  const capacity: CapacityInfo | null = currentMembership
    ? {
        capacity_minutes: currentMembership.capacity_minutes,
        used_minutes: currentMembership.used_minutes,
        remaining_minutes:
          currentMembership.capacity_minutes -
          currentMembership.used_minutes,
        is_low_balance:
          currentMembership.capacity_minutes -
            currentMembership.used_minutes <=
          LOW_BALANCE_THRESHOLD,
        is_blocked:
          currentMembership.capacity_minutes -
            currentMembership.used_minutes <=
          HARD_BLOCK_THRESHOLD,
      }
    : null;

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        memberships,
        currentOrg,
        currentMembership,
        currentRole,
        capacity,
        loading,
        isPlatformAdmin,
        switchOrganization,
        applyOrgUpdate,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
