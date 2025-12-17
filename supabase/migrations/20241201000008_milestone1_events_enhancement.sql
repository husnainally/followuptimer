-- Phase 2 Milestone 1: Event System Foundations Enhancement
-- Add missing event types to event_type enum
do $$ 
begin
  -- Add reminder_missed if not exists
  if not exists (
    select 1 from pg_enum 
    where enumlabel = 'reminder_missed' 
    and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'reminder_missed';
  end if;

  -- Add streak_incremented if not exists
  if not exists (
    select 1 from pg_enum 
    where enumlabel = 'streak_incremented' 
    and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'streak_incremented';
  end if;

  -- Add streak_broken if not exists
  if not exists (
    select 1 from pg_enum 
    where enumlabel = 'streak_broken' 
    and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'streak_broken';
  end if;

  -- Add email_opened if not exists (extension-ready)
  if not exists (
    select 1 from pg_enum 
    where enumlabel = 'email_opened' 
    and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'email_opened';
  end if;

  -- Add linkedin_profile_viewed if not exists (extension-ready)
  if not exists (
    select 1 from pg_enum 
    where enumlabel = 'linkedin_profile_viewed' 
    and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'linkedin_profile_viewed';
  end if;

  -- Add linkedin_message_sent if not exists (extension-ready)
  if not exists (
    select 1 from pg_enum 
    where enumlabel = 'linkedin_message_sent' 
    and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'linkedin_message_sent';
  end if;
end $$;

-- Add source column to events table
alter table public.events
add column if not exists source text default 'app' not null;

-- Add contact_id column to events table (nullable, foreign key)
-- Note: contacts table must exist (migration 20241201000006_phase2_contacts.sql)
-- If contacts table doesn't exist yet, this will fail - run contacts migration first
alter table public.events
add column if not exists contact_id uuid;
-- Add foreign key constraint only if contacts table exists and constraint doesn't exist
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'contacts') then
    if not exists (
      select 1 from information_schema.table_constraints 
      where constraint_schema = 'public' 
      and constraint_name = 'events_contact_id_fkey'
      and table_name = 'events'
    ) then
      alter table public.events
      add constraint events_contact_id_fkey foreign key (contact_id) references public.contacts(id) on delete set null;
    end if;
  end if;
end $$;

-- Add reminder_id column to events table (nullable, foreign key)
alter table public.events
add column if not exists reminder_id uuid references public.reminders(id) on delete set null;

-- Create indexes for new columns
create index if not exists events_source_idx on public.events(source);
create index if not exists events_contact_id_idx on public.events(contact_id);
create index if not exists events_reminder_id_idx on public.events(reminder_id);

-- Create behaviour_triggers table for trigger queue/flags
create table if not exists public.behaviour_triggers (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  trigger_type text not null, -- 'show_streak_popup', 'show_inactivity_popup', 'show_snooze_coaching_popup', etc.
  event_id uuid references public.events(id) on delete set null,
  status text default 'pending' not null, -- 'pending' or 'consumed'
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  consumed_at timestamp with time zone
);

-- Create indexes for behaviour_triggers
create index if not exists behaviour_triggers_user_id_idx on public.behaviour_triggers(user_id);
create index if not exists behaviour_triggers_status_idx on public.behaviour_triggers(status);
create index if not exists behaviour_triggers_trigger_type_idx on public.behaviour_triggers(trigger_type);
create index if not exists behaviour_triggers_user_status_idx on public.behaviour_triggers(user_id, status);

-- Enable Row Level Security for behaviour_triggers
alter table public.behaviour_triggers enable row level security;

-- RLS Policies for behaviour_triggers
drop policy if exists "Users can view their own behaviour triggers" on public.behaviour_triggers;
create policy "Users can view their own behaviour triggers"
  on public.behaviour_triggers for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own behaviour triggers" on public.behaviour_triggers;
create policy "Users can insert their own behaviour triggers"
  on public.behaviour_triggers for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own behaviour triggers" on public.behaviour_triggers;
create policy "Users can update their own behaviour triggers"
  on public.behaviour_triggers for update
  using (auth.uid() = user_id);

-- Add comments for documentation
comment on column public.events.source is 'Event source: app, scheduler, extension_gmail, extension_linkedin';
comment on column public.events.contact_id is 'Optional link to contact associated with this event';
comment on column public.events.reminder_id is 'Optional link to reminder associated with this event';
comment on table public.behaviour_triggers is 'Queue of behaviour triggers derived from events for popups and suggestions';
comment on column public.behaviour_triggers.trigger_type is 'Type of trigger: show_streak_popup, show_inactivity_popup, show_snooze_coaching_popup, etc.';
comment on column public.behaviour_triggers.status is 'Trigger status: pending (not yet consumed) or consumed (already processed)';

