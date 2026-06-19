
ALTER TABLE public.bot_configs
  ADD COLUMN IF NOT EXISTS webhook_secret text
    NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex');

-- Backfill existing rows that may have been created before the default existed.
UPDATE public.bot_configs
SET webhook_secret = encode(gen_random_bytes(32), 'hex')
WHERE webhook_secret IS NULL OR webhook_secret = '';
