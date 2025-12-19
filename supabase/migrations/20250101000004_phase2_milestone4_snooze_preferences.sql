-- Phase 2 Milestone 4: Smart Snooze System - User Preferences
-- Create user_snooze_preferences table and related structures

-- Create follow_up_cadence enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'follow_up_cadence'
  ) then
    create type follow_up_cadence as enum (
      'fast',
      'balanced',
      'light_touch'
    );
  end if;
end $$;

-- Create user_snooze_preferences table
create table if not exists public.user_snooze_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  working_hours_start time default '09:00:00' not null,
  working_hours_end time default '17:30:00' not null,
  working_days integer[] default array[1,2,3,4,5] not null, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  quiet_hours_start time,
  quiet_hours_end time,
  max_reminders_per_day integer default 10 not null,
  allow_weekends boolean default false not null,
  default_snooze_options jsonb default '{
    "later_today": true,
    "tomorrow_morning": true,
    "next_working_day": true,
    "in_3_days": true,
    "next_week": true,
    "pick_a_time": true
  }'::jsonb not null,
  follow_up_cadence follow_up_cadence default 'balanced'::follow_up_cadence not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index if not exists user_snooze_preferences_user_id_idx on public.user_snooze_preferences(user_id);

-- Enable Row Level Security
alter table public.user_snooze_preferences enable row level security;

-- RLS Policies
create policy "Users can view their own snooze preferences"
  on public.user_snooze_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own snooze preferences"
  on public.user_snooze_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own snooze preferences"
  on public.user_snooze_preferences for update
  using (auth.uid() = user_id);

-- Add comments
comment on table public.user_snooze_preferences is 'User preferences for smart snooze system: working hours, quiet hours, weekend behavior, etc.';
comment on column public.user_snooze_preferences.working_days is 'Array of day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)';
comment on column public.user_snooze_preferences.default_snooze_options is 'JSONB structure: {later_today: boolean, tomorrow_morning: boolean, next_working_day: boolean, in_3_days: boolean, next_week: boolean, pick_a_time: boolean}';
comment on column public.user_snooze_preferences.follow_up_cadence is 'Preferred follow-up cadence: fast (aggressive), balanced (default), light_touch (conservative)';

