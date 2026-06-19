import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";

interface WidgetConfigPayload {
  organization_id: string;
  bot_name: string;
  welcome_message: string;
  primary_color: string;
  white_label: boolean;
}

interface ValidationIssue {
  field: string;
  message: string;
  level: "error" | "warning";
}

function validatePayload(p: WidgetConfigPayload): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!p.organization_id) issues.push({ field: "organization_id", message: "Missing organization id", level: "error" });
  if (!p.bot_name?.trim()) issues.push({ field: "bot_name", message: "Bot name is empty", level: "error" });
  if (!p.welcome_message?.trim()) issues.push({ field: "welcome_message", message: "Welcome message is empty", level: "warning" });
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(p.primary_color || "")) {
    issues.push({ field: "primary_color", message: `Invalid hex color: ${p.primary_color}`, level: "error" });
  }
  if (p.welcome_message && p.welcome_message.length > 280) {
    issues.push({ field: "welcome_message", message: "Welcome message > 280 chars (may wrap awkwardly)", level: "warning" });
  }
  return issues;
}

export function WidgetConfigValidator({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<WidgetConfigPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-config?organization_id=${organizationId}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${body}`);
      }
      const data = (await resp.json()) as WidgetConfigPayload;
      setPayload(data);
      setFetchedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch widget config");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  const issues = payload ? validatePayload(payload) : [];
  const hasErrors = issues.some((i) => i.level === "error");
  const hasWarnings = issues.some((i) => i.level === "warning");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Widget Config Validator
            </CardTitle>
            <CardDescription>
              Preview the live payload returned by the widget-config endpoint and validate it before embedding.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchConfig} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {payload ? "Refresh" : "Fetch"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="break-all">{error}</div>
          </div>
        )}

        {!payload && !error && (
          <p className="text-sm text-muted-foreground">
            Click <span className="font-medium">Fetch</span> to call the live widget-config endpoint for this organization.
          </p>
        )}

        {payload && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {!hasErrors && !hasWarnings && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Ready to go live
                </Badge>
              )}
              {hasErrors && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" /> {issues.filter((i) => i.level === "error").length} error(s)
                </Badge>
              )}
              {hasWarnings && (
                <Badge variant="secondary" className="gap-1">
                  {issues.filter((i) => i.level === "warning").length} warning(s)
                </Badge>
              )}
              {payload.white_label && <Badge variant="outline">White-label</Badge>}
              {fetchedAt && (
                <span className="text-xs text-muted-foreground ml-auto">
                  Fetched {fetchedAt.toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Organization ID" value={payload.organization_id} mono />
              <Field label="Bot Name" value={payload.bot_name} />
              <Field label="Welcome Message" value={payload.welcome_message} className="sm:col-span-2" />
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Primary Color</div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded border"
                    style={{ backgroundColor: payload.primary_color }}
                  />
                  <code className="text-sm">{payload.primary_color}</code>
                </div>
              </div>
              <Field label="White Label" value={payload.white_label ? "Enabled" : "Disabled"} />
            </div>

            {issues.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Validation</div>
                <ul className="space-y-1.5">
                  {issues.map((i, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start gap-2 text-sm rounded-md p-2 border ${
                        i.level === "error"
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : "border-border bg-muted/40"
                      }`}
                    >
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium">{i.field}:</span> {i.message}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Raw JSON payload
              </summary>
              <pre className="mt-2 bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm break-all ${mono ? "font-mono" : ""}`}>{value || <span className="text-muted-foreground italic">empty</span>}</div>
    </div>
  );
}
