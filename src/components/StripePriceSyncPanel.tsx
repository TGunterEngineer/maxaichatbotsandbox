import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe-env";
import { buildPriceSpecs, formatUSD } from "@/config/pricing";
import { DollarSign, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DiffEntry {
  lookupKey: string;
  productId: string;
  action: "unchanged" | "updated" | "created" | "product_created" | "error";
  oldAmountCents?: number;
  newAmountCents: number;
  message?: string;
}

interface SyncResult {
  environment: "sandbox" | "live";
  dryRun: boolean;
  diff: DiffEntry[];
  summary: {
    total: number;
    unchanged: number;
    updated: number;
    created: number;
    productCreated: number;
    errors: number;
  };
}

export function StripePriceSyncPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  const env = getStripeEnvironment();
  const specs = buildPriceSpecs();

  const run = async (dryRun: boolean) => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sync-stripe-prices", {
        body: { specs, environment: env, dryRun },
      });
      if (error) throw error;
      setResult(data as SyncResult);
      const r = data as SyncResult;
      if (r.summary.errors > 0) {
        toast({
          title: dryRun ? "Dry run completed with errors" : "Sync completed with errors",
          description: `${r.summary.errors} entries failed — see diff below.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: dryRun ? "Dry run successful" : "Sync successful",
          description: `${r.summary.updated} updated, ${r.summary.created} created, ${r.summary.unchanged} unchanged.`,
        });
      }
    } catch (e: any) {
      toast({
        title: "Sync failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Stripe Price Sync</CardTitle>
          </div>
          <Badge variant={env === "live" ? "destructive" : "secondary"}>
            {env === "live" ? "LIVE" : "TEST"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Reconcile Stripe prices against <code className="rounded bg-muted px-1">src/config/pricing.ts</code>.
          New prices keep the same lookup_key (no checkout downtime).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spec preview */}
        <div className="rounded-md border">
          <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            Source of truth — {specs.length} prices
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Lookup key</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Interval</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {specs.map((s) => (
                  <tr key={s.lookupKey} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{s.lookupKey}</td>
                    <td className="px-3 py-2">{s.productId}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {s.recurringInterval ?? "one-time"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatUSD(s.amountCents / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run(true)} disabled={loading} variant="outline">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Dry run (preview)
          </Button>
          <Button onClick={() => run(false)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
            Sync to Stripe
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">Total: {result.summary.total}</Badge>
              <Badge variant="secondary">Unchanged: {result.summary.unchanged}</Badge>
              {result.summary.updated > 0 && <Badge>Updated: {result.summary.updated}</Badge>}
              {result.summary.created > 0 && <Badge>Created: {result.summary.created}</Badge>}
              {result.summary.productCreated > 0 && (
                <Badge>Products created: {result.summary.productCreated}</Badge>
              )}
              {result.summary.errors > 0 && (
                <Badge variant="destructive">Errors: {result.summary.errors}</Badge>
              )}
              {result.dryRun && <Badge variant="outline">DRY RUN</Badge>}
            </div>

            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Lookup key</th>
                    <th className="px-3 py-2 text-right font-medium">Old → New</th>
                    <th className="px-3 py-2 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {result.diff.map((d, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {d.action === "error" ? (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3.5 w-3.5" /> error
                          </span>
                        ) : d.action === "unchanged" ? (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5" /> unchanged
                          </span>
                        ) : (
                          <Badge variant="default" className="text-xs">{d.action}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{d.lookupKey}</td>
                      <td className="px-3 py-2 text-right text-xs">
                        {d.oldAmountCents !== undefined && d.oldAmountCents !== d.newAmountCents ? (
                          <>
                            <span className="text-muted-foreground line-through">
                              {formatUSD(d.oldAmountCents / 100)}
                            </span>{" "}
                            → <span className="font-medium">{formatUSD(d.newAmountCents / 100)}</span>
                          </>
                        ) : (
                          <span>{formatUSD(d.newAmountCents / 100)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{d.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
