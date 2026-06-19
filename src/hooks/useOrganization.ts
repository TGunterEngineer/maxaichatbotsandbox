import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOrganization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all orgs the user belongs to
  const {
    data: memberships,
    isLoading: membershipsLoading,
    error: membershipsError,
  } = useQuery({
    queryKey: ["user_organizations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_organizations")
        .select("organization_id, role, organizations(id, name, primary_color, logo_url, plan_tier, plan_status)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    retry: 1,
  });


  // Selected org ID — persisted in localStorage
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selected_org_id");
    }
    return null;
  });

  // Auto-select first org if none selected
  useEffect(() => {
    if (memberships && memberships.length > 0) {
      const ids = memberships.map((m) => m.organization_id);
      if (!selectedOrgId || !ids.includes(selectedOrgId)) {
        const first = ids[0];
        setSelectedOrgId(first);
        localStorage.setItem("selected_org_id", first);
      }
    }
  }, [memberships, selectedOrgId]);

  const switchOrganization = useCallback(
    (orgId: string) => {
      setSelectedOrgId(orgId);
      localStorage.setItem("selected_org_id", orgId);
      // Invalidate org-scoped queries
      queryClient.invalidateQueries({ queryKey: ["bot_config"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads_count"] });
      queryClient.invalidateQueries({ queryKey: ["chat_history"] });
    },
    [queryClient]
  );

  const organizations = memberships?.map((m) => ({
    id: m.organization_id,
    role: m.role,
    ...(m.organizations as any),
  })) ?? [];

  const organization = organizations.find((o) => o.id === selectedOrgId) ?? null;
  const currentRole = organization?.role as "owner" | "member" | null ?? null;
  const isOwner = currentRole === "owner";

  // Keep profile query for backward compat
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return {
    profile,
    organization,
    organizationId: selectedOrgId,
    organizations,
    switchOrganization,
    currentRole,
    isOwner,
    membershipsLoading,
    membershipsError,
  };
}

