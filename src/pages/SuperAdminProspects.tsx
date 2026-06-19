import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Shield, ExternalLink, Trash2, Mail, Phone, Globe, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Auth from "@/pages/Auth";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "converted", "rejected"];

export default function SuperAdminProspects() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      return !!data;
    },
    enabled: !!user,
  });

  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [enrichEmails, setEnrichEmails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [textFilter, setTextFilter] = useState("");

  const { data: prospects, isLoading: prospectsLoading } = useQuery({
    queryKey: ["admin_prospects", statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("admin_prospects" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!isAdmin,
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-prospects`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ query, limit, enrich_emails: enrichEmails }),
        },
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Search failed");
      return result;
    },
    onSuccess: (r) => {
      toast({
        title: "Search complete",
        description: `${r.inserted} new prospects added (${r.skipped} duplicates skipped, ${r.total_found} found total).`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin_prospects"] });
    },
    onError: (e: any) => {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from("admin_prospects" as any) as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin_prospects"] }),
    onError: (e: any) =>
      toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_prospects" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Prospect deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin_prospects"] });
    },
  });

  if (authLoading || roleLoading || (user && isAdmin === undefined)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Auth />;
  if (!isAdmin) {
    navigate("/", { replace: true });
    return null;
  }

  const filtered = (prospects ?? []).filter((p) => {
    if (!textFilter.trim()) return true;
    const t = textFilter.toLowerCase();
    return (
      p.name?.toLowerCase().includes(t) ||
      p.city?.toLowerCase().includes(t) ||
      p.category?.toLowerCase().includes(t) ||
      p.search_query?.toLowerCase().includes(t)
    );
  });

  return (
    <div className="min-h-screen text-foreground bg-muted">
      <div className="border-b border-border backdrop-blur-sm sticky top-0 z-10 bg-black">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Prospect Finder</h1>
              <p className="text-xs text-muted-foreground">Search Google Maps for new client leads</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate("/super-admin")}>
            ← Super Admin
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Search Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <CardTitle>Find Businesses</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Examples: "plumbers in Dallas", "dentists Miami FL", "law firms London". Costs ~1 Outscraper credit per result.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr,140px] gap-4">
              <div className="space-y-2">
                <Label>Search query</Label>
                <Textarea
                  rows={2}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="plumbers in Dallas, TX"
                />
              </div>
              <div className="space-y-2">
                <Label>Max results</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 20)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="enrich"
                checked={enrichEmails}
                onCheckedChange={(v) => setEnrichEmails(!!v)}
              />
              <Label htmlFor="enrich" className="cursor-pointer text-sm">
                Enrich with email addresses (slower, +1 credit per website)
              </Label>
            </div>
            <Button
              onClick={() => searchMutation.mutate()}
              disabled={!query.trim() || searchMutation.isPending}
            >
              <Search className="h-4 w-4 mr-2" />
              {searchMutation.isPending ? "Searching..." : "Search Google Maps"}
            </Button>
          </CardContent>
        </Card>

        {/* Prospects Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>Prospects ({filtered.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Filter by name, city, category..."
                  value={textFilter}
                  onChange={(e) => setTextFilter(e.target.value)}
                  className="w-64"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {prospectsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Business</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? (
                      filtered.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="max-w-xs">
                            <div className="font-medium text-foreground">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {[p.category, p.city, p.country].filter(Boolean).join(" · ")}
                            </div>
                            {p.search_query && (
                              <div className="text-[10px] text-muted-foreground/70 mt-1 italic">
                                from: "{p.search_query}"
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              {p.phone && (
                                <div className="flex items-center gap-1.5 text-foreground">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>
                                </div>
                              )}
                              {p.email && (
                                <div className="flex items-center gap-1.5 text-foreground">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <a href={`mailto:${p.email}`} className="hover:underline truncate max-w-[180px] inline-block">{p.email}</a>
                                </div>
                              )}
                              {p.website && (
                                <div className="flex items-center gap-1.5 text-foreground">
                                  <Globe className="h-3 w-3 text-muted-foreground" />
                                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[180px] inline-block">
                                    {p.website.replace(/^https?:\/\//, "")}
                                  </a>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {p.rating ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                                <span className="font-medium">{p.rating}</span>
                                <span className="text-xs text-muted-foreground">({p.reviews_count ?? 0})</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={p.status}
                              onValueChange={(v) => updateStatus.mutate({ id: p.id, status: v })}
                            >
                              <SelectTrigger className="h-8 w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {p.google_maps_url && (
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                  <a href={p.google_maps_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => deleteMutation.mutate(p.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No prospects yet. Run a search above to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
