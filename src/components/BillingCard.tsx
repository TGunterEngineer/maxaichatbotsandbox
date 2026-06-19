import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "react-router-dom";
import { CreditCard, ExternalLink, Loader2, ArrowUpDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getStripeEnvironment } from "@/lib/stripe-env";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type PlanTier = "essential" | "growth" | "premium";

const PLANS: { tier: PlanTier; name: string; priceId: string; monthly: number; blurb: string }[] = [
  { tier: "essential", name: "Essential", priceId: "essential_monthly", monthly: 149, blurb: "500 conversations / mo" },
  { tier: "growth", name: "Growth", priceId: "growth_monthly", monthly: 297, blurb: "2,000 convos · SMS · After-hours · Digest" },
  { tier: "premium", name: "Premium", priceId: "premium_monthly", monthly: 597, blurb: "10,000 convos · Multilingual · Custom integrations" },
];

export function BillingCard() {
  const { organizationId, isOwner } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [opening, setOpening] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<PlanTier | null>(null);
  const [pendingPlan, setPendingPlan] = useState<(typeof PLANS)[number] | null>(null);
  const pollRef = useRef<number | null>(null);

  const { data: billing } = useQuery({
    queryKey: ["billing_status", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_org_billing_status", {
        _org_id: organizationId!,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!organizationId && isOwner,
  });

  // Realtime: refresh when this org's subscription row changes
  useEffect(() => {
    if (!organizationId || !isOwner) return;
    const channel = supabase
      .channel(`subscriptions:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["billing_status", organizationId] });
          queryClient.invalidateQueries({ queryKey: ["user_organizations"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, isOwner, queryClient]);

  // Polling fallback right after returning from checkout — webhook can lag a few seconds
  useEffect(() => {
    if (!organizationId || !isOwner) return;
    const justReturned =
      typeof window !== "undefined" &&
      sessionStorage.getItem("checkout_just_returned") === "1";
    if (!justReturned) return;

    sessionStorage.removeItem("checkout_just_returned");
    const startedAt = Date.now();
    const tick = () => {
      queryClient.invalidateQueries({ queryKey: ["billing_status", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["user_organizations"] });
      if (Date.now() - startedAt > 30_000) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    pollRef.current = window.setInterval(tick, 2000);
    tick();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [organizationId, isOwner, queryClient, location.pathname]);

  if (!isOwner) return null;

  const openPortal = async () => {
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          organizationId,
          returnUrl: window.location.href,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.url) throw new Error(error?.message ?? "Could not open billing");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast({
        title: "Couldn't open billing",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setOpening(false);
    }
  };

  const changePlan = async (target: PlanTier, priceId: string) => {
    setSwitchingTo(target);
    try {
      const { data, error } = await supabase.functions.invoke("change-subscription", {
        body: {
          organizationId,
          newPriceId: priceId,
          environment: getStripeEnvironment(),
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Plan updated",
        description: `You're now on the ${target.charAt(0).toUpperCase() + target.slice(1)} plan. Proration will appear on your next invoice.`,
      });
      setPlanDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["billing_status", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["user_organizations"] });
    } catch (e: any) {
      toast({
        title: "Couldn't change plan",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSwitchingTo(null);
    }
  };

  const periodEnd = billing?.current_period_end
    ? new Date(billing.current_period_end as string).toLocaleDateString()
    : null;

  const currentTier = (billing?.plan_tier as PlanTier | undefined) ?? null;
  const isPastDue = billing?.plan_status === "past_due";
  const isCanceling = billing?.cancel_at_period_end === true;

  return (
    <div className="space-y-3">
      {isPastDue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>
            Your last payment didn't go through. Update your card before retries run out — your bot is still working for now.
          </AlertDescription>
        </Alert>
      )}

      {isCanceling && periodEnd && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Subscription canceling</AlertTitle>
          <AlertDescription>
            Your plan is set to cancel on {periodEnd}. You'll keep access until then.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Billing
            </CardTitle>
            <CardDescription className="mt-1">
              {billing?.has_subscription
                ? `Next billed on ${periodEnd ?? "—"}`
                : "No active subscription"}
            </CardDescription>
          </div>
          <Badge variant={isPastDue ? "destructive" : billing?.plan_status === "active" ? "default" : "secondary"}>
            {billing?.plan_status ?? "—"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {billing?.has_subscription ? (
            <>
              <Button
                onClick={() => setPlanDialogOpen(true)}
                size="sm"
                disabled={isPastDue}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Change plan
              </Button>
              <Button onClick={openPortal} disabled={opening} variant="outline" size="sm">
                {opening ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Manage billing
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/pricing">Choose a plan</Link>
            </Button>
          )}
        </CardContent>
        {billing?.has_subscription && (
          <CardContent className="pt-0 -mt-2 text-xs text-muted-foreground">
            Cancel anytime from <button onClick={openPortal} className="underline hover:text-foreground">Manage billing</button>. See our{" "}
            <Link to="/refunds" className="underline hover:text-foreground">refund &amp; cancellation policy</Link>.
          </CardContent>
        )}
      </Card>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change your plan</DialogTitle>
            <DialogDescription>
              Switching takes effect immediately. You'll see a prorated charge or credit on your next invoice — no setup fee on changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {PLANS.map((p) => {
              const isCurrent = currentTier === p.tier;
              const isLoading = switchingTo === p.tier;
              return (
                <div
                  key={p.tier}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isCurrent ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {isCurrent && (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="h-3 w-3" />
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      ${p.monthly}/mo · {p.blurb}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || !!switchingTo}
                    onClick={() => setPendingPlan(p)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      "Current"
                    ) : currentTier && PLANS.findIndex((x) => x.tier === p.tier) > PLANS.findIndex((x) => x.tier === currentTier) ? (
                      "Upgrade"
                    ) : (
                      "Downgrade"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlanDialogOpen(false)} disabled={!!switchingTo}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingPlan}
        onOpenChange={(open) => {
          if (!open && !switchingTo) setPendingPlan(null);
        }}
      >
        <AlertDialogContent>
          {pendingPlan && (() => {
            const current = PLANS.find((p) => p.tier === currentTier) ?? null;
            const target = pendingPlan;
            const currentIdx = current ? PLANS.findIndex((p) => p.tier === current.tier) : -1;
            const targetIdx = PLANS.findIndex((p) => p.tier === target.tier);
            const direction = currentIdx === -1
              ? "Switch"
              : targetIdx > currentIdx
              ? "Upgrade"
              : "Downgrade";
            const diff = current ? target.monthly - current.monthly : null;
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {direction} to {target.name}?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <div className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Current plan</span>
                          <span className="font-medium text-foreground">
                            {current ? `${current.name} — $${current.monthly}/mo` : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">New plan</span>
                          <span className="font-medium text-foreground">
                            {target.name} — ${target.monthly}/mo
                          </span>
                        </div>
                        {diff !== null && diff !== 0 && (
                          <div className="flex items-center justify-between text-sm border-t pt-2">
                            <span className="text-muted-foreground">Monthly change</span>
                            <span className={`font-semibold ${diff > 0 ? "text-foreground" : "text-foreground"}`}>
                              {diff > 0 ? "+" : ""}${diff}/mo
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm">
                        Takes effect immediately. You'll see a prorated{" "}
                        {diff !== null && diff > 0 ? "charge" : "credit"} on your next
                        invoice — no setup fee on plan changes.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={!!switchingTo}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!!switchingTo}
                    onClick={async (e) => {
                      e.preventDefault();
                      await changePlan(target.tier, target.priceId);
                      setPendingPlan(null);
                    }}
                  >
                    {switchingTo ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating…
                      </>
                    ) : (
                      `Confirm ${direction.toLowerCase()}`
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
