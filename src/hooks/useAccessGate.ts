import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";

const ACCESS_GATE_TIMEOUT_MS = 7_000;

/**
 * Single source of truth for "is this customer allowed past the demo paywall?"
 *
 * Access is granted when `organizations.plan_status === 'active'` or the user
 * is a platform admin. The hook also enforces a hard 7s timeout so a stuck
 * TanStack Query never leaves the user staring at a blank spinner.
 */
export function useAccessGate() {
  const { user, loading: authLoading } = useAuth();
  const {
    organization,
    membershipsLoading,
    membershipsError,
  } = useOrganization();
  const queryClient = useQueryClient();

  const {
    data: isPlatformAdmin,
    isLoading: roleLoading,
    error: roleError,
  } = useQuery({
    queryKey: ["access_gate_is_admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
    retry: 1,
  });

  const planActive = organization?.plan_status === "active";
  const hasPaidAccess = !!isPlatformAdmin || planActive;

  const naturalLoading =
    authLoading ||
    (!!user && membershipsLoading) ||
    (!!user && roleLoading);

  const [timedOut, setTimedOut] = useState(false);
  const toastedRef = useRef(false);

  // Reset timeout state if loading completes naturally or user logs out.
  useEffect(() => {
    if (!naturalLoading) {
      setTimedOut(false);
      toastedRef.current = false;
    }
  }, [naturalLoading]);

  useEffect(() => {
    if (!naturalLoading) return;
    const id = window.setTimeout(() => {
      setTimedOut(true);
      if (!toastedRef.current) {
        toastedRef.current = true;
        toast.error("Secure access verification timed out. Please refresh the page.");
      }
    }, ACCESS_GATE_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [naturalLoading]);

  const queryError = membershipsError ?? roleError ?? null;

  // Surface query errors once.
  useEffect(() => {
    if (queryError && !toastedRef.current) {
      toastedRef.current = true;
      toast.error("Secure access verification timed out. Please refresh the page.");
    }
  }, [queryError]);

  const retry = useCallback(async () => {
    setTimedOut(false);
    toastedRef.current = false;
    await supabase.auth.getSession();
    await queryClient.invalidateQueries({ queryKey: ["user_organizations"] });
    await queryClient.invalidateQueries({ queryKey: ["access_gate_is_admin"] });
  }, [queryClient]);

  const hasError = timedOut || !!queryError;
  const loading = naturalLoading && !hasError;

  return {
    hasPaidAccess,
    isPlatformAdmin: !!isPlatformAdmin,
    loading,
    hasError,
    errorMessage: hasError
      ? "Secure access verification timed out. Please refresh the page."
      : null,
    retry,
  };
}
