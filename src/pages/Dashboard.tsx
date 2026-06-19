import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Users, MessageSquare, Code, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnalyticsCards } from "@/components/AnalyticsCards";
import { AnalyticsTrendChart } from "@/components/AnalyticsTrendChart";
import { LeadFunnelCard } from "@/components/LeadFunnelCard";


export default function Dashboard() {
  const { organization, organizationId, isOwner } = useOrganization();

  const { data: botConfig } = useQuery({
    queryKey: ["bot_config", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_configs")
        .select("*")
        .eq("organization_id", organizationId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: leadsCount } = useQuery({
    queryKey: ["leads_count", organizationId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!organizationId,
  });

  const { data: recentLeads } = useQuery({
    queryKey: ["recent_leads", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, email, created_at, source")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && !isOwner,
  });

  // Has the widget ever received a message? (used to show install nudge)
  const { data: chatActivity } = useQuery({
    queryKey: ["chat_activity_check", organizationId],
    queryFn: async () => {
      const { count } = await supabase
        .from("chat_history")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!);
      return count ?? 0;
    },
    enabled: !!organizationId && isOwner,
  });

  const showInstallNudge =
    isOwner &&
    !!botConfig?.primary_knowledge?.trim() &&
    chatActivity !== undefined &&
    chatActivity === 0;

  if (!organization) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isOwner ? "Welcome back" : organization.name}
          </h2>
          <p className="text-muted-foreground">
            {isOwner
              ? `${organization.name} — overview`
              : "Your chatbot dashboard"}
          </p>
        </div>
        {!isOwner && (
          <Badge variant="secondary" className="ml-auto">Client View</Badge>
        )}
      </div>

      {showInstallNudge && (
        <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Code className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold text-sm">Last step: install your widget</p>
              <p className="text-xs text-muted-foreground">
                Your bot is trained but hasn't been installed on a website yet. Grab the embed code and you're live.
              </p>
            </div>
            <Button asChild size="sm">
              <Link to="/install">
                Get install code
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className={`grid gap-4 ${isOwner ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsCount ?? 0}</div>
            <CardDescription>Captured from chatbot</CardDescription>
          </CardContent>
        </Card>

        {isOwner && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bot Name</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{botConfig?.bot_name ?? "—"}</div>
              <CardDescription>Active chatbot</CardDescription>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Welcome Message</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">{botConfig?.welcome_message ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversation analytics */}
      {isOwner && (
        <>
          <AnalyticsCards />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AnalyticsTrendChart />
            </div>
            <LeadFunnelCard />
          </div>
        </>
      )}

      {/* Client view: show recent leads inline */}
      {!isOwner && recentLeads && recentLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <CardDescription>Latest contacts captured by your chatbot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{lead.email ?? "Unknown"}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline" className="text-xs">{lead.source ?? "chatbot"}</Badge>
                    <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
