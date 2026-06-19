import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { WidgetPreview } from "@/components/WidgetPreview";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Preview() {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: botConfig, isLoading } = useQuery({
    queryKey: ["bot_config_preview", organizationId],
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

  const shareUrl = `${window.location.origin}/preview`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Widget Demo</h2>
          <p className="text-muted-foreground">A full-page preview showing how your chatbot appears on a real website.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ title: "Link copied", description: "Share this preview with your client." });
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy share link"}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Mock website</CardTitle>
          <CardDescription>The widget appears in the bottom-right corner, just like on your client's site.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-muted/40 via-background to-muted/30 border-t min-h-[640px] overflow-hidden">
            {/* Fake website content */}
            <div className="max-w-4xl mx-auto px-8 py-16 space-y-8 opacity-70">
              <div className="space-y-3">
                <div className="h-3 w-32 bg-muted rounded" />
                <div className="h-10 w-3/4 bg-muted rounded" />
                <div className="h-10 w-1/2 bg-muted rounded" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-32 bg-muted rounded-lg" />
                <div className="h-32 bg-muted rounded-lg" />
                <div className="h-32 bg-muted rounded-lg" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-4/6" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 bg-muted rounded-lg" />
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            </div>

            {/* Widget anchored bottom-right */}
            <div className="absolute bottom-6 right-6">
              <WidgetPreview
                botName={botConfig?.bot_name ?? "Chatbot"}
                welcomeMessage={botConfig?.welcome_message ?? "Hello! How can I help you today?"}
                brandColor="hsl(var(--primary))"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Try the real widget</CardTitle>
          <CardDescription>This page shows a styled preview of your widget. To use it on your live site, copy the install snippet from Bot Settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="gap-2">
            <a href="/bot-settings" >
              <ExternalLink className="h-4 w-4" />
              Get embed code
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
