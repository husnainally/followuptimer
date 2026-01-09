-- Phase 2 Milestone 4: Smart Snooze System - Cooldown Logic
-- Add cooldown tracking table and cooldown_minutes field to user_snooze_preferences

-- Add cooldown_minutes field to user_snooze_preferences
alter table public.user_snooze_preferences
add column if not exists cooldown_minutes integer default 30 not null;

comment on column public.user_snooze_preferences.cooldown_minutes is 'Minimum minutes between reminders for the same contact/entity (default: 30 minutes)';

-- Create reminder_cooldown_tracking table
create table if not exists public.reminder_cooldown_tracking (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade,
  entity_type text, -- 'contact', 'generic', etc.
  last_reminder_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure one record per user+contact or user+entity_type
  constraint reminder_cooldown_tracking_unique unique (user_id, contact_id, entity_type)
);

-- Create indexes for better performance
create index if not exists reminder_cooldown_tracking_user_id_idx on public.reminder_cooldown_tracking(user_id);
create index if not exists reminder_cooldown_tracking_contact_id_idx on public.reminder_cooldown_tracking(contact_id);
create index if not exists reminder_cooldown_tracking_user_contact_idx on public.reminder_cooldown_tracking(user_id, contact_id);
create index if not exists reminder_cooldown_tracking_user_entity_idx on public.reminder_cooldown_tracking(user_id, entity_type);
create index if not exists reminder_cooldown_tracking_last_reminder_idx on public.reminder_cooldown_tracking(last_reminder_at);

-- Enable Row Level Security
alter table public.reminder_cooldown_tracking enable row level security;

-- RLS Policies
drop policy if exists "Users can view their own cooldown tracking" on public.reminder_cooldown_tracking;
create policy "Users can view their own cooldown tracking"
  on public.reminder_cooldown_tracking for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own cooldown tracking" on public.reminder_cooldown_tracking;
create policy "Users can insert their own cooldown tracking"
  on public.reminder_cooldown_tracking for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own cooldown tracking" on public.reminder_cooldown_tracking;
create policy "Users can update their own cooldown tracking"
  on public.reminder_cooldown_tracking for update
  using (auth.uid() = user_id);

-- Add trigger for updated_at
drop trigger if exists handle_reminder_cooldown_tracking_updated_at on public.reminder_cooldown_tracking;
create trigger handle_reminder_cooldown_tracking_updated_at
  before update on public.reminder_cooldown_tracking
  for each row
  execute function public.handle_updated_at();

-- Add comments
comment on table public.reminder_cooldown_tracking is 'Tracks last reminder time per contact/entity to enforce cooldown periods';
comment on column public.reminder_cooldown_tracking.contact_id is 'Contact ID if reminder is for a specific contact (nullable)';
comment on column public.reminder_cooldown_tracking.entity_type is 'Entity type if reminder is not contact-specific (e.g., "generic", "affirmation")';
