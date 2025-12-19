-- Phase 2 Milestone 4: Smart Snooze System - Event Types
-- Add new event types for snooze analytics

-- Add snooze_suggested event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'snooze_suggested'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'snooze_suggested';
  end if;
end $$;

-- Add snooze_selected event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'snooze_selected'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'snooze_selected';
  end if;
end $$;

-- Add reminder_deferred_by_rule event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'reminder_deferred_by_rule'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'reminder_deferred_by_rule';
  end if;
end $$;

-- Add comments
comment on type event_type is 'Event types including snooze_suggested, snooze_selected, and reminder_deferred_by_rule for smart snooze analytics';

