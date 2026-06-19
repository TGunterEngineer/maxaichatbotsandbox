import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizationId, isOwner } = useOrganization();
  const [autoRedirect, setAutoRedirect] = useState(true);

  useEffect(() => {
    try {
      sessionStorage.setItem("checkout_just_returned", "1");
    } catch {}
    queryClient.invalidateQueries({ queryKey: ["user_organizations"] });
    queryClient.invalidateQueries({ queryKey: ["usage"] });
    queryClient.invalidateQueries({ queryKey: ["billing_status"] });
  }, [queryClient]);

  // Auto-route owners into the onboarding wizard if their bot has no knowledge yet.
  // Members (invited teammates) just go to the dashboard.
  useEffect(() => {
    if (!autoRedirect || !user || !organizationId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!isOwner) {
        if (!cancelled) navigate("/", { replace: true });
        return;
      }
      const { data } = await supabase
        .from("bot_configs")
        .select("primary_knowledge")
        .eq("organization_id", organizationId)
        .maybeSingle();
      const hasKnowledge = !!data?.primary_knowledge?.trim();
      if (!cancelled) {
        navigate(hasKnowledge ? "/install" : "/onboarding", { replace: true });
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [autoRedirect, user, organizationId, isOwner, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Payment received! 🎉</CardTitle>
          <CardDescription>
            Your account is now active. We've sent a receipt to your email.
            {autoRedirect && (
              <span className="block mt-2 text-xs flex items-center justify-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Taking you to setup…
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => {
              setAutoRedirect(false);
              navigate("/onboarding", { replace: true });
            }}
          >
            Start setup now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full"
            onClick={() => setAutoRedirect(false)}
          >
            <Link to="/">Skip — go to dashboard</Link>
          </Button>
          {sessionId && (
            <p className="text-xs text-center text-muted-foreground font-mono">
              Ref: {sessionId.slice(0, 20)}...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
