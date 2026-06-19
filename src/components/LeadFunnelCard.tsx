import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter } from "lucide-react";

function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function LeadFunnelCard() {
  const { organizationId } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard_funnel", organizationId],
    queryFn: async () => {
      const monthStart = startOfMonthUTC(new Date()).toISOString();

      const [chatRes, leadsRes, hotRes] = await Promise.all([
        supabase
          .from("chat_history")
          .select("session_id")
          .eq("organization_id", organizationId!)
          .gte("created_at", monthStart)
          .limit(20000),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId!)
          .gte("created_at", monthStart),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId!)
          .gte("created_at", monthStart)
          .ilike("lead_notes", "%[HOT]%"),
      ]);
      if (chatRes.error) throw chatRes.error;
      if (leadsRes.error) throw leadsRes.error;
      if (hotRes.error) throw hotRes.error;

      const conversations = new Set((chatRes.data ?? []).map((r) => r.session_id)).size;
      const leads = leadsRes.count ?? 0;
      const hot = hotRes.count ?? 0;

      return { conversations, leads, hot };
    },
    enabled: !!organizationId,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return <Skeleton className="h-[220px] w-full" />;
  }

  const max = Math.max(data.conversations, 1);
  const leadRate = data.conversations > 0 ? Math.round((data.leads / data.conversations) * 100) : 0;
  const hotRate = data.leads > 0 ? Math.round((data.hot / data.leads) * 100) : 0;

  const steps = [
    {
      label: "Conversations",
      value: data.conversations,
      pct: 100,
      width: 100,
      sub: "Unique chat sessions this month",
      color: "bg-primary",
    },
    {
      label: "Leads captured",
      value: data.leads,
      pct: leadRate,
      width: Math.max((data.leads / max) * 100, data.leads > 0 ? 8 : 0),
      sub: `${leadRate}% of conversations become leads`,
      color: "bg-primary/70",
    },
    {
      label: "Hot leads",
      value: data.hot,
      pct: hotRate,
      width: Math.max((data.hot / max) * 100, data.hot > 0 ? 6 : 0),
      sub: `${hotRate}% of leads are high-intent`,
      color: "bg-primary/40",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Lead funnel
        </CardTitle>
        <CardDescription>This month's conversion path</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((s) => (
          <div key={s.label} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="font-mono tabular-nums">{s.value.toLocaleString()}</span>
            </div>
            <div className="h-7 w-full rounded-md bg-muted overflow-hidden">
              <div
                className={`h-full ${s.color} transition-all`}
                style={{ width: `${s.width}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
