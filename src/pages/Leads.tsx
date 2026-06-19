import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function Leads() {
  const { organizationId } = useOrganization();
  const [selectedLead, setSelectedLead] = useState<{ email: string; session_id: string | null } | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: ["transcript", selectedLead?.session_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("session_id", selectedLead!.session_id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!selectedLead?.session_id && !!organizationId,
  });

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Leads</h2>
        <p className="text-muted-foreground">Contacts captured by your chatbot.</p>
      </div>

      {leads && leads.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Preferred Time</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Transcript</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.email ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {lead.preferred_time ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-primary">
                        {lead.preferred_time}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{lead.source ?? "chatbot"}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!lead.session_id}
                      onClick={() => setSelectedLead({ email: lead.email ?? "Unknown", session_id: lead.session_id })}
                    >
                      <MessageSquare className="mr-1 h-4 w-4" />
                      View Transcript
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No leads yet. They'll appear here once your chatbot starts capturing contacts.</p>
        </div>
      )}

      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conversation with {selectedLead?.email}</DialogTitle>
            <DialogDescription>Full chat transcript from the chatbot session.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {transcriptLoading ? (
              <div className="space-y-3 p-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : transcript && transcript.length > 0 ? (
              <div className="space-y-3 p-2">
                {transcript.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
