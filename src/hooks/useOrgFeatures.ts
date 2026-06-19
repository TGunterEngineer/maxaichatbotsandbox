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

const ALL_ON: Record<OrgFeature, boolean> = {
  sms_alerts: true,
  after_hours: true,
  missed_chat_followup: true,
  weekly_digest: true,
  multilingual: true,
  booking_link: true,
  google_business: true,
  webhook: true,
  analytics_charts: true,
  white_label: true,
  multi_kb: true,
};

/**
 * Demo build: all add-on features are unlocked for every org.
 */
export function useOrgFeatures() {
  return {
    features: ALL_ON,
    isLoading: false,
  };
}

/**
 * Demo build: knowledge-base sources are unlimited.
 */
export function useKbLimit() {
  return {
    limit: 2_000_000_000,
    isLoading: false,
    isUnlimited: true,
  };
}
