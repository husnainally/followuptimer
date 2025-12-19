-- Phase 2 Milestone 3: Affirmation Engine
-- Categories, randomiser, frequency control

-- Create affirmation category enum
create type affirmation_category as enum (
  'sales_momentum',
  'calm_productivity',
  'consistency',
  'resilience',
  'focus',
  'general_positive'
);

-- Create affirmations table
create table public.affirmations (
  id uuid default uuid_generate_v4() primary key,
  text text not null,
  category affirmation_category not null,
  enabled boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create affirmation usage tracking table
create table public.affirmation_usage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  affirmation_id uuid references public.affirmations(id) on delete cascade not null,
  popup_id uuid references public.popups(id) on delete set null,
  shown_at timestamp with time zone default timezone('utc'::text, now()) not null,
  category affirmation_category not null
);

-- Create user affirmation preferences table (category enable/disable)
create table public.user_affirmation_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  sales_momentum_enabled boolean default true not null,
  calm_productivity_enabled boolean default true not null,
  consistency_enabled boolean default true not null,
  resilience_enabled boolean default true not null,
  focus_enabled boolean default true not null,
  general_positive_enabled boolean default true not null,
  global_cooldown_minutes integer default 30 not null, -- Minimum minutes between affirmations
  daily_cap integer default 10 not null, -- Max affirmations per day
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index affirmation_usage_user_id_idx on public.affirmation_usage(user_id);
create index affirmation_usage_shown_at_idx on public.affirmation_usage(shown_at);
create index affirmation_usage_affirmation_id_idx on public.affirmation_usage(affirmation_id);
create index affirmations_category_idx on public.affirmations(category);
create index affirmations_enabled_idx on public.affirmations(enabled);

-- Add RLS policies
alter table public.affirmations enable row level security;
alter table public.affirmation_usage enable row level security;
alter table public.user_affirmation_preferences enable row level security;

-- Affirmations are public (read-only for all authenticated users)
create policy "Anyone can view affirmations"
  on public.affirmations for select
  using (auth.role() = 'authenticated');

-- Users can only view their own usage
create policy "Users can view their own affirmation usage"
  on public.affirmation_usage for select
  using (auth.uid() = user_id);

-- Users can insert their own usage
create policy "Users can insert their own affirmation usage"
  on public.affirmation_usage for insert
  with check (auth.uid() = user_id);

-- Users can manage their own preferences
create policy "Users can view their own affirmation preferences"
  on public.user_affirmation_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own affirmation preferences"
  on public.user_affirmation_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own affirmation preferences"
  on public.user_affirmation_preferences for update
  using (auth.uid() = user_id);

-- Add affirmation_shown to event_type enum
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'affirmation_shown'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'affirmation_shown';
  end if;
end $$;

-- Add comments
comment on table public.affirmations is 'Master list of affirmations organized by category';
comment on table public.affirmation_usage is 'Tracks when affirmations are shown to users (for cooldown, daily cap, and no-repeat logic)';
comment on table public.user_affirmation_preferences is 'User preferences for which affirmation categories to show and frequency controls';
comment on column public.user_affirmation_preferences.global_cooldown_minutes is 'Minimum minutes between showing any affirmation';
comment on column public.user_affirmation_preferences.daily_cap is 'Maximum number of affirmations to show per day';

