-- Popup Reliability Improvements
-- This migration adds observability and debugging capabilities for popup failures

-- Create popup_blocks table to track blocked popup attempts
CREATE TABLE IF NOT EXISTS public.popup_blocks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rule_id uuid REFERENCES public.popup_rules(id) ON DELETE SET NULL,
  source_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  reminder_id uuid REFERENCES public.reminders(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  block_reason text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS popup_blocks_user_id_idx ON public.popup_blocks(user_id);
CREATE INDEX IF NOT EXISTS popup_blocks_user_created_idx ON public.popup_blocks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS popup_blocks_rule_id_idx ON public.popup_blocks(rule_id);
CREATE INDEX IF NOT EXISTS popup_blocks_block_reason_idx ON public.popup_blocks(block_reason);
CREATE INDEX IF NOT EXISTS popup_blocks_created_at_idx ON public.popup_blocks(created_at DESC);

-- RLS policies
ALTER TABLE public.popup_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own popup blocks" ON public.popup_blocks;
CREATE POLICY "Users can view their own popup blocks"
  ON public.popup_blocks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert popup blocks" ON public.popup_blocks;
CREATE POLICY "System can insert popup blocks"
  ON public.popup_blocks FOR INSERT
  WITH CHECK (true); -- Allow service role to insert

-- Create popup_creation_attempts table for debugging event logging issues
CREATE TABLE IF NOT EXISTS public.popup_creation_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reminder_id uuid REFERENCES public.reminders(id) ON DELETE SET NULL,
  event_logged boolean NOT NULL,
  event_id uuid,
  popup_created boolean NOT NULL,
  popup_id uuid,
  error_message text,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS popup_creation_attempts_user_id_idx ON public.popup_creation_attempts(user_id);
CREATE INDEX IF NOT EXISTS popup_creation_attempts_created_idx ON public.popup_creation_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS popup_creation_attempts_reminder_id_idx ON public.popup_creation_attempts(reminder_id);

-- RLS
ALTER TABLE public.popup_creation_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own popup attempts" ON public.popup_creation_attempts;
CREATE POLICY "Users can view their own popup attempts"
  ON public.popup_creation_attempts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert popup attempts" ON public.popup_creation_attempts;
CREATE POLICY "System can insert popup attempts"
  ON public.popup_creation_attempts FOR INSERT
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.popup_blocks IS 'Tracks all blocked popup creation attempts for debugging';
COMMENT ON TABLE public.popup_creation_attempts IS 'Tracks all popup creation attempts and their outcomes';
COMMENT ON COLUMN public.popup_blocks.block_reason IS 'Reason popup was blocked: plan_inactive, popups_disabled, dedupe_source_event, global_cooldown, rule_cooldown, entity_cap, missing_contact_id, missing_reminder_id, event_logging_failed';
COMMENT ON COLUMN public.popup_blocks.context IS 'Additional context about the block (e.g., cooldown remaining, profile state)';
COMMENT ON COLUMN public.popup_creation_attempts.event_logged IS 'Whether the reminder_due event was successfully logged';
COMMENT ON COLUMN public.popup_creation_attempts.popup_created IS 'Whether the popup was successfully created';

-- Create function to clean up old blocks (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_popup_blocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.popup_blocks
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM public.popup_creation_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_popup_blocks IS 'Cleans up popup blocks and attempts older than 30 days';
