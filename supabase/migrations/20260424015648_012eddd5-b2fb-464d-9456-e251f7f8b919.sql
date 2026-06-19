
CREATE TABLE public.admin_prospects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  email text,
  website text,
  address text,
  city text,
  country text,
  category text,
  rating numeric,
  reviews_count integer,
  google_maps_url text,
  place_id text,
  search_query text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX admin_prospects_place_id_key ON public.admin_prospects(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX admin_prospects_status_idx ON public.admin_prospects(status);
CREATE INDEX admin_prospects_created_at_idx ON public.admin_prospects(created_at DESC);

ALTER TABLE public.admin_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view prospects"
  ON public.admin_prospects FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert prospects"
  ON public.admin_prospects FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prospects"
  ON public.admin_prospects FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prospects"
  ON public.admin_prospects FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_prospects_updated_at
  BEFORE UPDATE ON public.admin_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
