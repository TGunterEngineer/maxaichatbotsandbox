import { useMemo, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { MessageSquare, CheckCircle2, Circle, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatRow {
  id: string;
  role: string;
  content: string;
  created_at: string;
  session_id: string;
}

interface SessionSummaryRow {
  session_id: string;
  message_count: number;
  first_message_at: string;
  last_message_at: string;
  first_message_content: string | null;
  associated_lead_email: string | null;
  total_count: number;
}

interface SessionSummary {
  session_id: string;
  first_message: string;
  message_count: number;
  started_at: string;
  ended_at: string;
  duration_min: number;
  has_lead: boolean;
  lead_email: string | null;
}

const PAGE_SIZE = 20;

export default function Conversations() {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<SessionSummary | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SessionSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Server-side aggregated + paginated session list.
  const { data, isLoading } = useQuery({
    queryKey: ["session_summaries", organizationId, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_session_summaries", {
        _org_id: organizationId!,
        _limit: PAGE_SIZE,
        _offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      const rows = (data ?? []) as SessionSummaryRow[];
      const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
      const sessions: SessionSummary[] = rows.map((r) => {
        const started = r.first_message_at;
        const ended = r.last_message_at;
        const duration_min = Math.max(
          0,
          Math.round((new Date(ended).getTime() - new Date(started).getTime()) / 60000),
        );
        return {
          session_id: r.session_id,
          first_message: r.first_message_content ?? "",
          message_count: r.message_count,
          started_at: started,
          ended_at: ended,
          duration_min,
          has_lead: !!r.associated_lead_email,
          lead_email: r.associated_lead_email,
        };
      });
      return { sessions, total };
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
  });

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: ["conv_transcript", selected?.session_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("session_id", selected!.session_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChatRow[];
    },
    enabled: !!selected?.session_id && !!organizationId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["session_summaries", organizationId] });
  };

  const deleteSession = async (session_id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("chat_history")
        .delete()
        .eq("organization_id", organizationId!)
        .eq("session_id", session_id);
      if (error) throw error;
      toast({ title: "Conversation deleted" });
      refresh();
      setConfirmDelete(null);
      if (selected?.session_id === session_id) setSelected(null);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const empty = !isLoading && sessions.length === 0 && page === 0;

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Conversations</h2>
          <p className="text-muted-foreground">
            Every chat session — including visitors who didn't convert.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <Sparkles className="inline h-3 w-3 mr-1" />
            Auto-cleanup: conversations with no lead are removed after 3 days.
          </p>
        </div>
      </div>

      {empty ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="mx-auto h-10 w-10 mb-3 opacity-50" />
          <p>No conversations yet. They'll appear here as visitors chat with your bot.</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">First message</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const isBounce = s.message_count <= 2;
                  return (
                    <TableRow key={s.session_id}>
                      <TableCell className="font-medium max-w-0">
                        <div className="truncate text-sm" title={s.first_message}>
                          {s.first_message || <span className="text-muted-foreground">(empty)</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isBounce ? "outline" : "secondary"}>
                          {s.message_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.duration_min === 0 ? "<1m" : `${s.duration_min}m`}
                      </TableCell>
                      <TableCell>
                        {s.has_lead ? (
                          <Badge className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Lead
                          </Badge>
                        ) : isBounce ? (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <Circle className="h-3 w-3" />
                            Bounce
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Circle className="h-3 w-3" />
                            Visitor
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(s.started_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => setSelected(s)}>
                            <MessageSquare className="mr-1 h-4 w-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmDelete(s)}
                            title="Delete conversation"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(0, p - 1));
                    }}
                    className={page === 0 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm text-muted-foreground">
                    Page {page + 1} of {pageCount} · {total} total
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(pageCount - 1, p + 1));
                    }}
                    className={page >= pageCount - 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected?.lead_email
                ? `Conversation with ${selected.lead_email}`
                : "Visitor conversation"}
            </DialogTitle>
            <DialogDescription>
              {selected && (
                <>
                  {selected.message_count} messages ·{" "}
                  {selected.duration_min === 0 ? "<1m" : `${selected.duration_min}m`} ·{" "}
                  {new Date(selected.started_at).toLocaleString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {transcriptLoading ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : transcript && transcript.length > 0 ? (
              <div className="space-y-3 p-2">
                {transcript.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">No transcript available.</p>
            )}
          </ScrollArea>
          {selected && (
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(selected)}
                className="text-destructive hover:text-destructive gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete conversation
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the chat transcript. Any captured lead is kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={() => confirmDelete && deleteSession(confirmDelete.session_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
