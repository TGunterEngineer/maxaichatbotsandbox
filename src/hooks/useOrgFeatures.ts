import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export type OrgFeature =
  | "sms_alerts"
  | "after_hours"
  | "missed_chat_followup"
  | "weekly_digest"
  | "multilingual"
  | "booking_link"
  | "google_business"
  | "webhook"
  | "analytics_charts"
  | "white_label"
  | "multi_kb";

const FEATURES: OrgFeature[] = [
  "sms_alerts",
  "after_hours",
  "missed_chat_followup",
  "weekly_digest",
  "multilingual",
  "booking_link",
  "google_business",
  "webhook",
  "analytics_charts",
  "white_label",
  "multi_kb",
];

const DEFAULT: Record<OrgFeature, boolean> = {
  sms_alerts: false,
  after_hours: false,
  missed_chat_followup: false,
  weekly_digest: false,
  multilingual: false,
  booking_link: false,
  google_business: false,
  webhook: false,
  analytics_charts: false,
  white_label: false,
  multi_kb: false,
};

/**
 * Returns a record of which add-on features the current org's plan unlocks.
 * Single source of truth = the `org_has_feature` SQL function.
 */
export function useOrgFeatures() {
  const { organizationId } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["org_features", organizationId],
    queryFn: async () => {
      const entries = await Promise.all(
        FEATURES.map(async (feature) => {
          const { data } = await supabase.rpc("org_has_feature", {
            _org_id: organizationId!,
            _feature: feature,
          });
          return [feature, data === true] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<OrgFeature, boolean>;
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  return {
    features: data ?? DEFAULT,
    isLoading,
  };
}

/**
 * KB source limit for the current org's plan.
 */
export function useKbLimit() {
  const { organizationId } = useOrganization();
  const { data, isLoading } = useQuery({
    queryKey: ["kb_limit", organizationId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_org_kb_limit", { _org_id: organizationId! });
      return (data as number | null) ?? 1;
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });
  return { limit: data ?? 1, isLoading, isUnlimited: (data ?? 0) >= 2_000_000_000 };
}

