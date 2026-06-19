-- Allow org members to delete their org's chat history
CREATE POLICY "Org members can delete chat history"
ON public.chat_history
FOR DELETE
TO authenticated
USING (is_org_member(auth.uid(), organization_id));

-- Enable extensions for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;