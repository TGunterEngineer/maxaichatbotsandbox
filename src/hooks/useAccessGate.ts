import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Demo build: every authenticated user has full access to the app.
 * The pricing/billing/subscription paywall has been removed.
 */
export function useAccessGate() {
  const { loading } = useAuth();

  const retry = useCallback(async () => {
    // No-op — access is always granted in this build.
  }, []);

  return {
    hasPaidAccess: true,
    isPlatformAdmin: false,
    loading,
    hasError: false,
    errorMessage: null as string | null,
    retry,
  };
}
