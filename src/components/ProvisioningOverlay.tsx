import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

const STAGES = [
  { pct: 0, label: "Allocating dedicated multi-tenant secure container layer..." },
  { pct: 15, label: "Executing deep-web scraper & parsing business sitemap metadata..." },
  { pct: 35, label: "Vectorizing scraped knowledge base assets into Supabase storage..." },
  { pct: 55, label: "Tuning semantic guardrails and anti-hallucination prompts..." },
  { pct: 75, label: "Generating embeddable widget.js cross-origin delivery keys..." },
  { pct: 90, label: "Verifying compliance loops and intent-capture tracking tables..." },
  { pct: 100, label: "Provisioning sandboxed administrative dashboard. Complete!" },
];

// Total runtime ~37s (within 30-45s window). Tick every 100ms => +0.27% per tick.
const TICK_MS = 100;
const PCT_PER_TICK = 100 / 370;

export function ProvisioningOverlay({ onDone }: { onDone?: () => void }) {
  const [pct, setPct] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (pct >= 100) {
      setShowSuccess(true);
      const t = setTimeout(() => onDone?.(), 2800);
      return () => clearTimeout(t);
    }
    const id = setInterval(() => {
      setPct((p) => Math.min(100, p + PCT_PER_TICK));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [pct, onDone]);

  const currentStageIdx = (() => {
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (pct >= STAGES[i].pct) idx = i;
    }
    return idx;
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl px-6">
        {showSuccess ? (
          <div className="text-center animate-scale-in space-y-6 py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 ring-4 ring-primary/30">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight">
                Temporary Staging Environment Provisioned
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Full Production Deployment Requires Manual Core Activation.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3 animate-pulse" />
                AI Engine Provisioning
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Spinning up your dedicated AI instance
              </h2>
              <p className="text-muted-foreground text-sm">
                This is a one-time setup. Please keep this tab open.
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">PROGRESS</span>
                <span className="text-primary font-semibold tabular-nums">
                  {Math.floor(pct)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-100 ease-linear"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Terminal log */}
            <div className="rounded-lg border bg-black/90 p-4 font-mono text-xs space-y-1.5 max-h-72 overflow-hidden">
              {STAGES.map((stage, i) => {
                const reached = pct >= stage.pct;
                const isCurrent = i === currentStageIdx && pct < 100;
                const completed = i < currentStageIdx || pct >= 100;
                if (!reached) return null;
                return (
                  <div
                    key={stage.pct}
                    className="flex items-start gap-2 animate-fade-in text-emerald-400"
                  >
                    <span className="mt-0.5 shrink-0">
                      {completed ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : isCurrent ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className={completed ? "text-emerald-400/80" : "text-cyan-300"}>
                      [{completed ? "x" : isCurrent ? " " : "x"}] {String(stage.pct).padStart(3, " ")}% — {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
