import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Code, ExternalLink, AlertCircle, CheckCircle2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Install() {
  const { organizationId, organization } = useOrganization();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Detect installs by checking chat_history for any messages from public sessions
  const { data: installStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["install_status", organizationId],
    queryFn: async () => {
      const { count } = await supabase
        .from("chat_history")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!);
      return { detected: (count ?? 0) > 0, messageCount: count ?? 0 };
    },
    enabled: !!organizationId,
    refetchInterval: 15_000, // poll while user is on this page
  });

  const widgetOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://chat.maximumaiconsulting.com";

  const embedSnippet = useMemo(() => {
    if (!organizationId) return "";
    return `<script>
  (function() {
    var d = document, s = d.createElement('script');
    s.src = '${widgetOrigin}/widget.js';
    s.setAttribute('data-org-id', '${organizationId}');
    s.defer = true;
    d.body.appendChild(s);
  })();
</script>`;
  }, [organizationId, widgetOrigin]);

  const copy = (text: string, label = "Snippet") => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: `${label} copied`, description: "Paste it into your site." });
  };

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Install your chatbot</h2>
        <p className="text-muted-foreground">
          One snippet — paste it into your site and the widget appears in the bottom-right corner.
        </p>
      </div>

      {/* Install detection status */}
      {statusLoading ? (
        <Skeleton className="h-16" />
      ) : installStatus?.detected ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">Widget detected & active</p>
              <p className="text-xs text-muted-foreground">
                {installStatus.messageCount.toLocaleString()} messages received from your visitors.
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
              Live
            </Badge>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">Widget not yet detected</p>
              <p className="text-xs text-muted-foreground">
                Once you paste the snippet and someone chats with the bot, you'll see it confirmed here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* The snippet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="h-4 w-4 text-primary" />
            Your embed snippet
          </CardTitle>
          <CardDescription>
            Paste this just before the closing <code className="text-xs">&lt;/body&gt;</code> tag on every page where you want the bot to appear.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted rounded-lg p-4 pr-24 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {embedSnippet}
            </pre>
            <Button
              variant="default"
              size="sm"
              className="absolute top-2 right-2 gap-1.5"
              onClick={() => copy(embedSnippet, "Embed code")}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Platform-specific guides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Install instructions by platform
          </CardTitle>
          <CardDescription>Pick the platform your website runs on.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="wordpress">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              <TabsTrigger value="shopify">Shopify</TabsTrigger>
              <TabsTrigger value="wix">Wix</TabsTrigger>
              <TabsTrigger value="squarespace">Squarespace</TabsTrigger>
              <TabsTrigger value="webflow">Webflow</TabsTrigger>
              <TabsTrigger value="framer">Framer</TabsTrigger>
              <TabsTrigger value="ghost">Ghost</TabsTrigger>
              <TabsTrigger value="html">Plain HTML</TabsTrigger>
              <TabsTrigger value="developer">Send to dev</TabsTrigger>
            </TabsList>

            <TabsContent value="wordpress" className="mt-4 space-y-3 text-sm">
              <p className="font-medium">Easiest method (no plugin):</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                <li>In WordPress admin, go to <strong>Appearance → Theme File Editor</strong>.</li>
                <li>Open <code>footer.php</code>.</li>
                <li>Paste the snippet just before the closing <code>&lt;/body&gt;</code> tag.</li>
                <li>Click <strong>Update File</strong>. Done.</li>
              </ol>
              <p className="font-medium mt-3">Or with a plugin:</p>
              <p className="text-muted-foreground">
                Install the free <strong>"Insert Headers and Footers"</strong> plugin → Settings → paste the snippet in the <strong>"Scripts in Footer"</strong> box → Save.
              </p>
            </TabsContent>

            <TabsContent value="shopify" className="mt-4 space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>From Shopify admin → <strong>Online Store → Themes</strong>.</li>
                <li>Click <strong>Actions → Edit code</strong> on your active theme.</li>
                <li>In the Layout folder, open <code>theme.liquid</code>.</li>
                <li>Paste the snippet just before the closing <code>&lt;/body&gt;</code> tag.</li>
                <li>Click <strong>Save</strong>.</li>
              </ol>
            </TabsContent>

            <TabsContent value="wix" className="mt-4 space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>In your Wix dashboard → <strong>Settings → Custom Code</strong>.</li>
                <li>Click <strong>+ Add Custom Code</strong>.</li>
                <li>Paste the snippet, name it "MaximumAI Chatbot".</li>
                <li>Add to: <strong>All pages</strong>. Place code in: <strong>Body — end</strong>.</li>
                <li>Click <strong>Apply</strong>.</li>
              </ol>
              <p className="text-xs text-muted-foreground italic">
                Requires a paid Wix plan — free Wix sites don't allow custom code.
              </p>
            </TabsContent>

            <TabsContent value="squarespace" className="mt-4 space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>From your site → <strong>Settings → Advanced → Code Injection</strong>.</li>
                <li>Paste the snippet into the <strong>Footer</strong> box.</li>
                <li>Click <strong>Save</strong>.</li>
              </ol>
              <p className="text-xs text-muted-foreground italic">
                Requires a Business plan or higher.
              </p>
            </TabsContent>

            <TabsContent value="webflow" className="mt-4 space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>In your Webflow project → <strong>Project Settings → Custom Code</strong>.</li>
                <li>Paste the snippet into <strong>Footer Code</strong>.</li>
                <li>Click <strong>Save Changes</strong>, then <strong>Publish</strong> your site.</li>
              </ol>
            </TabsContent>

            <TabsContent value="framer" className="mt-4 space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open your Framer project → <strong>Site Settings → General → Custom Code</strong>.</li>
                <li>Paste the snippet into <strong>End of &lt;body&gt; tag</strong>.</li>
                <li>Click <strong>Save</strong> and republish.</li>
              </ol>
            </TabsContent>

            <TabsContent value="ghost" className="mt-4 space-y-3 text-sm">
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>In Ghost admin → <strong>Settings → Code injection</strong>.</li>
                <li>Paste the snippet into the <strong>Site Footer</strong> box.</li>
                <li>Click <strong>Save</strong>.</li>
              </ol>
            </TabsContent>

            <TabsContent value="html" className="mt-4 space-y-3 text-sm">
              <p className="text-muted-foreground">
                Open every HTML file where you want the bot to appear, paste the snippet just before the closing
                <code className="mx-1">&lt;/body&gt;</code> tag, and re-upload to your server.
              </p>
            </TabsContent>

            <TabsContent value="developer" className="mt-4 space-y-3 text-sm">
              <p className="text-muted-foreground">
                Forward this email to whoever manages your website:
              </p>
              <DevEmailBlock orgName={organization?.name || "our team"} snippet={embedSnippet} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Need help */}
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-medium text-sm">Stuck installing?</p>
            <p className="text-xs text-muted-foreground">
              Email us your site URL and we'll handle the install for you.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="mailto:support@maximumaiconsulting.com?subject=Install%20help">
              Get install help
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" asChild>
          <Link to="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function DevEmailBlock({ orgName, snippet }: { orgName: string; snippet: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const subject = `Please install the ${orgName} chatbot snippet`;
  const body = `Hi,

Please install the following snippet on our website. It should be pasted just before the closing </body> tag on every page where the chatbot should appear.

${snippet}

Once installed, the chat widget will appear in the bottom-right corner of the site. Let me know when it's live so I can verify.

Thanks!`;
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="space-y-2">
      <div className="relative">
        <pre className="bg-muted rounded-lg p-4 pr-24 text-xs whitespace-pre-wrap">{body}</pre>
        <Button
          variant="default"
          size="sm"
          className="absolute top-2 right-2 gap-1.5"
          onClick={() => {
            navigator.clipboard.writeText(body);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ title: "Email body copied" });
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Button asChild size="sm" variant="outline">
        <a href={mailto}>Open in email app</a>
      </Button>
    </div>
  );
}
