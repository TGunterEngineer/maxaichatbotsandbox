import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import { ChatWidget } from "@/components/ChatWidget";

const Index = () => {
  const { user, loading } = useAuth();
  const { organizationId, isOwner } = useOrganization();
  const navigate = useNavigate();

  // Onboarding redirect for new owners with no knowledge configured yet.
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
    enabled: !!organizationId && isOwner,
  });

  useEffect(() => {
    if (!user || !organizationId || !isOwner || !botConfig) return;
    const hasKnowledge = !!botConfig.primary_knowledge?.trim();
    const skipped = localStorage.getItem(`onboarding_skipped_${organizationId}`) === "1";
    if (!hasKnowledge && !skipped) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, organizationId, isOwner, botConfig, navigate]);

  // Public landing for anonymous visitors.
  if (loading) return null;
  if (!user) return <Landing />;

  return (
    <DashboardLayout>
      <Dashboard />
      {organizationId && <ChatWidget organizationId={organizationId} />}
    </DashboardLayout>
  );
};

export default Index;
