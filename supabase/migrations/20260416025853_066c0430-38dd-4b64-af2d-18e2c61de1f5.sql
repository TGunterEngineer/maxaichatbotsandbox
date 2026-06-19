-- Create a restricted public view for widget use
CREATE VIEW public.org_widget_info AS
SELECT id, name, primary_color
FROM public.organizations;

-- Drop the overly permissive anonymous policy
DROP POLICY "Anyone can read org for widget" ON public.organizations;

-- Grant anonymous read on the view only
GRANT SELECT ON public.org_widget_info TO anon;