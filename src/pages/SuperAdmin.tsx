import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Rocket, Users, BarChart3, Building2, Trash2, Crown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Auth from "@/pages/Auth";

export default function SuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Check admin role
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

  // Fetch all orgs with lead counts
  const { data: orgStats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin_org_stats"],
    queryFn: async () => {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("id, name, primary_color, created_at, plan_tier, plan_status")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get lead counts + usage per org
      const counts = await Promise.all(
        (orgs || []).map(async (org) => {
          const [{ count }, quotaRes, usageRes] = await Promise.all([
            supabase
              .from("leads")
              .select("*", { count: "exact", head: true })
              .eq("organization_id", org.id),
            supabase.rpc("get_org_quota", { _org_id: org.id }),
            supabase.rpc("get_org_usage", { _org_id: org.id }),
          ]);
          return {
            ...org,
            lead_count: count || 0,
            quota: (quotaRes.data as number | null) ?? 0,
            usage: (usageRes.data as number | null) ?? 0,
          };
        })
      );
      return counts;
    },
    enabled: !!isAdmin,
  });

  // Founder accounts overview
  const { data: founderData, isLoading: founderLoading } = useQuery({
    queryKey: ["admin_founder_accounts"],
    queryFn: async () => {
      const [subsRes, pendingRes, spotsRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id, organization_id, status, cancel_at_period_end, current_period_end, created_at, environment")
          .eq("stripe_price_id", "founder_monthly")
          .order("created_at", { ascending: false }),
        supabase
          .from("founder_pending_checkouts")
          .select("id, organization_id, expires_at, created_at")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false }),
        supabase.rpc("get_founder_spots"),
      ]);
      if (subsRes.error) throw subsRes.error;
      const subs = subsRes.data || [];
      const pending = pendingRes.data || [];
      const orgIds = Array.from(new Set([...subs, ...pending].map((r: any) => r.organization_id)));
      const nameMap = new Map<string, string>();
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);
        (orgs || []).forEach((o: any) => nameMap.set(o.id, o.name));
      }
      return {
        subs: subs.map((s: any) => ({ ...s, org_name: nameMap.get(s.organization_id) })),
        pending: pending.map((p: any) => ({ ...p, org_name: nameMap.get(p.organization_id) })),
        spots: (spotsRes.data as any)?.[0] ?? { taken: 0, total: 10, remaining: 10, is_open: true },
      };
    },
    enabled: !!isAdmin,
  });

  // Quick onboard form state
  const [form, setForm] = useState({
    business_name: "",
    client_email: "",
    password: "",
    primary_color: "#3B82F6",
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quick-onboard`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(form),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Onboarding failed");
      return result;
    },
    onSuccess: () => {
      toast({ title: "Client Onboarded! 🚀", description: `${form.business_name} is live. Share login credentials with the client.` });
      setForm({ business_name: "", client_email: "", password: "", primary_color: "#3B82F6" });
      queryClient.invalidateQueries({ queryKey: ["admin_org_stats"] });
      queryClient.invalidateQueries({ queryKey: ["user_organizations"] });
    },
    onError: (e: any) => {
      toast({ title: "Onboarding Failed", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.rpc("delete_organization" as any, { _org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Organization Deleted", description: "Organization and all related data removed." });
      queryClient.invalidateQueries({ queryKey: ["admin_org_stats"] });
      queryClient.invalidateQueries({ queryKey: ["user_organizations"] });
    },
    onError: (e: any) => {
      toast({ title: "Delete Failed", description: e.message, variant: "destructive" });
    },
  });

  const planMutation = useMutation({
    mutationFn: async ({ orgId, plan }: { orgId: string; plan: string }) => {
      const { error } = await supabase
        .from("organizations")
        .update({ plan_tier: plan as any })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Plan updated", description: "Organization plan changed." });
      queryClient.invalidateQueries({ queryKey: ["admin_org_stats"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      queryClient.invalidateQueries({ queryKey: ["user_organizations"] });
    },
    onError: (e: any) => {
      toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    },
  });

  // Redirect non-admins with toast
  useEffect(() => {
    if (!authLoading && !roleLoading && user && isAdmin === false) {
      toast({
        title: "Access Denied",
        description: "Admin Privileges Required",
        variant: "destructive",
      });
      navigate("/", { replace: true });
    }
  }, [authLoading, roleLoading, user, isAdmin, navigate, toast]);

  if (authLoading || roleLoading || (user && isAdmin === undefined)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Auth />;
  if (!isAdmin) return null;

  const totalLeads = orgStats?.reduce((sum, o) => sum + o.lead_count, 0) ?? 0;

  return (
    <div className="min-h-screen text-foreground bg-muted">
      {/* Header */}
      <div className="border-b border-border backdrop-blur-sm sticky top-0 z-10 bg-black">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Agency Command Center</h1>
              <p className="text-xs text-muted-foreground">Manage all client organizations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/super-admin/prospects")}>
              🎯 Prospects
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/super-admin/emails")}>
              📧 Email Delivery
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = "/"}>
              ← Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{orgStats?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Organizations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
                <p className="text-xs text-muted-foreground">Total Leads Captured</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {orgStats && orgStats.length > 0 ? Math.round(totalLeads / orgStats.length) : 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg Leads / Org</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Onboard Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle>Quick Onboard</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Create a new client organization, bot config, and login in one step</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  placeholder="Acme Plumbing Co."
                />
              </div>
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input
                  type="email"
                  value={form.client_email}
                  onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                  placeholder="owner@acmeplumbing.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Set a strong temporary password"
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={() => onboardMutation.mutate()}
              disabled={!form.business_name.trim() || !form.client_email.trim() || !form.password.trim() || onboardMutation.isPending}
              className="mt-6"
            >
              <Rocket className="h-4 w-4 mr-2" />
              {onboardMutation.isPending ? "Onboarding..." : "Onboard Client"}
            </Button>
          </CardContent>
        </Card>

        {/* Founder Accounts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                <CardTitle>Founder Accounts</CardTitle>
              </div>
              <div className="text-sm text-muted-foreground">
                {founderData?.spots.taken ?? 0} / {founderData?.spots.total ?? 10} spots taken
                <span className="ml-2 text-foreground font-medium">
                  ({founderData?.spots.remaining ?? 10} remaining)
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Founder-tier subscriptions and active checkout reservations</p>
          </CardHeader>
          <CardContent>
            {founderLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Env</TableHead>
                      <TableHead className="text-right">Renews / Expires</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(founderData?.subs.length ?? 0) === 0 && (founderData?.pending.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No founder accounts yet. All 10 spots are open.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {founderData?.subs.map((s: any) => {
                          const canceled = s.status === "canceled" || s.cancel_at_period_end;
                          const variant = s.status === "active" && !s.cancel_at_period_end
                            ? "default"
                            : canceled
                            ? "destructive"
                            : "secondary";
                          const label = s.status === "active" && s.cancel_at_period_end
                            ? "Canceling"
                            : s.status;
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium text-foreground">
                                {s.org_name ?? s.organization_id}
                              </TableCell>
                              <TableCell>
                                <Badge variant={variant as any}>{label}</Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground uppercase">
                                {s.environment}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {s.current_period_end
                                  ? new Date(s.current_period_end).toLocaleDateString()
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {new Date(s.created_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {founderData?.pending.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium text-foreground">
                              {p.org_name ?? p.organization_id}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">Pending checkout</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">—</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              expires {new Date(p.expires_at).toLocaleTimeString()}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>



        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Organizations</CardTitle>
            <p className="text-sm text-muted-foreground">Every client organization and their lead performance</p>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
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
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Usage (this month)</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgStats && orgStats.length > 0 ? (
                      orgStats.map((org) => {
                        const isUnlimited = (org.quota ?? 0) >= 2_000_000_000;
                        const percent = isUnlimited
                          ? 0
                          : Math.min(100, Math.round((org.usage / Math.max(org.quota, 1)) * 100));
                        const usageColor =
                          !isUnlimited && org.usage >= org.quota
                            ? "text-destructive"
                            : !isUnlimited && percent >= 80
                            ? "text-amber-500"
                            : "text-muted-foreground";
                        return (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full border"
                                style={{ backgroundColor: org.primary_color || "#3B82F6" }}
                              />
                              {org.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={(org as any).plan_tier ?? "growth"}
                              onValueChange={(v) => planMutation.mutate({ orgId: org.id, plan: v })}
                            >
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="essential">Essential (500)</SelectItem>
                                <SelectItem value="growth">Growth (2,000)</SelectItem>
                                <SelectItem value="premium">Premium (∞)</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className={`text-sm font-medium ${usageColor}`}>
                            {org.usage.toLocaleString()} / {isUnlimited ? "∞" : org.quota.toLocaleString()}
                            {!isUnlimited && (
                              <span className="ml-2 text-xs text-muted-foreground">({percent}%)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={org.lead_count > 0 ? "default" : "secondary"}>
                              {org.lead_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {new Date(org.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{org.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the organization, all leads ({org.lead_count}), bot config, chat history, and user memberships. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(org.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Organization
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No organizations yet. Use Quick Onboard to create your first client.
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
