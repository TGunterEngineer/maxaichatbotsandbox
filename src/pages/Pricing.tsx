import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles, TrendingUp, Zap, ArrowRight, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

import { FounderOfferCard } from "@/components/FounderOfferCard";
import { ScarcityBanner } from "@/components/ScarcityBanner";
import { useFounderSpots } from "@/hooks/useFounderSpots";
import { TIERS as TIER_CONFIG, annualMonthly } from "@/config/pricing";
import { openLiveCheckout } from "@/lib/live-site";

type BillingCycle = "monthly" | "annual";

type Tier = {
  key: "essential" | "growth" | "premium";
  name: string;
  tagline: string;
  setup: number;
  monthly: number;
  annual: number; // displayed as "$X/mo billed yearly"
  seats: string;
  conversations: string;
  highlight?: boolean;
  features: string[];
  cta: string;
};

// Annual prices use the totals defined in src/config/pricing.ts (single source of truth).

const TIERS: Tier[] = [
  {
    key: "essential",
    name: TIER_CONFIG.essential.name,
    tagline: "For local service businesses just getting started.",
    setup: TIER_CONFIG.essential.setup,
    monthly: TIER_CONFIG.essential.monthly,
    annual: annualMonthly(TIER_CONFIG.essential.annualTotal ?? 0),
    seats: "1 user",
    conversations: "500 conversations / mo",
    features: [
      "Custom-trained AI chatbot, live in 10 minutes",
      "5 knowledge base sources (website, files, Google Business profile)",
      "Up to 500 conversations / mo",
      "Unlimited leads captured",
      "1 user seat",
      "Email lead alerts",
      "Booking link in chat",
      "Email support",
      "Monthly knowledge refresh",
    ],
    cta: "Start with Essential",
  },
  {
    key: "growth",
    name: TIER_CONFIG.growth.name,
    tagline: "Most popular — closes more leads, faster, around the clock.",
    setup: TIER_CONFIG.growth.setup,
    monthly: TIER_CONFIG.growth.monthly,
    annual: annualMonthly(TIER_CONFIG.growth.annualTotal ?? 0),
    seats: "3 users",
    conversations: "2,000 conversations / mo",
    highlight: true,
    features: [
      "Everything in Essential, plus:",
      "🔥 Instant SMS alerts on hot leads",
      "🌙 After-hours mode (timezone-aware)",
      "✉️ Auto missed-chat follow-up emails",
      "📊 Weekly performance digest email",
      "25 knowledge base sources",
      "Up to 2,000 conversations / mo",
      "3 user seats",
      "Bi-weekly bot tuning",
      "Priority support",
    ],
    cta: "Choose Growth",
  },
  {
    key: "premium",
    name: TIER_CONFIG.premium.name,
    tagline: "For high-volume teams that want a dedicated AI partner.",
    setup: TIER_CONFIG.premium.setup,
    monthly: TIER_CONFIG.premium.monthly,
    annual: annualMonthly(TIER_CONFIG.premium.annualTotal ?? 0),
    seats: "Unlimited users",
    conversations: "10,000 conversations / mo",
    features: [
      "Everything in Growth, plus:",
      "🌍 Multilingual support (100+ languages)",
      "🔌 Advanced webhooks (Slack / Teams / CRM)",
      "🎨 White-label: remove MaximumAI branding",
      "Unlimited knowledge base sources",
      "Up to 10,000 conversations / mo",
      "Unlimited user seats",
      "Multiple Google Business profiles",
      "Overage billed at $0.05 / conversation",
      "Weekly optimization sessions",
      "A/B testing of bot flows",
      "Dedicated Slack channel",
      "Quarterly strategy call",
      "Custom integrations (CRM, calendar)",
      "White-glove onboarding",
    ],
    cta: "Go Premium",
  },
];

const Pricing = () => {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [leadsPerMonth, setLeadsPerMonth] = useState(8);
  const [customerValue, setCustomerValue] = useState(750);
  const [conversionRate, setConversionRate] = useState(25);
  const [planMonthly, setPlanMonthly] = useState(TIER_CONFIG.growth.monthly);
  const { data: spots } = useFounderSpots();
  const founderOpen = spots?.isOpen ?? true;

  const roi = useMemo(() => {
    const customers = (leadsPerMonth * conversionRate) / 100;
    const revenue = customers * customerValue;
    const profit = revenue - planMonthly;
    const multiple = planMonthly > 0 ? revenue / planMonthly : 0;
    return {
      customers: customers.toFixed(1),
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      multiple: multiple.toFixed(1),
    };
  }, [leadsPerMonth, customerValue, conversionRate, planMonthly]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const handleSelectTier = (tier: Tier) => {
    const planSlug = cycle === "annual" ? `${tier.key}-annual` : tier.key;
    openLiveCheckout(planSlug);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <ScarcityBanner />
      {/* Background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500">
              <MessageCircle className="h-4 w-4 text-[#0a0a0f]" />
            </div>
            <span className="font-semibold tracking-tight">MaximumAI Consulting</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/5">
              Client login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-300">
          <Sparkles className="h-3 w-3" />
          AI receptionist for small business
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
          Stop losing leads at <br />
          <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            2 a.m. on a Tuesday.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
          A custom-trained AI chatbot that answers your customers 24/7, captures qualified leads,
          and routes hot prospects to your team — for the price of a single sale.
        </p>
      </section>

      {/* Founder offer banner — only while spots remain */}
      {founderOpen && (
        <section className="mx-auto max-w-7xl px-6 pb-12">
          <FounderOfferCard hideWhenClosed />
          <div className="mt-10 text-center">
            <p className="text-sm uppercase tracking-wider text-white/40">
              — or choose a regular plan —
            </p>
          </div>
        </section>
      )}

      {/* Billing cycle toggle */}
      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                cycle === "monthly"
                  ? "bg-white text-[#0a0a0f]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle("annual")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                cycle === "annual"
                  ? "bg-white text-[#0a0a0f]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Annual
              <span className="ml-2 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                Save 10%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => {
            const displayedMonthly = cycle === "annual" ? tier.annual : tier.monthly;
            return (
              <Card
                key={tier.name}
                className={`relative flex flex-col border-white/10 bg-white/[0.03] p-8 transition-all hover:bg-white/[0.05] ${
                  tier.highlight ? "ring-2 ring-emerald-400/60 md:scale-[1.03]" : ""
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 py-1 text-xs font-semibold text-[#0a0a0f]">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                <p className="mt-2 text-sm text-white/60">{tier.tagline}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/70">
                    <Users className="h-3 w-3" />
                    {tier.seats}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/70">
                    <MessageCircle className="h-3 w-3" />
                    {tier.conversations}
                  </span>
                </div>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold tracking-tight">
                      {formatCurrency(displayedMonthly)}
                    </span>
                    <span className="text-white/50">/ month</span>
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    {cycle === "annual"
                      ? `Billed ${formatCurrency(TIER_CONFIG[tier.key].annualTotal ?? 0)} yearly`
                      : "Billed monthly"}{" "}
                    + {formatCurrency(tier.setup)} one-time setup
                  </p>
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white/80">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectTier(tier)}
                  className={`mt-8 w-full ${
                    tier.highlight
                      ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  size="lg"
                >
                  {tier.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ROI calculator */}
      <section id="roi" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-300">
            <TrendingUp className="h-3 w-3" />
            ROI Calculator
          </div>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            See what you'd earn back.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Most clients break even after closing just one extra customer per month.
            Adjust the sliders to see your numbers.
          </p>
        </div>

        <Card className="mt-12 border-white/10 bg-white/[0.03] p-8 md:p-10">
          <div className="grid gap-10 md:grid-cols-2">
            {/* Inputs */}
            <div className="space-y-8">
              <div>
                <div className="flex items-baseline justify-between">
                  <Label className="text-white/80">New leads captured / month</Label>
                  <span className="text-2xl font-bold text-emerald-300">{leadsPerMonth}</span>
                </div>
                <Slider
                  value={[leadsPerMonth]}
                  onValueChange={(v) => setLeadsPerMonth(v[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="mt-4"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <Label className="text-white/80">Average customer value</Label>
                  <span className="text-2xl font-bold text-emerald-300">
                    {formatCurrency(customerValue)}
                  </span>
                </div>
                <Input
                  type="number"
                  value={customerValue}
                  onChange={(e) => setCustomerValue(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-4 border-white/10 bg-white/5 text-white"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between">
                  <Label className="text-white/80">Lead → customer conversion</Label>
                  <span className="text-2xl font-bold text-emerald-300">{conversionRate}%</span>
                </div>
                <Slider
                  value={[conversionRate]}
                  onValueChange={(v) => setConversionRate(v[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="mt-4"
                />
              </div>

              <div>
                <Label className="mb-3 block text-white/80">Your plan</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIERS.map((t) => {
                    const monthlyForCalc = cycle === "annual" ? t.annual : t.monthly;
                    return (
                      <button
                        key={t.name}
                        onClick={() => setPlanMonthly(monthlyForCalc)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                          planMonthly === monthlyForCalc
                            ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                      >
                        {t.name}
                        <div className="text-xs text-white/50">${monthlyForCalc}/mo</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-8 ring-1 ring-white/10">
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-white/60">New customers / month</div>
                  <div className="mt-1 text-4xl font-bold">{roi.customers}</div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <div className="text-sm text-white/60">New revenue / month</div>
                  <div className="mt-1 text-4xl font-bold text-emerald-300">
                    {formatCurrency(roi.revenue)}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <div className="text-sm text-white/60">Cost of plan</div>
                  <div className="mt-1 text-2xl font-semibold text-white/80">
                    −{formatCurrency(planMonthly)}
                  </div>
                </div>

                <div className="rounded-xl bg-[#0a0a0f]/60 p-5 ring-1 ring-emerald-400/30">
                  <div className="text-sm text-white/60">Net profit / month</div>
                  <div className="mt-1 text-5xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                    {formatCurrency(roi.profit)}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-300">
                    <Zap className="h-3 w-3" />
                    {roi.multiple}× return on investment
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24 text-center">
        <Card className="border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-10">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to never miss a lead again?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Try the bot with sample data first — no signup required. Then pick the plan that fits.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/demo">
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
              >
                Try the demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/5">
                Client login
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/40">
        © {new Date().getFullYear()} MaximumAI Consulting. ·{" "}
        <Link to="/privacy" className="hover:text-white/70">Privacy</Link> ·{" "}
        <Link to="/terms" className="hover:text-white/70">Terms</Link> ·{" "}
        <Link to="/refunds" className="hover:text-white/70">Refunds & Cancellations</Link>
      </footer>
    </div>
  );
};

export default Pricing;
