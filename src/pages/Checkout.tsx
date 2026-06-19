import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { liveUrlForCurrentPath, shouldUseLiveCheckoutOrigin } from "@/lib/live-site";

import { TIERS, annualMonthly, monthlyLookupKey, annualLookupKey } from "@/config/pricing";

type PlanInfo = { name: string; setup: number; monthly: number; priceId: string; cycle: "monthly" | "annual" };

const PLAN_LABELS: Record<string, PlanInfo> = {
  essential:          { name: TIERS.essential.name,             setup: TIERS.essential.setup, monthly: TIERS.essential.monthly,                                priceId: monthlyLookupKey("essential"), cycle: "monthly" },
  growth:             { name: TIERS.growth.name,                setup: TIERS.growth.setup,    monthly: TIERS.growth.monthly,                                   priceId: monthlyLookupKey("growth"),    cycle: "monthly" },
  premium:            { name: TIERS.premium.name,               setup: TIERS.premium.setup,   monthly: TIERS.premium.monthly,                                  priceId: monthlyLookupKey("premium"),   cycle: "monthly" },
  founder:            { name: TIERS.founder.name,               setup: TIERS.founder.setup,   monthly: TIERS.founder.monthly,                                  priceId: monthlyLookupKey("founder"),   cycle: "monthly" },
  "essential-annual": { name: `${TIERS.essential.name} (annual)`, setup: TIERS.essential.setup, monthly: annualMonthly(TIERS.essential.annualTotal ?? 0),       priceId: annualLookupKey("essential"),  cycle: "annual"  },
  "growth-annual":    { name: `${TIERS.growth.name} (annual)`,    setup: TIERS.growth.setup,    monthly: annualMonthly(TIERS.growth.annualTotal ?? 0),          priceId: annualLookupKey("growth"),     cycle: "annual"  },
  "premium-annual":   { name: `${TIERS.premium.name} (annual)`,   setup: TIERS.premium.setup,   monthly: annualMonthly(TIERS.premium.annualTotal ?? 0),         priceId: annualLookupKey("premium"),    cycle: "annual"  },
};

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const planKey = (searchParams.get("plan") ?? "growth").toLowerCase();
  const plan = PLAN_LABELS[planKey] ?? PLAN_LABELS.growth;

  useEffect(() => {
    if (shouldUseLiveCheckoutOrigin()) {
      window.location.replace(liveUrlForCurrentPath());
    }
  }, []);

  // Signup form state (only used when not logged in)
  const [signupForm, setSignupForm] = useState({
    business_name: "",
    full_name: "",
    email: "",
    password: "",
  });
  const [signingUp, setSigningUp] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // If already logged in, skip signup and go straight to checkout
  useEffect(() => {
    if (!authLoading && user) {
      setShowCheckout(true);
    }
  }, [authLoading, user]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningUp(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: signupForm.full_name,
            company_name: signupForm.business_name,
          },
        },
      });
      if (error) throw error;
      toast({ title: "Account created!", description: "Continuing to checkout..." });
      setShowCheckout(true);
    } catch (e: any) {
      toast({
        title: "Signup failed",
        description: e.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setSigningUp(false);
    }
  };

  const fetchClientSecret = async (): Promise<string> => {
    // Get fresh user + their org
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    if (!freshUser) throw new Error("Not authenticated");

    const { data: memberships } = await supabase
      .from("user_organizations")
      .select("organization_id, role")
      .eq("user_id", freshUser.id)
      .eq("role", "owner")
      .limit(1);

    const organizationId = memberships?.[0]?.organization_id;

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        priceId: plan.priceId,
        customerEmail: freshUser.email,
        organizationId,
        userId: freshUser.id,
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message ?? "Failed to start checkout");
    }
    return data.clientSecret;
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />

      <div className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to pricing
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-[1fr_400px]">
        {/* Left: signup form OR checkout */}
        <div className="min-h-[500px]">
          {!showCheckout ? (
            <Card>
              <CardHeader>
                <CardTitle>Create your account</CardTitle>
                <CardDescription>
                  Already have an account?{" "}
                  <Link to="/" className="text-primary underline">
                    Sign in
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business name</Label>
                    <Input
                      id="business_name"
                      required
                      value={signupForm.business_name}
                      onChange={(e) => setSignupForm({ ...signupForm, business_name: e.target.value })}
                      placeholder="Acme Plumbing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Your name</Label>
                    <Input
                      id="full_name"
                      required
                      value={signupForm.full_name}
                      onChange={(e) => setSignupForm({ ...signupForm, full_name: e.target.value })}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      placeholder="you@business.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      minLength={8}
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={signingUp}>
                    {signingUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Continue to payment
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
                <CardDescription>Secure checkout powered by Stripe</CardDescription>
              </CardHeader>
              <CardContent>
                <EmbeddedCheckoutProvider
                  stripe={getStripe()}
                  options={{ fetchClientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: order summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Order summary</CardTitle>
              <CardDescription>{plan.name} plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {plan.name} — first {plan.cycle === "annual" ? "year" : "month"}
                </span>
                <span className="font-medium">
                  ${plan.cycle === "annual" ? plan.monthly * 12 : plan.monthly}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">One-time setup</span>
                <span className="font-medium">${plan.setup}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold text-base">
                <span>Due today</span>
                <span>${(plan.cycle === "annual" ? plan.monthly * 12 : plan.monthly) + plan.setup}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                {plan.cycle === "annual"
                  ? `Then $${plan.monthly * 12}/year (works out to $${plan.monthly}/mo). Cancel anytime — keep access through your paid period.`
                  : `Then $${plan.monthly}/month. Cancel anytime — keep access through your paid period.`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
