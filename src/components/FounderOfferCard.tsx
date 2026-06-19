import { ArrowRight, Check, Crown, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFounderSpots } from "@/hooks/useFounderSpots";
import { TIERS, formatUSD } from "@/config/pricing";

interface FounderOfferCardProps {
  /** When true, renders nothing if spots are sold out (for use on landing) */
  hideWhenClosed?: boolean;
  /** Called when sold out — lets parent show the regular tiers instead */
  onSoldOut?: () => void;
}

export function FounderOfferCard({ hideWhenClosed }: FounderOfferCardProps) {
  const navigate = useNavigate();
  const { data: spots, isLoading } = useFounderSpots();

  // While loading, show optimistic open state to avoid layout shift
  const remaining = spots?.remaining ?? 10;
  const total = spots?.total ?? 10;
  const isOpen = spots?.isOpen ?? true;

  if (!isOpen && hideWhenClosed) return null;

  const features = [
    "Custom-trained AI chatbot",
    "Up to 2,000 conversations / month",
    "Multi-page website training",
    "Custom knowledge documents",
    "Email + Slack lead routing",
    "Bi-weekly bot tuning",
    "Monthly performance reports",
    "Priority support",
  ];

  return (
    <Card className="relative mx-auto max-w-2xl overflow-hidden border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 via-white/[0.03] to-cyan-500/10 p-10 ring-2 ring-emerald-400/40">
      {/* Top badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#0a0a0f]">
        <span className="inline-flex items-center gap-1.5">
          <Crown className="h-3 w-3" />
          Founding Client Offer
        </span>
      </div>

      <div className="text-center">
        <h3 className="text-2xl font-semibold text-white">Founding Client</h3>
        <p className="mt-2 text-sm text-white/60">
          For the first 10 businesses to come on board. Locked for life.
        </p>
      </div>

      {/* Spots counter */}
      <div className="mx-auto mt-6 max-w-sm rounded-xl border border-emerald-400/30 bg-[#0a0a0f]/40 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-white/50">
          Spots remaining
        </div>
        <div className="mt-1 text-4xl font-bold text-emerald-300">
          {isLoading ? "—" : `${remaining} / ${total}`}
        </div>
        {!isLoading && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
              style={{ width: `${(remaining / total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Pricing */}
      <div className="mt-8 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-6xl font-bold tracking-tight text-white">{formatUSD(TIERS.founder.monthly)}</span>
          <span className="text-white/50">/ month</span>
        </div>
        <p className="mt-2 text-sm text-white/50">
          + <span className="text-white/80">{formatUSD(TIERS.founder.setup)}</span> one-time setup
          <span className="ml-2 text-white/40 line-through">{formatUSD(TIERS.growth.setup)}</span>
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/20">
          <Lock className="h-3 w-3" />
          {formatUSD(TIERS.founder.monthly)}/mo locked for life — never goes up
        </div>
      </div>

      {/* Features */}
      <ul className="mx-auto mt-8 grid max-w-md gap-3 sm:grid-cols-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-white/80">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={() => navigate("/checkout?plan=founder")}
        disabled={!isOpen}
        size="lg"
        className="mx-auto mt-10 flex w-full max-w-md bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#0a0a0f] hover:opacity-90 disabled:opacity-50"
      >
        {isOpen ? "Claim your founder spot" : "All spots claimed"}
        {isOpen && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>

      <p className="mt-4 text-center text-xs text-white/40">
        Once 10 spots are taken, regular pricing applies (Growth tier: {formatUSD(TIERS.growth.setup)} setup + {formatUSD(TIERS.growth.monthly)}/mo)
      </p>
    </Card>
  );
}
