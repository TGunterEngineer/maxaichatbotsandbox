import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Zap, TrendingUp, ArrowUpRight, Users, PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";

const PLAN_LABELS: Record<string, string> = {
  essential: "Essential",
  growth: "Growth",
  premium: "Premium",
  founder: "Founder",
};

const TOPUP_AMOUNT = 500;
const TOPUP_PRICE = 25;

export function UsageCard() {
  const { organization, organizationId } = useOrganization();
  const { toast } = useToast();
  const [topupOpen, setTopupOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["usage", organizationId],
    queryFn: async () => {
      const period = new Date();
      period.setUTCDate(1);
      period.setUTCHours(0, 0, 0, 0);
      const periodStr = period.toISOString().slice(0, 10);

      const [quotaRes, usageRes, leadUsageRes, seatsRes, counterRes] = await Promise.all([
        supabase.rpc("get_org_quota", { _org_id: organizationId! }),
        supabase.rpc("get_org_usage", { _org_id: organizationId! }),
        supabase.rpc("get_org_leads_usage", { _org_id: organizationId! }),
        supabase.rpc("get_org_seats", { _org_id: organizationId! }).single(),
        supabase
          .from("usage_counters")
          .select("bonus_conversations")
          .eq("organization_id", organizationId!)
          .eq("period_start", periodStr)
          .maybeSingle(),
      ]);
      return {
        quota: (quotaRes.data as number | null) ?? 0,
        usage: (usageRes.data as number | null) ?? 0,
        leads: (leadUsageRes.data as number | null) ?? 0,
        seatsUsed: ((seatsRes.data as any)?.used as number | null) ?? 0,
        seatLimit: ((seatsRes.data as any)?.seat_limit as number | null) ?? 1,
        bonus: ((counterRes.data as any)?.bonus_conversations as number | null) ?? 0,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 60_000,
  });

  const fetchTopupClientSecret = async (): Promise<string> => {
    const { data: res, error } = await supabase.functions.invoke("create-conversation-topup", {
      body: {
        organizationId,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&topup=1`,
      },
    });
    if (error || !res?.clientSecret) {
      const msg = error?.message ?? "Failed to start top-up checkout";
      toast({ title: "Top-up unavailable", description: msg, variant: "destructive" });
      throw new Error(msg);
    }
    return res.clientSecret;
  };

  if (isLoading || !data) {
    return <Skeleton className="h-40 w-full" />;
  }

  const isUnlimited = data.quota >= 2_000_000_000;
  const percent = isUnlimited ? 0 : Math.min(100, Math.round((data.usage / Math.max(data.quota, 1)) * 100));
  const planTier = (organization as any)?.plan_tier ?? "growth";
  const isAtLimit = !isUnlimited && data.usage >= data.quota;
  const isWarning = !isUnlimited && percent >= 80 && !isAtLimit;
  const showTopup = !isUnlimited && percent >= 90;

  const seatsUnlimited = data.seatLimit >= 2_000_000_000;
  const seatsAtLimit = !seatsUnlimited && data.seatsUsed >= data.seatLimit;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Monthly Usage
            </CardTitle>
            <CardDescription className="mt-1">
              Resets on the 1st of each month
            </CardDescription>
          </div>
          <Badge variant={planTier === "premium" ? "default" : "secondary"} className="gap-1">
            <Zap className="h-3 w-3" />
            {PLAN_LABELS[planTier] ?? planTier}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {data.usage.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}/ {isUnlimited ? "∞" : data.quota.toLocaleString()} conversations
                </span>
              </div>
              {!isUnlimited && (
                <span className={`text-sm font-medium ${isAtLimit ? "text-destructive" : isWarning ? "text-amber-500" : "text-muted-foreground"}`}>
                  {percent}%
                </span>
              )}
            </div>
            {!isUnlimited && (
              <Progress
                value={percent}
                className={isAtLimit ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : ""}
              />
            )}
            {data.bonus > 0 && (
              <p className="text-xs text-muted-foreground">
                Includes <span className="font-medium text-foreground">+{data.bonus.toLocaleString()}</span> bonus
                conversation{data.bonus === 1 ? "" : "s"} from top-ups this month.
              </p>
            )}
          </div>

          <div className="space-y-1 pt-3 border-t">
            <div className="text-2xl font-bold">
              {data.leads.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground"> leads captured</span>
            </div>
            <p className="text-xs text-muted-foreground">Unlimited on every plan</p>
          </div>

          <div className="space-y-1 pt-3 border-t">
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              {data.seatsUsed.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground">
                {" "}/ {seatsUnlimited ? "∞" : data.seatLimit} user seats
              </span>
            </div>
            {seatsAtLimit && !seatsUnlimited && (
              <p className="text-xs text-amber-500">
                Seat limit reached — upgrade to invite more teammates.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {showTopup && (
        <Alert>
          <PlusCircle className="h-4 w-4" />
          <AlertTitle>Need more conversations this month?</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              You've used {percent}% of your quota. Add {TOPUP_AMOUNT.toLocaleString()} extra
              conversations for a one-time ${TOPUP_PRICE} — applied immediately, valid through
              the end of this billing period.
            </p>
            <Button size="sm" onClick={() => setTopupOpen(true)}>
              Buy {TOPUP_AMOUNT} conversations · ${TOPUP_PRICE}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isWarning && !showTopup && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>You're approaching your monthly limit</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              You've used {percent}% of your {PLAN_LABELS[planTier]} plan's conversations.
              Consider upgrading to avoid service interruption.
            </p>
            {planTier !== "premium" && (
              <Button asChild size="sm" variant="outline">
                <Link to="/pricing">
                  Upgrade plan
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isAtLimit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Monthly limit reached</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Your chatbot has paused new conversations until the limit resets on the 1st.
              Buy a top-up to keep capturing leads now, or upgrade your plan.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setTopupOpen(true)}>
                Buy {TOPUP_AMOUNT} conversations · ${TOPUP_PRICE}
              </Button>
              {planTier !== "premium" && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/pricing">
                    Upgrade plan
                    <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={topupOpen} onOpenChange={(open) => { setTopupOpen(open); if (!open) refetch(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buy a conversation top-up</DialogTitle>
            <DialogDescription>
              {TOPUP_AMOUNT.toLocaleString()} extra conversations for ${TOPUP_PRICE}, added to your
              current month. Secure checkout powered by Stripe.
            </DialogDescription>
          </DialogHeader>
          {topupOpen && (
            <EmbeddedCheckoutProvider
              stripe={getStripe()}
              options={{ fetchClientSecret: fetchTopupClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
