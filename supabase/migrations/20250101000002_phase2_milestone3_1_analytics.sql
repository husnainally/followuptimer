-- Phase 2 Milestone 3.1: Affirmation Analytics & Reporting
-- Add new event types for analytics

-- Note: Enum values must be added in separate statements to allow commit before use

-- AFFIRMATION_SUPPRESSED event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'affirmation_suppressed'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'affirmation_suppressed';
  end if;
end $$;

-- AFFIRMATION_ACTION_CLICKED event type (optional, for correlation analysis)
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'affirmation_action_clicked'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'affirmation_action_clicked';
  end if;
end $$;

-- Create suppression reason enum for better querying
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'affirmation_suppression_reason'
  ) then
    create type affirmation_suppression_reason as enum (
      'disabled_by_user',
      'cooldown_active',
      'daily_limit_reached',
      'category_disabled',
      'no_candidates_available',
      'context_not_allowed',
      'other'
    );
  end if;
end $$;

-- Add indexes on events for faster analytics queries
-- Note: Creating indexes without WHERE clause to avoid transaction/immutability issues
-- The existing event_type index will help, and these provide additional coverage

-- Index for affirmation_shown events (user_id + created_at for user queries)
create index if not exists events_affirmation_shown_user_created_idx 
  on public.events(user_id, created_at desc);

-- Index for affirmation events by type and time (for admin queries)
create index if not exists events_affirmation_type_created_idx 
  on public.events(event_type, created_at desc);

-- Composite index for user + event_type + created_at (covers all affirmation event queries)
create index if not exists events_user_type_created_idx 
  on public.events(user_id, event_type, created_at desc);

-- Add comments
comment on type affirmation_suppression_reason is 'Reasons why an affirmation was suppressed (not shown)';

