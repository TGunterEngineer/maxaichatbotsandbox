import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useAccessGate } from "@/hooks/useAccessGate";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import { ChatWidget } from "@/components/ChatWidget";

const Index = () => {
  const { user, loading } = useAuth();
  const { organizationId, isOwner } = useOrganization();
  const { hasPaidAccess, loading: gateLoading } = useAccessGate();
  const navigate = useNavigate();

  // Logged-in but no paid subscription → only the demo (and pricing/checkout) are reachable.
  useEffect(() => {
    if (!user || loading || gateLoading) return;
    if (!hasPaidAccess) {
      navigate("/demo", { replace: true });
    }
  }, [user, loading, gateLoading, hasPaidAccess, navigate]);

  // Onboarding redirect is only relevant for paid customers.
  const { data: botConfig } = useQuery({
    queryKey: ["bot_config_onboarding_check", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_configs")
        .select("primary_knowledge")
        .eq("organization_id", organizationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && isOwner && hasPaidAccess,
  });

  useEffect(() => {
    if (!user || !organizationId || !isOwner || !botConfig || !hasPaidAccess) return;
    const hasKnowledge = !!botConfig.primary_knowledge?.trim();
    const skipped = localStorage.getItem(`onboarding_skipped_${organizationId}`) === "1";
    if (!hasKnowledge && !skipped) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, organizationId, isOwner, botConfig, hasPaidAccess, navigate]);

  // Public landing for anonymous visitors.
  if (!user) return <Landing />;

  // Logged in but not yet paid → render nothing while the redirect to /demo runs.
  if (!hasPaidAccess) return null;

  return (
    <DashboardLayout>
      <Dashboard />
      {organizationId && <ChatWidget organizationId={organizationId} />}
    </DashboardLayout>
  );
};

export default Index;

