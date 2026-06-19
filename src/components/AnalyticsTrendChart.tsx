import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";

const chartConfig = {
  conversations: { label: "Conversations", color: "hsl(var(--primary))" },
  leads: { label: "Leads", color: "hsl(var(--chart-2, 142 76% 36%))" },
} satisfies ChartConfig;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function AnalyticsTrendChart() {
  const { organizationId } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard_trend", organizationId],
    queryFn: async () => {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - 29);
      since.setUTCHours(0, 0, 0, 0);

      const [chatRes, leadRes] = await Promise.all([
        supabase
          .from("chat_history")
          .select("session_id, created_at")
          .eq("organization_id", organizationId!)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true })
          .limit(20000),
        supabase
          .from("leads")
          .select("created_at")
          .eq("organization_id", organizationId!)
          .gte("created_at", since.toISOString())
          .limit(5000),
      ]);
      if (chatRes.error) throw chatRes.error;
      if (leadRes.error) throw leadRes.error;

      // Build 30 daily buckets
      const buckets: Record<string, { date: string; conversations: number; leads: number }> = {};
      for (let i = 0; i < 30; i++) {
        const d = new Date(since);
        d.setUTCDate(since.getUTCDate() + i);
        buckets[dayKey(d)] = { date: dayKey(d), conversations: 0, leads: 0 };
      }

      // Count unique sessions per day
      const seenSession = new Set<string>(); // session+day combo
      for (const r of chatRes.data ?? []) {
        const day = dayKey(new Date(r.created_at));
        const key = `${r.session_id}|${day}`;
        if (seenSession.has(key)) continue;
        seenSession.add(key);
        if (buckets[day]) buckets[day].conversations += 1;
      }

      for (const l of leadRes.data ?? []) {
        const day = dayKey(new Date(l.created_at));
        if (buckets[day]) buckets[day].leads += 1;
      }

      return Object.values(buckets);
    },
    enabled: !!organizationId,
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Last 30 days
        </CardTitle>
        <CardDescription>Daily conversations and leads captured</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
              <defs>
                <linearGradient id="fillConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-conversations)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-conversations)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-leads)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-leads)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                }
              />
              <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(v) =>
                      new Date(v as string).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="conversations"
                type="monotone"
                fill="url(#fillConv)"
                stroke="var(--color-conversations)"
                strokeWidth={2}
              />
              <Area
                dataKey="leads"
                type="monotone"
                fill="url(#fillLeads)"
                stroke="var(--color-leads)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
