ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_time text;
ALTER TABLE public.bot_configs ADD COLUMN IF NOT EXISTS ask_for_preferred_time boolean NOT NULL DEFAULT true;