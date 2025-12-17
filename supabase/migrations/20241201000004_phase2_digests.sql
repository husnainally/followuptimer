-- Phase 2: Weekly Performance Digests
-- Create weekly_digests table to track sent digests
create table if not exists public.weekly_digests (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  week_start_date date not null,
  week_end_date date not null,
  stats_data jsonb not null,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure one digest per user per week
  unique(user_id, week_start_date)
);

-- Add digest_preferences JSONB to profiles table
alter table public.profiles
add column if not exists digest_preferences jsonb default '{"enabled": false, "day_of_week": 1, "time": "09:00", "format": "html"}'::jsonb;

-- Create indexes for better performance
create index if not exists weekly_digests_user_id_idx on public.weekly_digests(user_id);
create index if not exists weekly_digests_week_start_idx on public.weekly_digests(week_start_date);
create index if not exists weekly_digests_sent_at_idx on public.weekly_digests(sent_at);

-- Enable Row Level Security
alter table public.weekly_digests enable row level security;

-- RLS Policies for weekly_digests
drop policy if exists "Users can view their own weekly digests" on public.weekly_digests;
create policy "Users can view their own weekly digests"
  on public.weekly_digests for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own weekly digests" on public.weekly_digests;
create policy "Users can insert their own weekly digests"
  on public.weekly_digests for insert
  with check (auth.uid() = user_id);

-- Add comments for documentation
comment on table public.weekly_digests is 'Tracks weekly performance digest emails sent to users';
comment on column public.profiles.digest_preferences is 'JSONB structure: {enabled: boolean, day_of_week: 0-6, time: "HH:mm", format: "html"|"text"}';

