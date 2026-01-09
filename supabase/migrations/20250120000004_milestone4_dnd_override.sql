-- Phase 2 Milestone 4: Smart Snooze System - DND Override
-- Add DND override fields to user_snooze_preferences

-- Add DND fields to user_snooze_preferences
alter table public.user_snooze_preferences
add column if not exists dnd_enabled boolean default false not null,
add column if not exists dnd_override_rules jsonb default '{
  "emergency_contacts": [],
  "override_keywords": []
}'::jsonb not null;

comment on column public.user_snooze_preferences.dnd_enabled is 'Whether Do Not Disturb mode is enabled (separate from quiet hours)';
comment on column public.user_snooze_preferences.dnd_override_rules is 'JSONB structure: {emergency_contacts: [contact_ids], override_keywords: [strings]} - Rules that bypass DND';
