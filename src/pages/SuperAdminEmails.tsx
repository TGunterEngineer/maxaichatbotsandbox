import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import Auth from "@/pages/Auth";

type Row = {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: any;
  created_at: string;
};

const RANGES = [
  { label: "Last 24h", value: "1" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "All time", value: "all" },
];

function statusBadge(status: string) {
  const map: Record<string, { variant: any; cls: string }> = {
    sent: { variant: "default", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    pending: { variant: "outline", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    bounced: { variant: "destructive", cls: "" },
    complained: { variant: "destructive", cls: "" },
    suppressed: { variant: "outline", cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
    dlq: { variant: "destructive", cls: "" },
    failed: { variant: "destructive", cls: "" },
  };
  const cfg = map[status] ?? { variant: "outline", cls: "" };
  return (
    <Badge variant={cfg.variant} className={cfg.cls}>
      {status}
    </Badge>
  );
}

export default function SuperAdminEmails() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState("7");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    if (!authLoading && !roleLoading && user && isAdmin === false) {
      navigate("/");
    }
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

  const sinceISO = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - parseInt(range, 10));
    return d.toISOString();
  }, [range]);

  const { data: orgs } = useQuery({
    queryKey: ["admin_orgs_simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!isAdmin,
  });

  const { data: rawRows, isLoading: rowsLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin_email_log", sinceISO],
    queryFn: async () => {
      let q = supabase
        .from("email_send_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (sinceISO) q = q.gte("created_at", sinceISO);
      const { data, error } = await q;
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
    enabled: !!isAdmin,
  });

  const dedupedRows = useMemo(() => {
    if (!rawRows) return [] as Row[];
    const latestByMsg = new Map<string, Row>();
    const noId: Row[] = [];
    for (const r of rawRows) {
      if (!r.message_id) {
        noId.push(r);
        continue;
      }
      const existing = latestByMsg.get(r.message_id);
      if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
        latestByMsg.set(r.message_id, r);
      }
    }
    return [...latestByMsg.values(), ...noId].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [rawRows]);

  const orgNameById = useMemo(() => {
    const m = new Map<string, string>();
    (orgs ?? []).forEach((o) => m.set(o.id, o.name));
    return m;
  }, [orgs]);

  const enriched = useMemo(
    () =>
      dedupedRows.map((r) => {
        const orgId = r.metadata?.organization_id ?? null;
        return {
          ...r,
          orgId,
          orgName: orgId ? orgNameById.get(orgId) ?? "—" : "—",
        };
      }),
    [dedupedRows, orgNameById]
  );

  const templateOptions = useMemo(() => {
    const s = new Set<string>();
    enriched.forEach((r) => s.add(r.template_name));
    return Array.from(s).sort();
  }, [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (templateFilter !== "all" && r.template_name !== templateFilter) return false;
      if (orgFilter !== "all" && r.orgId !== orgFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !r.recipient_email.toLowerCase().includes(s) &&
          !(r.error_message ?? "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [enriched, statusFilter, templateFilter, orgFilter, search]);

  const stats = useMemo(() => {
    const s = { total: 0, sent: 0, pending: 0, failed: 0, suppressed: 0 };
    for (const r of filtered) {
      s.total++;
      if (r.status === "sent") s.sent++;
      else if (r.status === "pending") s.pending++;
      else if (["bounced", "complained", "dlq", "failed"].includes(r.status)) s.failed++;
      else if (r.status === "suppressed") s.suppressed++;
    }
    return s;
  }, [filtered]);

  const perOrg = useMemo(() => {
    const m = new Map<
      string,
      { name: string; sent: number; pending: number; failed: number; suppressed: number; lastError: string | null; lastErrorAt: string | null }
    >();
    for (const r of filtered) {
      const id = r.orgId ?? "unknown";
      const name = r.orgName ?? "Unknown";
      const cur = m.get(id) ?? {
        name,
        sent: 0,
        pending: 0,
        failed: 0,
        suppressed: 0,
        lastError: null,
        lastErrorAt: null,
      };
      if (r.status === "sent") cur.sent++;
      else if (r.status === "pending") cur.pending++;
      else if (["bounced", "complained", "dlq", "failed"].includes(r.status)) cur.failed++;
      else if (r.status === "suppressed") cur.suppressed++;
      if (r.error_message && (!cur.lastErrorAt || r.created_at > cur.lastErrorAt)) {
        cur.lastError = r.error_message;
        cur.lastErrorAt = r.created_at;
      }
      m.set(id, cur);
    }
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.failed - a.failed || b.sent - a.sent);
  }, [filtered]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!user) return <Auth />;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Email Delivery</h1>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger><SelectValue placeholder="Time range" /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="complained">Complained</SelectItem>
                <SelectItem value="suppressed">Suppressed</SelectItem>
                <SelectItem value="dlq">DLQ (failed)</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All templates</SelectItem>
                {templateOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger><SelectValue placeholder="Organization" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {(orgs ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Search recipient or error..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Sent", value: stats.sent },
            { label: "Pending", value: stats.pending },
            { label: "Failed", value: stats.failed },
            { label: "Suppressed", value: stats.suppressed },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Per organization</CardTitle>
          </CardHeader>
          <CardContent>
            {rowsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : perOrg.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emails in this range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Suppressed</TableHead>
                    <TableHead>Last error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perOrg.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell>{o.sent}</TableCell>
                      <TableCell>{o.pending}</TableCell>
                      <TableCell>
                        {o.failed > 0 ? (
                          <span className="text-destructive font-medium">{o.failed}</span>
                        ) : (
                          0
                        )}
                      </TableCell>
                      <TableCell>{o.suppressed}</TableCell>
                      <TableCell className="max-w-[320px]">
                        {o.lastError ? (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                            <span className="truncate" title={o.lastError}>
                              {o.lastError}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Email log <span className="text-muted-foreground font-normal">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rowsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching emails.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 200).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">{r.template_name}</TableCell>
                        <TableCell className="text-xs">{r.recipient_email}</TableCell>
                        <TableCell className="text-xs">{r.orgName}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="max-w-[360px]">
                          {r.error_message ? (
                            <span
                              className="text-xs text-muted-foreground line-clamp-2"
                              title={r.error_message}
                            >
                              {r.error_message}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length > 200 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Showing latest 200 of {filtered.length}. Narrow your filters to see more.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
