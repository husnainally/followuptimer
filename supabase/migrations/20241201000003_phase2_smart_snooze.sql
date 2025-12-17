-- Phase 2: Smart Snooze System
-- Create snooze_reason enum (if not exists)
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'snooze_reason') then
    create type snooze_reason as enum (
      'user_action',
      'smart_suggestion',
      'auto'
    );
  end if;
end $$;

-- Create snooze_history table
create table if not exists public.snooze_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reminder_id uuid references public.reminders(id) on delete set null,
  snooze_duration_minutes integer not null,
  snooze_reason snooze_reason default 'user_action'::snooze_reason not null,
  context_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add smart_snooze_enabled to profiles table
alter table public.profiles
add column if not exists smart_snooze_enabled boolean default false;

-- Add snooze_pattern JSONB to profiles table
alter table public.profiles
add column if not exists snooze_pattern jsonb default '{}'::jsonb;

-- Create indexes for better performance
create index if not exists snooze_history_user_id_idx on public.snooze_history(user_id);
create index if not exists snooze_history_reminder_id_idx on public.snooze_history(reminder_id);
create index if not exists snooze_history_created_at_idx on public.snooze_history(created_at);
create index if not exists snooze_history_user_created_idx on public.snooze_history(user_id, created_at);

-- Enable Row Level Security
alter table public.snooze_history enable row level security;

-- RLS Policies for snooze_history
drop policy if exists "Users can view their own snooze history" on public.snooze_history;
create policy "Users can view their own snooze history"
  on public.snooze_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own snooze history" on public.snooze_history;
create policy "Users can insert their own snooze history"
  on public.snooze_history for insert
  with check (auth.uid() = user_id);

-- Add comments for documentation
comment on table public.snooze_history is 'Tracks snooze patterns for smart snooze suggestions';
comment on column public.profiles.smart_snooze_enabled is 'Whether smart snooze suggestions are enabled';
comment on column public.profiles.snooze_pattern is 'JSONB structure storing learned snooze patterns';

