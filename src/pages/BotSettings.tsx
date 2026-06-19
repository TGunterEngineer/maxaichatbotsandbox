import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Save, Copy, Check, UserPlus, Webhook, Sparkles, ExternalLink, CalendarClock, CalendarPlus, Smartphone, Clock, Globe, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { KnowledgeBaseSources } from "@/components/KnowledgeBaseSources";
import { WidgetPreview } from "@/components/WidgetPreview";
import { WidgetConfigValidator } from "@/components/WidgetConfigValidator";
import { useOrgFeatures } from "@/hooks/useOrgFeatures";
import { useDeveloperMode } from "@/hooks/useDeveloperMode";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const TONE_OPTIONS = ["Professional", "Friendly", "Humorous", "Empathetic", "Concise"] as const;

export default function BotSettings() {
  const { organizationId } = useOrganization();
  const { features } = useOrgFeatures();
  const [devMode] = useDeveloperMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewReply, setPreviewReply] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [rotatingSecret, setRotatingSecret] = useState(false);



  const handleInvite = async () => {
    if (!inviteEmail.trim() || !invitePassword.trim() || !organizationId) return;
    setInviting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-client`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            password: invitePassword.trim(),
            organization_id: organizationId,
          }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) {
        const friendly =
          result.error === "SEAT_LIMIT_REACHED"
            ? result.message ?? "Your plan's user limit is reached. Upgrade to add more teammates."
            : result.error || "Failed to create client";
        throw new Error(friendly);
      }
      toast({ title: "Client Created", description: `Account created for ${inviteEmail}. Share the login credentials with your client.` });
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePassword("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const BOT_CONFIG_COLUMNS = [
    "id","organization_id","bot_name","welcome_message","system_prompt",
    "primary_knowledge","tone","webhook_url","ask_for_preferred_time",
    "booking_link","is_active","multilingual_enabled","sms_alert_phone",
    "business_hours_enabled","business_hours_timezone","business_hours_start",
    "business_hours_end","business_hours_days","after_hours_message",
    "support_email","created_at","updated_at",
  ].join(",");

  const { data: botConfig, isLoading } = useQuery({
    queryKey: ["bot_config", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bot_configs")
        .select(BOT_CONFIG_COLUMNS)
        .eq("organization_id", organizationId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!organizationId,
  });

  // Webhook secret is owner-only; fetched via SECURITY DEFINER RPC that enforces role check.
  const { data: webhookSecretData } = useQuery({
    queryKey: ["bot_webhook_secret", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_bot_webhook_secret" as any, {
        _org_id: organizationId!,
      });
      if (error) return null; // non-owners simply don't see it
      return data as string | null;
    },
    enabled: !!organizationId,
    retry: false,
  });

  const [form, setForm] = useState({
    bot_name: "",
    welcome_message: "",
    system_prompt: "",
    primary_knowledge: "",
    tone: "Professional",
    webhook_url: "",
    ask_for_preferred_time: true,
    booking_link: "",
    sms_alert_phone: "",
    business_hours_enabled: false,
    business_hours_timezone: "America/New_York",
    business_hours_start: "09:00",
    business_hours_end: "17:00",
    business_hours_days: [1, 2, 3, 4, 5] as number[],
    after_hours_message: "",
    multilingual_enabled: false,
    support_email: "",
  });

  useEffect(() => {
    if (botConfig) {
      setForm({
        bot_name: botConfig.bot_name,
        welcome_message: botConfig.welcome_message ?? "",
        system_prompt: botConfig.system_prompt ?? "",
        primary_knowledge: botConfig.primary_knowledge ?? "",
        tone: botConfig.tone ?? "Professional",
        webhook_url: (botConfig as any).webhook_url ?? "",
        ask_for_preferred_time: (botConfig as any).ask_for_preferred_time ?? true,
        booking_link: (botConfig as any).booking_link ?? "",
        sms_alert_phone: (botConfig as any).sms_alert_phone ?? "",
        business_hours_enabled: (botConfig as any).business_hours_enabled ?? false,
        business_hours_timezone: (botConfig as any).business_hours_timezone ?? "America/New_York",
        business_hours_start: (botConfig as any).business_hours_start ?? "09:00",
        business_hours_end: (botConfig as any).business_hours_end ?? "17:00",
        business_hours_days: (botConfig as any).business_hours_days ?? [1, 2, 3, 4, 5],
        after_hours_message: (botConfig as any).after_hours_message ?? "",
        multilingual_enabled: (botConfig as any).multilingual_enabled ?? false,
        support_email: (botConfig as any).support_email ?? "",
      });
    }
  }, [botConfig]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bot_configs")
        .update(form)
        .eq("id", botConfig!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot_config"] });
      toast({ title: "Saved", description: "Bot settings updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isActive: boolean = (botConfig as any)?.is_active !== false;
  const killSwitchMutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from("bot_configs")
        .update({ is_active: next })
        .eq("id", botConfig!.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: ["bot_config"] });
      toast({
        title: next ? "Chatbot resumed" : "Chatbot paused",
        description: next
          ? "Visitors can chat with your bot again."
          : "All incoming chat requests will be rejected until you re-enable.",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const webhookSecret = (webhookSecretData ?? undefined) as string | undefined;

  const handleCopySecret = async () => {
    if (!webhookSecret) return;
    await navigator.clipboard.writeText(webhookSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 1500);
  };

  const handleRotateSecret = async () => {
    if (!organizationId) return;
    if (!confirm("Rotate the webhook signing secret? Your receiver will reject all webhooks until you update its stored secret.")) return;
    setRotatingSecret(true);
    try {
      const { error } = await supabase.rpc("rotate_bot_webhook_secret" as any, {
        _org_id: organizationId,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["bot_webhook_secret"] });
      toast({ title: "Secret rotated", description: "Update your endpoint with the new secret to keep receiving webhooks." });
    } catch (e: any) {
      toast({ title: "Could not rotate secret", description: e.message ?? "Only org owners can rotate the secret.", variant: "destructive" });
    } finally {
      setRotatingSecret(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bot Settings</h2>
          <p className="text-muted-foreground">Configure your AI chatbot's identity, tone, and knowledge.</p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link to="/onboarding">
            <Sparkles className="h-4 w-4" />
            Re-run setup wizard
          </Link>
        </Button>
      </div>

      <Card className={!isActive ? "border-destructive" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Emergency Controls
          </CardTitle>
          <CardDescription>
            Instantly pause your chatbot. While paused, every incoming chat request is rejected
            with a 403 — no AI calls, no usage, no leads captured.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="kill_switch" className="text-base">
                Chatbot is {isActive ? "active" : "paused"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? "Your bot is live and responding to visitors."
                  : "All chat requests return SERVICE_PAUSED until you turn this back on."}
              </p>
            </div>
            <Switch
              id="kill_switch"
              checked={isActive}
              disabled={killSwitchMutation.isPending || !botConfig}
              onCheckedChange={(checked) => killSwitchMutation.mutate(checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>Set your bot's name and first impression</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot_name">Bot Name</Label>
            <Input
              id="bot_name"
              value={form.bot_name}
              onChange={(e) => setForm({ ...form, bot_name: e.target.value })}
              placeholder="e.g. SalesBot, HelpDesk AI"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcome_message">Greeting Message</Label>
            <Input
              id="welcome_message"
              value={form.welcome_message}
              onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
              placeholder="Hello! How can I help you today?"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">The first message visitors see when the chatbot opens.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="support_email">Support Email</Label>
            <Input
              id="support_email"
              type="email"
              value={form.support_email}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
              placeholder="support@yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              When set, a "Support" button appears in the chat widget header so visitors can email you directly.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personality</CardTitle>
          <CardDescription>Control how your bot communicates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Select value={form.tone} onValueChange={(value) => setForm({ ...form, tone: value })}>
              <SelectTrigger id="tone">
                <SelectValue placeholder="Select a tone" />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((tone) => (
                  <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Sets the overall communication style of your bot.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              rows={4}
              placeholder="You are a helpful sales assistant for our company..."
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">Advanced: fine-tune the bot's behavior with a custom system prompt.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>Exactly what your visitors will see</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to="/preview">
                <ExternalLink className="h-4 w-4" />
                Open full demo
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-6 flex justify-end min-h-[480px]">
            <WidgetPreview
              botName={form.bot_name}
              welcomeMessage={form.welcome_message}
              brandColor="hsl(var(--primary))"
            />
          </div>
        </CardContent>
      </Card>

      {organizationId && <KnowledgeBaseSources organizationId={organizationId} />}

      <Card>
        <CardHeader>
          <CardTitle>Manual Notes</CardTitle>
          <CardDescription>
            Optional. Paste FAQ, pricing, or any extra info. Combined with your sources above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="primary_knowledge"
            value={form.primary_knowledge}
            onChange={(e) => setForm({ ...form, primary_knowledge: e.target.value })}
            rows={8}
            placeholder="Anything the bot should always know..."
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {devMode && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              <CardTitle>Escalation Webhook</CardTitle>
            </div>
            {!features.webhook && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Growth+
              </Badge>
            )}
          </div>
          <CardDescription>
            Get notified on Slack or Teams when the bot can't answer confidently or a visitor asks for a human
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="webhook_url">Webhook URL</Label>
          <Input
            id="webhook_url"
            value={form.webhook_url}
            onChange={(e) => setForm({ ...form, webhook_url: e.target.value })}
            placeholder="https://hooks.slack.com/services/... or https://outlook.office.com/webhook/..."
            type="url"
            disabled={!features.webhook}
          />
          <p className="text-xs text-muted-foreground">
            {features.webhook ? (
              "Paste a Slack Incoming Webhook or Microsoft Teams Webhook URL. The bot will send the chat transcript when it detects it can't help."
            ) : (
              <>Webhook integrations are included on the <strong>Growth</strong> plan and above. <Link to="/pricing" className="text-primary underline">Upgrade →</Link></>
            )}
          </p>

          {features.webhook && webhookSecret && (
            <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Signing secret</p>
                  <p className="text-xs text-muted-foreground">
                    Every outbound webhook is signed with HMAC-SHA256 and sent as <code className="font-mono text-[11px] bg-background px-1 py-0.5 rounded">X-MaximumAI-Signature: sha256=&lt;hex&gt;</code>. Verify on your endpoint before trusting the payload.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={secretRevealed ? webhookSecret : "•".repeat(32)}
                  className="font-mono text-xs"
                  type="text"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setSecretRevealed((v) => !v)} title={secretRevealed ? "Hide" : "Reveal"}>
                  {secretRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={handleCopySecret} title="Copy">
                  {secretCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleRotateSecret} disabled={rotatingSecret}>
                  {rotatingSecret ? "Rotating…" : "Rotate"}
                </Button>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                  How to verify the signature
                </summary>
                <div className="mt-2 space-y-2 text-muted-foreground">
                  <p>
                    Compute <code className="font-mono">HMAC-SHA256(secret, raw_request_body)</code> and compare the hex digest
                    against the value after <code className="font-mono">sha256=</code> in the <code className="font-mono">X-MaximumAI-Signature</code> header. Use a constant-time comparison.
                  </p>
                  <pre className="bg-background border border-border rounded p-2 overflow-x-auto text-[11px] leading-relaxed font-mono">{`// Node.js (Express)
import crypto from "node:crypto";

app.post("/webhooks/maximumai", express.raw({ type: "application/json" }), (req, res) => {
  const sent = (req.headers["x-maximumai-signature"] || "").toString();
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.MAXIMUMAI_WEBHOOK_SECRET)
    .update(req.body) // raw Buffer — must be unmodified bytes
    .digest("hex");

  const ok = sent.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
  if (!ok) return res.status(401).send("invalid signature");

  const payload = JSON.parse(req.body.toString("utf8"));
  // ...handle payload
  res.sendStatus(200);
});`}</pre>
                  <pre className="bg-background border border-border rounded p-2 overflow-x-auto text-[11px] leading-relaxed font-mono">{`# Python (Flask)
import hmac, hashlib, os
from flask import request, abort

@app.post("/webhooks/maximumai")
def hook():
    sent = request.headers.get("X-MaximumAI-Signature", "")
    mac = hmac.new(os.environ["MAXIMUMAI_WEBHOOK_SECRET"].encode(),
                   request.get_data(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sent, f"sha256={mac}"):
        abort(401)
    return "", 200`}</pre>
                  <p>
                    Companion headers: <code className="font-mono">X-MaximumAI-Timestamp</code> (ISO-8601 send time) and{" "}
                    <code className="font-mono">X-MaximumAI-Event</code> (e.g. <code>lead.captured</code>). Reject requests whose
                    timestamp is too old to mitigate replay attacks. Always verify against the <em>raw</em> request body bytes — do not re-serialize JSON first.
                  </p>
                </div>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
      )}


      <Card className={!features.sms_alerts ? "relative overflow-hidden" : undefined}>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle>SMS Hot-Lead Alerts</CardTitle>
            </div>
            {!features.sms_alerts && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Growth+
              </Badge>
            )}
          </div>
          <CardDescription>
            Get an instant text message when the bot captures a 🔥 hot lead. Perfect for closing deals before the visitor cools off.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="sms_alert_phone">Mobile number (E.164 format)</Label>
          <Input
            id="sms_alert_phone"
            value={form.sms_alert_phone}
            onChange={(e) => setForm({ ...form, sms_alert_phone: e.target.value })}
            placeholder="+15551234567"
            type="tel"
            maxLength={16}
            disabled={!features.sms_alerts}
          />
          <p className="text-xs text-muted-foreground">
            {features.sms_alerts ? (
              <>Include the country code (e.g. <code className="text-xs">+1</code> for US/Canada). Leave blank to disable SMS alerts. You'll still get email alerts.</>
            ) : (
              <>SMS alerts are included on the <strong>Growth</strong> plan and above. <Link to="/pricing" className="text-primary underline">Upgrade →</Link></>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>After-Hours Mode</CardTitle>
            </div>
            {!features.after_hours && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Growth+
              </Badge>
            )}
          </div>
          <CardDescription>
            When visitors chat outside your business hours, the bot sets the right expectation upfront — then keeps qualifying them and capturing their email so the team can follow up first thing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 p-4">
            <div className="space-y-1">
              <Label htmlFor="business_hours_enabled" className="text-sm font-medium">
                Enable after-hours mode
              </Label>
              <p className="text-xs text-muted-foreground">
                {features.after_hours
                  ? "When off, the bot behaves the same 24/7."
                  : <>Available on the <strong>Growth</strong> plan and above. <Link to="/pricing" className="text-primary underline">Upgrade →</Link></>}
              </p>
            </div>
            <Switch
              id="business_hours_enabled"
              checked={form.business_hours_enabled}
              onCheckedChange={(checked) => setForm({ ...form, business_hours_enabled: checked })}
              disabled={!features.after_hours}
            />
          </div>

          {form.business_hours_enabled && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="business_hours_start">Open</Label>
                  <Input
                    id="business_hours_start"
                    type="time"
                    value={form.business_hours_start}
                    onChange={(e) => setForm({ ...form, business_hours_start: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_hours_end">Close</Label>
                  <Input
                    id="business_hours_end"
                    type="time"
                    value={form.business_hours_end}
                    onChange={(e) => setForm({ ...form, business_hours_end: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_hours_timezone">Timezone</Label>
                  <Select
                    value={form.business_hours_timezone}
                    onValueChange={(value) => setForm({ ...form, business_hours_timezone: value })}
                  >
                    <SelectTrigger id="business_hours_timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern (New York)</SelectItem>
                      <SelectItem value="America/Chicago">Central (Chicago)</SelectItem>
                      <SelectItem value="America/Denver">Mountain (Denver)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific (Los Angeles)</SelectItem>
                      <SelectItem value="America/Phoenix">Arizona</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris / Berlin</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Working days</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 1, l: "Mon" },
                    { v: 2, l: "Tue" },
                    { v: 3, l: "Wed" },
                    { v: 4, l: "Thu" },
                    { v: 5, l: "Fri" },
                    { v: 6, l: "Sat" },
                    { v: 0, l: "Sun" },
                  ].map((d) => {
                    const active = form.business_hours_days.includes(d.v);
                    return (
                      <button
                        key={d.v}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? form.business_hours_days.filter((x) => x !== d.v)
                            : [...form.business_hours_days, d.v].sort();
                          setForm({ ...form, business_hours_days: next });
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {d.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="after_hours_message">After-hours message</Label>
                <Textarea
                  id="after_hours_message"
                  value={form.after_hours_message}
                  onChange={(e) => setForm({ ...form, after_hours_message: e.target.value })}
                  rows={3}
                  placeholder="Thanks for reaching out! Our team is offline right now…"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Shown once at the start of an after-hours conversation. The bot still answers questions and captures their email.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Test it now</p>
                    <p className="text-xs text-muted-foreground">
                      Simulate a chat outside your business hours and see what your bot would reply.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      if (!organizationId) return;
                      setPreviewOpen(true);
                      setPreviewLoading(true);
                      setPreviewReply("");
                      setPreviewError("");
                      try {
                        // Save current settings first so the preview reflects unsaved edits
                        await supabase
                          .from("bot_configs")
                          .update({
                            business_hours_enabled: form.business_hours_enabled,
                            business_hours_timezone: form.business_hours_timezone,
                            business_hours_start: form.business_hours_start,
                            business_hours_end: form.business_hours_end,
                            business_hours_days: form.business_hours_days,
                            after_hours_message: form.after_hours_message,
                          })
                          .eq("organization_id", organizationId);

                        const resp = await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              organization_id: organizationId,
                              session_id: `preview-after-hours-${Date.now()}`,
                              message: "Hi, I'm interested in your services. Can you help?",
                              force_after_hours: true,
                            }),
                          }
                        );
                        if (!resp.ok || !resp.body) {
                          throw new Error(`Preview failed (${resp.status})`);
                        }
                        // Stream the SSE response and accumulate text deltas
                        const reader = resp.body.getReader();
                        const decoder = new TextDecoder();
                        let buf = "";
                        let acc = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          buf += decoder.decode(value, { stream: true });
                          const lines = buf.split("\n");
                          buf = lines.pop() ?? "";
                          for (const line of lines) {
                            if (!line.startsWith("data:")) continue;
                            const data = line.slice(5).trim();
                            if (!data || data === "[DONE]") continue;
                            try {
                              const parsed = JSON.parse(data);
                              const delta = parsed?.choices?.[0]?.delta?.content;
                              if (delta) {
                                acc += delta;
                                setPreviewReply(acc);
                              }
                            } catch {
                              // ignore non-JSON keep-alives
                            }
                          }
                        }
                        if (!acc) setPreviewError("No reply received from the bot.");
                      } catch (e: any) {
                        setPreviewError(e?.message ?? "Failed to generate preview");
                      } finally {
                        setPreviewLoading(false);
                      }
                    }}
                    disabled={!features.after_hours || !form.business_hours_enabled}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Preview after-hours response
                  </Button>
                </div>
                {!features.after_hours && (
                  <p className="text-xs text-muted-foreground">
                    Available on Growth plan and above.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Multilingual Support</CardTitle>
            </div>
            {!features.multilingual && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
          <CardDescription>
            Auto-detect the visitor's language and reply in it. Works with 100+ languages out of the box — Spanish, French, German, Portuguese, Mandarin, Arabic, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 p-4">
            <div className="space-y-1">
              <Label htmlFor="multilingual_enabled" className="text-sm font-medium">
                Reply in the visitor's language
              </Label>
              <p className="text-xs text-muted-foreground">
                {features.multilingual
                  ? "If a visitor writes in Spanish, the bot replies in Spanish. If they switch languages, the bot switches with them. Your knowledge base stays in English — translation happens on the fly."
                  : <>Available on the <strong>Premium</strong> plan (and free for Founder clients). <Link to="/pricing" className="text-primary underline">Upgrade →</Link></>}
              </p>
            </div>
            <Switch
              id="multilingual_enabled"
              checked={form.multilingual_enabled}
              onCheckedChange={(checked) => setForm({ ...form, multilingual_enabled: checked })}
              disabled={!features.multilingual}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              <CardTitle>Calendar Booking</CardTitle>
            </div>
            {!features.booking_link && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Essential+
              </Badge>
            )}
          </div>
          <CardDescription>
            {features.booking_link
              ? "Let visitors self-book on your calendar. Use Cal.com (free), Calendly, SavvyCal, TidyCal — or any booking link."
              : <>Calendar booking is included on the <strong>Essential</strong> plan and above. <Link to="/pricing" className="text-primary underline">Upgrade →</Link></>}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Don't have one yet? Set up Cal.com in 2 minutes.</p>
              <p className="text-xs text-muted-foreground">
                Free forever. Connects to Google, Outlook, Apple, Office 365. Sends invites + reminders automatically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" asChild className="gap-2">
                <a href="https://cal.com/signup" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  1. Sign up free
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <a href="https://app.cal.com/apps/categories/calendar" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  2. Connect your calendar
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <a href="https://app.cal.com/event-types" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  3. Create event type
                </a>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking_link">Your booking link</Label>
            <div className="flex gap-2">
              <Input
                id="booking_link"
                value={form.booking_link}
                onChange={(e) => setForm({ ...form, booking_link: e.target.value })}
                placeholder="https://cal.com/your-handle/30min"
                type="url"
                disabled={!features.booking_link}
              />
              {form.booking_link && (
                <Button variant="outline" size="icon" asChild title="Open link">
                  <a href={form.booking_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Paste your full URL after signing up. The bot will offer this link when it detects a hot lead ready to book.
            </p>
          </div>


          <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/20 p-4">
            <div className="space-y-1">
              <Label htmlFor="ask_for_preferred_time" className="text-sm font-medium">
                Fallback: ask for preferred time if they don't book
              </Label>
              <p className="text-xs text-muted-foreground">
                If a hot lead skips the booking link (or you don't have one), the bot asks for their preferred day/time. Captured in the Leads dashboard, webhooks, and email alerts.
              </p>
            </div>
            <Switch
              id="ask_for_preferred_time"
              checked={form.ask_for_preferred_time}
              onCheckedChange={(checked) => setForm({ ...form, ask_for_preferred_time: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {organizationId && (
        <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Install on your site
                </CardTitle>
                <CardDescription>
                  Step-by-step guides for WordPress, Shopify, Wix, Webflow, Framer & more — plus a "send to developer" handoff.
                </CardDescription>
              </div>
              <Button asChild className="gap-1.5">
                <Link to="/install">
                  Open install guide
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>Embed Code</CardTitle>
            <CardDescription>Copy this snippet and paste it into your client's website HTML, just before the closing &lt;/body&gt; tag</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`<script>
  (function() {
    var d = document, s = d.createElement('script');
    s.src = '${window.location.origin}/widget.js';
    s.setAttribute('data-org-id', '${organizationId}');
    s.defer = true;
    d.body.appendChild(s);
  })();
</script>`}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 gap-1.5"
                onClick={() => {
                  const snippet = `<script>\n  (function() {\n    var d = document, s = d.createElement('script');\n    s.src = '${window.location.origin}/widget.js';\n    s.setAttribute('data-org-id', '${organizationId}');\n    s.defer = true;\n    d.body.appendChild(s);\n  })();\n</script>`;
                  navigator.clipboard.writeText(snippet);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  toast({ title: "Copied!", description: "Embed code copied to clipboard." });
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This will load the chatbot widget on the page, configured for this organization.
            </p>
          </CardContent>
        </Card>
      )}

      {devMode && organizationId && <WidgetConfigValidator organizationId={organizationId} />}

      {organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>Client Access</CardTitle>
            <CardDescription>Create a login for your client so they can view their leads and dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="gap-2" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Create Client Login
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Clients see a simplified view — leads and stats only, no bot configuration.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end pb-6">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Client Login</DialogTitle>
            <DialogDescription>
              Set up an email and password for your client. They'll see a simplified dashboard with leads only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Client Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="client@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-password">Password</Label>
              <Input
                id="invite-password"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="Set a temporary password"
              />
              <p className="text-xs text-muted-foreground">Share this with your client so they can log in.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || !invitePassword.trim() || inviting}>
              {inviting ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>After-hours preview</DialogTitle>
            <DialogDescription>
              Simulating a visitor message sent outside your business hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Visitor</p>
              <p>Hi, I'm interested in your services. Can you help?</p>
            </div>
            <div className="rounded-md border px-3 py-2 text-sm min-h-[80px]">
              <p className="text-xs text-muted-foreground mb-1">{form.bot_name || "Bot"}</p>
              {previewLoading && !previewReply ? (
                <p className="text-muted-foreground italic">Generating reply…</p>
              ) : previewError ? (
                <p className="text-destructive">{previewError}</p>
              ) : (
                <p className="whitespace-pre-wrap">{previewReply}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
