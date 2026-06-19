import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Globe, FileText, RefreshCw, Trash2, Plus, Loader2, AlertCircle, Upload, CheckCircle2, MapPin, Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useOrgFeatures, useKbLimit } from "@/hooks/useOrgFeatures";


interface KbSource {
  id: string;
  organization_id: string;
  kind: "website" | "file";
  label: string;
  url: string | null;
  file_path: string | null;
  content: string | null;
  char_count: number;
  auto_sync: boolean;
  last_synced_at: string | null;
  last_error: string | null;
}

const ACCEPTED_FILE_EXTS = ".pdf,.txt,.md,.markdown,.csv";
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

interface Props {
  organizationId: string;
}

export function KnowledgeBaseSources({ organizationId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { features } = useOrgFeatures();
  const { limit: kbLimit, isUnlimited: kbUnlimited } = useKbLimit();


  const [websiteOpen, setWebsiteOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [websiteAutoSync, setWebsiteAutoSync] = useState(true);
  const [gbOpen, setGbOpen] = useState(false);
  const [gbQuery, setGbQuery] = useState("");
  const [gbAutoSync, setGbAutoSync] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<KbSource | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: sources, isLoading } = useQuery({
    queryKey: ["kb_sources", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kb_sources")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KbSource[];
    },
  });

  const currentCount = sources?.length ?? 0;
  const atKbLimit = !kbUnlimited && currentCount >= kbLimit;

  // ---- Add website ----
  const addWebsite = useMutation({
    mutationFn: async () => {
      if (atKbLimit) {
        throw new Error(
          `Your plan allows ${kbLimit} knowledge source${kbLimit === 1 ? "" : "s"}. Upgrade for more.`,
        );
      }
      const url = websiteUrl.trim();
      if (!url) throw new Error("URL is required");
      let parsed: URL;
      try {
        parsed = new URL(url);
        if (!/^https?:$/.test(parsed.protocol)) throw new Error();
      } catch {
        throw new Error("Enter a valid http(s) URL");
      }
      const { data: inserted, error } = await supabase
        .from("kb_sources")
        .insert({
          organization_id: organizationId,
          kind: "website",
          label: parsed.hostname + parsed.pathname.replace(/\/$/, ""),
          url: parsed.toString(),
          auto_sync: websiteAutoSync,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Trigger initial scrape
      await supabase.functions.invoke("rescrape-source", { body: { source_id: inserted.id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kb_sources", organizationId] });
      setWebsiteOpen(false);
      setWebsiteUrl("");
      toast({ title: "Website added", description: "Initial sync started." });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't add website", description: e.message, variant: "destructive" }),
  });


  // ---- Add Google Business ----
  const addGoogleBusiness = useMutation({
    mutationFn: async () => {
      if (!features.google_business) {
        throw new Error("Google Business integration requires the Essential plan or higher.");
      }
      if (atKbLimit) {
        throw new Error(
          `Your plan allows ${kbLimit} knowledge source${kbLimit === 1 ? "" : "s"}. Upgrade for more.`,
        );
      }
      const q = gbQuery.trim();
      if (!q) throw new Error("Enter a Google Maps URL or business name + city");
      const { data, error } = await supabase.functions.invoke("enrich-google-business", {
        body: { organization_id: organizationId, query: q, auto_sync: gbAutoSync },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["kb_sources", organizationId] });
      setGbOpen(false);
      setGbQuery("");
      toast({
        title: "Google Business added",
        description: data?.business_name
          ? `Imported ${data.business_name} (${data.char_count?.toLocaleString() ?? 0} chars)`
          : "Imported successfully",
      });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't import", description: e.message, variant: "destructive" }),
  });

  // ---- Toggle auto-sync ----
  const toggleAutoSync = async (source: KbSource, value: boolean) => {
    const { error } = await supabase
      .from("kb_sources")
      .update({ auto_sync: value })
      .eq("id", source.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["kb_sources", organizationId] });
  };

  // ---- Re-sync website ----
  const resync = async (source: KbSource) => {
    setBusyId(source.id);
    try {
      const { error } = await supabase.functions.invoke("rescrape-source", {
        body: { source_id: source.id },
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["kb_sources", organizationId] });
      toast({ title: "Re-synced", description: source.label });
    } catch (e: any) {
      toast({ title: "Re-sync failed", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // ---- Upload file ----
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset
    if (!file) return;
    if (atKbLimit) {
      toast({
        title: "Source limit reached",
        description: `Your plan allows ${kbLimit} knowledge source${kbLimit === 1 ? "" : "s"}. Upgrade for more.`,
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${organizationId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("kb-files")
        .upload(path, file, { contentType: file.type || undefined });
      if (upErr) throw upErr;

      const { data: inserted, error: insErr } = await supabase
        .from("kb_sources")
        .insert({
          organization_id: organizationId,
          kind: "file",
          label: file.name,
          file_path: path,
          auto_sync: false,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const { error: parseErr } = await supabase.functions.invoke("parse-file", {
        body: { source_id: inserted.id },
      });
      if (parseErr) throw parseErr;

      qc.invalidateQueries({ queryKey: ["kb_sources", organizationId] });
      toast({ title: "File added", description: file.name });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ---- Delete source ----
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      if (pendingDelete.file_path) {
        await supabase.storage.from("kb-files").remove([pendingDelete.file_path]);
      }
      const { error } = await supabase.from("kb_sources").delete().eq("id", pendingDelete.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["kb_sources", organizationId] });
      toast({ title: "Removed", description: pendingDelete.label });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setPendingDelete(null);
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              Knowledge Sources
              <Badge variant="outline" className="text-xs font-normal">
                {currentCount}{kbUnlimited ? "" : ` / ${kbLimit}`}
              </Badge>
            </CardTitle>
            <CardDescription>
              Add websites or upload files. Websites with auto-sync refresh every Monday.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || atKbLimit}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_EXTS}
              onChange={handleFileSelected}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setGbOpen(true)}
              disabled={atKbLimit || !features.google_business}
              title={!features.google_business ? "Requires Essential plan or higher" : undefined}
            >
              {!features.google_business ? <Lock className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              Google Business
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setWebsiteOpen(true)}
              disabled={atKbLimit}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Website
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !sources || sources.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed rounded-md p-6 text-center">
            No sources yet. Add a website or upload a PDF/TXT/MD file to give your bot more context.
          </div>
        ) : (
          <ul className="divide-y">
            {sources.map((s) => (
              <li key={s.id} className="py-3 flex items-start gap-3">
                <div className="mt-0.5 text-muted-foreground">
                  {s.kind === "website" ? <Globe className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{s.label}</span>
                    {s.last_error ? (
                      <Badge variant="destructive" className="gap-1 text-[10px]">
                        <AlertCircle className="h-3 w-3" /> Error
                      </Badge>
                    ) : s.content ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> {s.char_count.toLocaleString()} chars
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Pending</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {s.url ?? s.file_path?.split("/").slice(1).join("/")}
                  </p>
                  {s.last_error && (
                    <p className="text-xs text-destructive mt-1">{s.last_error}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.last_synced_at
                      ? `Last synced ${new Date(s.last_synced_at).toLocaleDateString()}`
                      : "Not synced yet"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.kind === "website" && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={s.auto_sync}
                          onCheckedChange={(v) => toggleAutoSync(s, v)}
                          aria-label="Auto-sync weekly"
                        />
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">Weekly</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => resync(s)}
                        disabled={busyId === s.id}
                        aria-label="Re-sync now"
                      >
                        {busyId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(s)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Add website dialog */}
      <Dialog open={websiteOpen} onOpenChange={setWebsiteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a website</DialogTitle>
            <DialogDescription>
              The bot will scrape and learn from this page. Enable weekly auto-sync to keep it fresh.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kb-url">Website URL</Label>
              <Input
                id="kb-url"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com/about"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="kb-autosync" className="text-sm">Auto-sync weekly</Label>
                <p className="text-xs text-muted-foreground">Re-scrape every Monday at 3am UTC.</p>
              </div>
              <Switch
                id="kb-autosync"
                checked={websiteAutoSync}
                onCheckedChange={setWebsiteAutoSync}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebsiteOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addWebsite.mutate()}
              disabled={!websiteUrl.trim() || addWebsite.isPending}
              className="gap-1.5"
            >
              {addWebsite.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add & sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Google Business dialog */}
      <Dialog open={gbOpen} onOpenChange={setGbOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import from Google Business</DialogTitle>
            <DialogDescription>
              Paste your Google Maps URL or type business name + city. We'll pull hours, services, contact info, and recent reviews.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gb-query">Google Maps URL or business + city</Label>
              <Input
                id="gb-query"
                value={gbQuery}
                onChange={(e) => setGbQuery(e.target.value)}
                placeholder="https://maps.google.com/... or Joe's Pizza Chicago"
              />
              <p className="text-xs text-muted-foreground">
                Tip: pasting the Google Maps URL is most accurate.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="gb-autosync" className="text-sm">Auto-sync weekly</Label>
                <p className="text-xs text-muted-foreground">Refresh hours and reviews every Monday.</p>
              </div>
              <Switch id="gb-autosync" checked={gbAutoSync} onCheckedChange={setGbAutoSync} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGbOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addGoogleBusiness.mutate()}
              disabled={!gbQuery.trim() || addGoogleBusiness.isPending}
              className="gap-1.5"
            >
              {addGoogleBusiness.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MapPin className="h-3.5 w-3.5" />
              )}
              {addGoogleBusiness.isPending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this source?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.label}" will no longer be used by your bot. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
