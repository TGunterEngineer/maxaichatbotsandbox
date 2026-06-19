import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ArrowLeft, Check, Copy, Globe, Loader2, Sparkles, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ProvisioningOverlay } from "@/components/ProvisioningOverlay";

type Step = 1 | 2 | 3;

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "Website" },
  { n: 2, label: "Train" },
  { n: 3, label: "Embed" },
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { organizationId, organization } = useOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preloadUrl = searchParams.get("preloadUrl");
  const [autoStarted, setAutoStarted] = useState(false);
  const [showProvisioning, setShowProvisioning] = useState(!!preloadUrl);
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [url, setUrl] = useState("");
  const [scrapedText, setScrapedText] = useState("");
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch existing bot config
  const { data: botConfig, isLoading: botLoading } = useQuery({
    queryKey: ["bot_config", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bot_configs")
        .select("*")
        .eq("organization_id", organizationId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) navigate("/", { replace: true });
  }, [authLoading, user, navigate]);

  // Auto-preload URL from query param (e.g. ?preloadUrl=https://...)
  useEffect(() => {
    if (autoStarted) return;
    if (!preloadUrl || !user || !organizationId) return;
    setUrl(preloadUrl);
    setAutoStarted(true);
    // Strip the param so refresh doesn't re-trigger
    const next = new URLSearchParams(searchParams);
    next.delete("preloadUrl");
    setSearchParams(next, { replace: true });
    handleScrape(preloadUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadUrl, user, organizationId, autoStarted]);

  const embedSnippet = useMemo(() => {
    if (!organizationId) return "";
    // Always use the canonical live domain so customers never paste a
    // preview/lovable.app URL into their site.
    const widgetOrigin = "https://chat.maximumaiconsulting.com";
    return `<script>
  (function() {
    var d = document, s = d.createElement('script');
    s.src = '${widgetOrigin}/widget.js';
    s.setAttribute('data-org-id', '${organizationId}');
    s.defer = true;
    d.body.appendChild(s);
  })();
</script>`;
  }, [organizationId]);

  const handleScrape = async (urlOverride?: string) => {
    const trimmed = (urlOverride ?? url).trim();
    if (!trimmed) {
      toast({ title: "Enter a URL first", variant: "destructive" });
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    } catch {
      toast({ title: "Invalid URL", description: "Try something like https://yourbusiness.com", variant: "destructive" });
      return;
    }

    setScraping(true);
    setStep(2);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-website`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ url: parsed.toString() }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Failed to scrape website");
      setScrapedText(result.text || "");
    } catch (e: any) {
      toast({ title: "Couldn't read your site", description: e.message, variant: "destructive" });
      setStep(1);
    } finally {
      setScraping(false);
    }
  };

  const handleTrain = async () => {
    if (!botConfig) return;
    setSaving(true);
    try {
      const merged = botConfig.primary_knowledge
        ? `${botConfig.primary_knowledge}\n\n--- Synced from ${url} ---\n\n${scrapedText}`
        : `--- Synced from ${url} ---\n\n${scrapedText}`;

      const { error } = await supabase
        .from("bot_configs")
        .update({ primary_knowledge: merged })
        .eq("id", botConfig.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["bot_config", organizationId] });
      toast({ title: "Bot trained!", description: "Your knowledge base has been updated." });
      setStep(3);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Paste it before </body> on your site." });
  };

  if (authLoading || botLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/40">
      {showProvisioning && (
        <ProvisioningOverlay onDone={() => { setShowProvisioning(false); navigate("/", { replace: true }); }} />
      )}
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-primary mb-4">
            <Sparkles className="h-3 w-3" />
            Get your bot live in 3 steps
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome{organization?.name ? `, ${organization.name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-2">
            Paste your website, train your bot, and copy the embed code.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    done
                      ? "bg-primary text-primary-foreground"
                      : active
                      ? "bg-primary/15 text-primary ring-2 ring-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : s.n}
                </div>
                <span
                  className={`text-sm font-medium ${
                    active || done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Website */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Where does your business live?
              </CardTitle>
              <CardDescription>
                Paste your homepage URL — we'll pull the content so your bot can answer questions about you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-url">Website URL</Label>
                <Input
                  id="site-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourbusiness.com"
                  onKeyDown={(e) => e.key === "Enter" && handleScrape()}
                  autoFocus
                />
              </div>
              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (organizationId) {
                      localStorage.setItem(`onboarding_skipped_${organizationId}`, "1");
                    }
                    navigate("/");
                  }}
                >
                  Skip for now
                </Button>
                <Button onClick={() => handleScrape()} disabled={!url.trim()}>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Train */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {scraping ? "Reading your website…" : "Review your bot's knowledge"}
              </CardTitle>
              <CardDescription>
                {scraping
                  ? "Pulling text from your homepage. This usually takes a few seconds."
                  : "Edit anything that looks off. This is what your bot will use to answer questions."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scraping ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="knowledge">Knowledge base preview</Label>
                    <Textarea
                      id="knowledge"
                      value={scrapedText}
                      onChange={(e) => setScrapedText(e.target.value)}
                      rows={12}
                      className="font-mono text-xs"
                      maxLength={50000}
                    />
                    <p className="text-xs text-muted-foreground">
                      {scrapedText.length.toLocaleString()} characters captured from {url}
                    </p>
                  </div>
                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setStep(1)} disabled={saving}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button onClick={handleTrain} disabled={saving || !scrapedText.trim()}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Training…
                        </>
                      ) : (
                        <>
                          Train my bot
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Embed */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                You're live! Drop this on your site
              </CardTitle>
              <CardDescription>
                Paste this snippet into your website's HTML, just before the closing &lt;/body&gt; tag.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {embedSnippet}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 gap-1.5"
                  onClick={copyEmbed}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                <p className="font-medium">What happens next?</p>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside text-xs">
                  <li>Add the snippet to your site (or send it to your developer)</li>
                  <li>The chat widget appears in the bottom-right corner</li>
                  <li>Captured leads will show up in your dashboard</li>
                </ul>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/install">Full install guide</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/preview">Test your bot</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/">
                      Go to dashboard
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
