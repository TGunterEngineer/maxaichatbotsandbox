import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UpgradePillProps {
  tier: "Essential+" | "Growth+" | "Premium" | "Premium+" | string;
  className?: string;
}

/**
 * Reusable lock badge for gated features. Keeps copy consistent across
 * BotSettings, KnowledgeBase, Dashboard, etc.
 */
export function UpgradePill({ tier, className }: UpgradePillProps) {
  return (
    <Badge variant="secondary" className={`gap-1 ${className ?? ""}`}>
      <Lock className="h-3 w-3" />
      {tier}
    </Badge>
  );
}
