import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  MessageCircle,
  Sparkles,
  Zap,
  Clock,
  Target,
  BarChart3,
  Globe,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FounderOfferCard } from "@/components/FounderOfferCard";
import { ScarcityBanner } from "@/components/ScarcityBanner";
import { useFounderSpots } from "@/hooks/useFounderSpots";
import { TIERS } from "@/config/pricing";
import { liveCheckoutUrl, openLiveCheckout } from "@/lib/live-site";

const FEATURES = [
  {
    icon: Bot,
    title: "Trained on your website",
    desc: "Paste your URL, we scrape it, your bot speaks fluently about your business in minutes.",
  },
  {
    icon: Clock,
    title: "Answers 24/7",
    desc: "Customers get instant replies at 2 a.m. on a Tuesday — no missed leads, ever.",
  },
  {
    icon: Target,
    title: "Captures qualified leads",
    desc: "Detects intent, grabs name + email + phone, and routes hot prospects to your inbox.",
  },
  {
    icon: BarChart3,
    title: "Analytics that prove ROI",
    desc: "Conversation volume, lead funnel, and the top questions visitors actually ask.",
  },
  {
    icon: Globe,
    title: "Embed anywhere in 1 line",
    desc: "Drop a single script tag on your site. Works on WordPress, Shopify, Webflow, custom HTML.",
  },
  {
    icon: Zap,
    title: "Live in under 10 minutes",
    desc: "Self-serve onboarding wizard. No sales calls, no waiting on a developer.",
  },
];

const PRICING = [
  {
    name: TIERS.essential.name,
    monthly: TIERS.essential.monthly,
    setup: TIERS.essential.setup,
    features: ["500 conversations / mo", "Email lead routing", "Monthly knowledge refresh"],
  },
  {
    name: TIERS.growth.name,
    monthly: TIERS.growth.monthly,
    setup: TIERS.growth.setup,
    highlight: true,
    features: [
      "2,000 conversations / mo",
      "Slack / Teams / Email routing",
      "Bi-weekly bot tuning",
      "Performance reports",
    ],
  },
  {
    name: TIERS.premium.name,
    monthly: TIERS.premium.monthly,
    setup: TIERS.premium.setup,
    features: [
      "Unlimited conversations",
      "Weekly optimization",
      "Custom CRM integrations",
      "Dedicated Slack",
    ],
  },
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export default function Landing() {
  const navigate = useNavigate();
  const { data: spots } = useFounderSpots();
  const founderOpen = spots?.isOpen ?? true;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
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
            <span className="font-semibold tracking-tight">MaximumAI</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link to="/pricing#roi" className="hover:text-white">ROI</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/demo">
              <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/5 hover:text-white">
                Try the demo
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/5 hover:text-white">
                Client login
              </Button>
            </Link>
            <Link to={founderOpen ? liveCheckoutUrl("founder") : "/pricing"}>
              <Button
                size="sm"
                className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
              >
                {founderOpen ? "Claim founder spot" : "Get started"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-300">
          <Sparkles className="h-3 w-3" />
          AI receptionist for small business
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          Stop losing leads at <br />
          <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            2 a.m. on a Tuesday.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60">
          A custom-trained AI chatbot that answers your customers 24/7, captures qualified leads,
          and routes hot prospects to your team — live on your site in under 10 minutes.
        </p>
        {founderOpen && spots && (
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Only {spots.remaining} of {spots.total} founder spots left — locked at ${TIERS.founder.monthly}/mo for life
          </div>
        )}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={() => founderOpen ? openLiveCheckout("founder") : navigate("/pricing")}
            className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
          >
            {founderOpen ? "Claim your founder spot" : "See pricing"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/demo")}
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            Try the demo
          </Button>
        </div>
        <p className="mt-4 text-xs text-white/40">
          {founderOpen ? "Cancel anytime · Lock-in price never increases" : "Cancel anytime"}
        </p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Everything you need to <br />
            <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              never miss a lead.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Built for plumbers, dentists, agencies, coaches, and any service business that lives or dies by inbound leads.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="border-white/10 bg-white/[0.03] p-6 transition-all hover:bg-white/[0.05]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 ring-1 ring-emerald-400/30">
                <f.icon className="h-5 w-5 text-emerald-300" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">3 steps. 10 minutes.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/60">
            From signup to live bot on your site, faster than you can finish your coffee.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { n: "01", t: "Paste your URL", d: "We scrape your site and train your bot on every page." },
            { n: "02", t: "Customize", d: "Tweak the welcome message, color, and where leads go." },
            { n: "03", t: "Embed & go live", d: "Copy one line of code. Drop it on your site. Done." },
          ].map((s) => (
            <Card key={s.n} className="border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm font-mono text-emerald-300">{s.n}</div>
              <h3 className="mt-3 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-white/60">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing — founder offer (while open) shown alongside full tiers so clients see the deal in context */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            {founderOpen ? "Lock in founder pricing." : "One extra customer pays for it."}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            {founderOpen
              ? "Only the first 10 clients get this rate. Compare it against our regular plans below."
              : "Most clients break even after closing one extra lead per month."}
          </p>
        </div>

        {founderOpen && (
          <div className="mt-14">
            <FounderOfferCard />
            <div className="mt-10 text-center">
              <p className="text-sm uppercase tracking-wider text-white/40">
                — or choose a regular plan —
              </p>
            </div>
          </div>
        )}

        <div className={`grid gap-6 md:grid-cols-3 ${founderOpen ? "mt-10" : "mt-14"}`}>
          {PRICING.map((tier) => (
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
              <h3 className="text-xl font-semibold">{tier.name}</h3>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight">{formatCurrency(tier.monthly)}</span>
                <span className="text-white/50">/ mo</span>
              </div>
              <p className="mt-2 text-sm text-white/50">+ {formatCurrency(tier.setup)} one-time setup</p>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-white/80">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => openLiveCheckout(tier.name.toLowerCase())}
                className={`mt-8 w-full ${
                  tier.highlight
                    ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
                size="lg"
              >
                Start with {tier.name}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/pricing" className="text-sm text-emerald-300 hover:underline">
            Compare full features & calculate your ROI →
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <Card className="border-white/10 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 p-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Your competitors sleep. Your bot doesn't.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            {founderOpen
              ? `${spots?.remaining ?? 10} founder spots left at $${TIERS.founder.monthly}/mo locked for life. Once gone, gone.`
              : "Be live on your site before your next coffee break."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={() => founderOpen ? openLiveCheckout("founder") : navigate("/pricing")}
              className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90"
            >
              {founderOpen ? "Claim your founder spot" : "Get started"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/demo")}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              Try the demo
            </Button>
            <Link to="/auth">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/5">
                Client login
              </Button>
            </Link>
          </div>
        </Card>
      </section>

     <footer className="border-t border-white/5 py-8 text-center text-sm text-white/40">
       <div>© {new Date().getFullYear()} MaximumAI Consulting. All rights reserved.</div>
       <div className="mt-2 space-x-4">
         <Link to="/privacy" className="hover:text-white/70 underline-offset-4 hover:underline">
           Privacy Policy
         </Link>
         <Link to="/terms" className="hover:text-white/70 underline-offset-4 hover:underline">
           Terms of Service
         </Link>
       </div>
     </footer>
    </div>
  );
}
