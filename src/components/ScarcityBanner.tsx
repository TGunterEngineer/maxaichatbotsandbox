import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, X, ArrowRight } from "lucide-react";
import { useFounderSpots } from "@/hooks/useFounderSpots";
import { liveCheckoutUrl } from "@/lib/live-site";

const DISMISS_KEY = "scarcity_banner_dismissed_at";
const DISMISS_HOURS = 24;

export function ScarcityBanner() {
  const { data: spots, isLoading } = useFounderSpots();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const ts = localStorage.getItem(DISMISS_KEY);
      if (!ts) {
        setDismissed(false);
        return;
      }
      const ageMs = Date.now() - Number(ts);
      setDismissed(ageMs < DISMISS_HOURS * 60 * 60 * 1000);
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (isLoading || dismissed) return null;
  if (!spots?.isOpen) return null;

  const { remaining, total } = spots;
  const isUrgent = remaining <= 3;

  return (
    <div
      className={`relative w-full ${
        isUrgent
          ? "bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400"
          : "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
      } text-[#0a0a0f]`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-center text-sm font-medium">
        <Crown className="h-4 w-4 flex-shrink-0" />
        <span className="hidden sm:inline">
          {isUrgent ? "Almost gone — " : "Founding Client Offer: "}
          <strong className="font-bold">
            {remaining} of {total} spots left
          </strong>
          {" "}at <strong className="font-bold">$197/mo locked for life</strong>
        </span>
        <span className="sm:hidden">
          <strong className="font-bold">{remaining}/{total}</strong> founder spots — $197/mo for life
        </span>
        <Link
          to={liveCheckoutUrl("founder")}
          className="inline-flex items-center gap-1 rounded-full bg-[#0a0a0f] px-3 py-0.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          Claim
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#0a0a0f]/60 transition-colors hover:bg-black/10 hover:text-[#0a0a0f]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
