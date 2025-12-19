-- Phase 2 Milestone 4: Smart Snooze System - Smart Suggestions Toggle
-- Add smart_suggestions_enabled column to user_snooze_preferences

alter table public.user_snooze_preferences
add column if not exists smart_suggestions_enabled boolean default true not null;

-- Add comment
comment on column public.user_snooze_preferences.smart_suggestions_enabled is 'Whether smart snooze suggestions are enabled. When disabled, users get basic duration-based snooze options only.';

