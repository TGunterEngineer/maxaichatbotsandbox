import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, TrendingUp, TrendingDown, Minus, MessagesSquare } from "lucide-react";

function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function AnalyticsCards() {
  const { organizationId } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard_analytics", organizationId],
    queryFn: async () => {
      const now = new Date();
      const thisMonthStart = startOfMonthUTC(now);
      const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

      // Pull all messages since the start of last month — small enough for a client query,
      // and lets us derive conversations + avg messages without N RPCs.
      const { data: rows, error } = await supabase
        .from("chat_history")
        .select("session_id, created_at")
        .eq("organization_id", organizationId!)
        .gte("created_at", lastMonthStart.toISOString())
        .order("created_at", { ascending: true })
        .limit(10000);
      if (error) throw error;

      const thisMonth = new Map<string, number>();
      const lastMonth = new Map<string, number>();
      for (const r of rows ?? []) {
        const ts = new Date(r.created_at);
        const bucket = ts >= thisMonthStart ? thisMonth : lastMonth;
        bucket.set(r.session_id, (bucket.get(r.session_id) ?? 0) + 1);
      }

      const thisCount = thisMonth.size;
      const lastCount = lastMonth.size;
      const thisMessages = Array.from(thisMonth.values()).reduce((a, b) => a + b, 0);
      const avgMessages = thisCount > 0 ? thisMessages / thisCount : 0;

      let trendPct: number | null = null;
      if (lastCount > 0) {
        trendPct = Math.round(((thisCount - lastCount) / lastCount) * 100);
      } else if (thisCount > 0) {
        trendPct = null; // no baseline to compare against
      } else {
        trendPct = 0;
      }

      return {
        conversationsThisMonth: thisCount,
        conversationsLastMonth: lastCount,
        avgMessages,
        trendPct,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  const TrendIcon =
    data.trendPct === null ? Minus : data.trendPct > 0 ? TrendingUp : data.trendPct < 0 ? TrendingDown : Minus;
  const trendColor =
    data.trendPct === null
      ? "text-muted-foreground"
      : data.trendPct > 0
      ? "text-emerald-500"
      : data.trendPct < 0
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Conversations this month</CardTitle>
          <MessagesSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.conversationsThisMonth.toLocaleString()}</div>
          <CardDescription>Unique chat sessions since the 1st</CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">vs. last month</CardTitle>
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${trendColor}`}>
            {data.trendPct === null
              ? "New"
              : `${data.trendPct > 0 ? "+" : ""}${data.trendPct}%`}
          </div>
          <CardDescription>
            {data.conversationsLastMonth.toLocaleString()} last month
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Avg. messages / chat</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.avgMessages.toFixed(1)}</div>
          <CardDescription>Across this month's conversations</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
