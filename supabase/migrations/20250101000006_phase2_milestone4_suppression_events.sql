-- Phase 2 Milestone 4: Smart Snooze System - Suppression Events
-- Add reminder suppression event and suppression reason enum

-- Create reminder_suppression_reason enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'reminder_suppression_reason'
  ) then
    create type reminder_suppression_reason as enum (
      'quiet_hours',
      'cooldown_active',
      'daily_cap',
      'working_hours',
      'weekend',
      'category_disabled',
      'notif_permission_denied',
      'dnd_active',
      'other'
    );
  end if;
end $$;

-- Add reminder_suppressed event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'reminder_suppressed'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'reminder_suppressed';
  end if;
end $$;

-- Add preference_changed event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'preference_changed'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'preference_changed';
  end if;
end $$;

-- Add snooze_cancelled event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'snooze_cancelled'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'snooze_cancelled';
  end if;
end $$;

-- Add suggestion_shown event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'suggestion_shown'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'suggestion_shown';
  end if;
end $$;

-- Add suggestion_clicked event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'suggestion_clicked'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'suggestion_clicked';
  end if;
end $$;

-- Add comments
comment on type reminder_suppression_reason is 'Reasons why a reminder was suppressed: quiet_hours, cooldown_active, daily_cap, working_hours, weekend, category_disabled, notif_permission_denied, dnd_active, other';
comment on type event_type is 'Event types including reminder_suppressed, preference_changed, snooze_cancelled, suggestion_shown, and suggestion_clicked for smart snooze analytics';

