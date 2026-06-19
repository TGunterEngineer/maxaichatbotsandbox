-- 1. kb_sources table
CREATE TYPE public.kb_source_kind AS ENUM ('website', 'file');

CREATE TABLE public.kb_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  kind public.kb_source_kind NOT NULL,
  label text NOT NULL,
  url text,
  file_path text,
  content text,
  char_count integer NOT NULL DEFAULT 0,
  auto_sync boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_sources_org ON public.kb_sources(organization_id);
CREATE INDEX idx_kb_sources_autosync ON public.kb_sources(auto_sync, last_synced_at) WHERE auto_sync = true;

ALTER TABLE public.kb_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view kb sources"
  ON public.kb_sources FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members insert kb sources"
  ON public.kb_sources FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members update kb sources"
  ON public.kb_sources FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members delete kb sources"
  ON public.kb_sources FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE TRIGGER kb_sources_set_updated_at
  BEFORE UPDATE ON public.kb_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. kb-files private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kb-files', 'kb-files', false)
ON CONFLICT (id) DO NOTHING;

-- File path convention: <organization_id>/<uuid>-<filename>
CREATE POLICY "Org members read kb files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kb-files'
    AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Org members upload kb files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kb-files'
    AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Org members delete kb files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kb-files'
    AND public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );