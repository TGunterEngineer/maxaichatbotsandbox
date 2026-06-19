ALTER TABLE public.bot_configs
  ADD COLUMN IF NOT EXISTS business_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_hours_timezone text NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS business_hours_start text NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS business_hours_end text NOT NULL DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS business_hours_days int[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  ADD COLUMN IF NOT EXISTS after_hours_message text NOT NULL DEFAULT 'Thanks for reaching out! Our team is currently offline, but if you leave your email I''ll make sure someone gets back to you first thing.',
  ADD COLUMN IF NOT EXISTS multilingual_enabled boolean NOT NULL DEFAULT false;