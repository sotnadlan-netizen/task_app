"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import type {
  Organization,
  OrgMembership,
  UserRole,
  CapacityInfo,
} from "@/types";

const LOW_BALANCE_THRESHOLD = 70;
const HARD_BLOCK_THRESHOLD = 55;

interface OrganizationContextType {
  organizations: Organization[];
  memberships: OrgMembership[];
  currentOrg: Organization | null;
  currentMembership: OrgMembership | null;
  currentRole: UserRole | null;
  capacity: CapacityInfo | null;
  loading: boolean;
  switchOrganization: (orgId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { supabase, user } = useSupabase();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
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
      }
      setLoading(false);
    }

    loadOrganizations();
  }, [user, supabase]);

  const switchOrganization = useCallback((orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem("current_org_id", orgId);
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
        switchOrganization,
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
