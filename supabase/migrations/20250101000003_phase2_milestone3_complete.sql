-- Phase 2 Milestone 3: Complete Implementation (100%)
-- Add missing features: tone preference, timezone support, weighted selection

-- Add tone preference to user_affirmation_preferences
-- Tone preference: 'sales' | 'calm' | 'mixed' (default: 'mixed')
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'affirmation_tone'
  ) then
    create type affirmation_tone as enum (
      'sales',
      'calm',
      'mixed'
    );
  end if;
end $$;

-- Add tone_preference column to user_affirmation_preferences
alter table public.user_affirmation_preferences
add column if not exists tone_preference affirmation_tone default 'mixed'::affirmation_tone not null;

-- Add timezone to profiles table (for daily limit calculations)
alter table public.profiles
add column if not exists timezone text default 'UTC';

-- Add category weights table for weighted selection
create table if not exists public.affirmation_category_weights (
  id uuid default uuid_generate_v4() primary key,
  category affirmation_category not null unique,
  default_weight numeric(5,2) default 1.0 not null, -- Weight multiplier (1.0 = equal, 2.0 = twice as likely)
  context_email_opened_weight numeric(5,2) default null, -- Override weight for specific contexts
  context_reminder_due_weight numeric(5,2) default null,
  context_no_reply_weight numeric(5,2) default null,
  context_reminder_completed_weight numeric(5,2) default null,
  context_reminder_missed_weight numeric(5,2) default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed default category weights (based on requirements)
insert into public.affirmation_category_weights (category, default_weight, context_email_opened_weight, context_no_reply_weight, context_reminder_completed_weight, context_reminder_missed_weight)
values
  ('sales_momentum', 1.0, 0.7, null, null, null), -- 70% for email_opened
  ('calm_productivity', 1.0, 0.3, null, null, 0.5), -- 30% for email_opened, 50% for missed
  ('consistency', 1.0, null, 0.4, 0.5, null), -- 40% for no_reply, 50% for completed
  ('resilience', 1.0, null, 0.6, null, 0.5), -- 60% for no_reply, 50% for missed
  ('focus', 1.0, 0.5, null, null, null), -- 50% for reminder_due (email_opened context)
  ('general_positive', 1.0, null, null, 0.5, null) -- 50% for completed
on conflict (category) do nothing;

-- Add context blacklist table (popup types that should never show affirmations)
create table if not exists public.affirmation_context_blacklist (
  id uuid default uuid_generate_v4() primary key,
  context_type text not null unique, -- e.g., 'system_alert', 'error_notification'
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add comments
comment on column public.user_affirmation_preferences.tone_preference is 'User preference for affirmation tone: sales (sales-focused), calm (calm/productivity), mixed (all categories)';
comment on column public.profiles.timezone is 'User timezone (e.g., "America/New_York", "Europe/London") for daily limit calculations';
comment on table public.affirmation_category_weights is 'Weights for category selection - higher weight = more likely to be selected';
comment on table public.affirmation_context_blacklist is 'Context types that should never show affirmations';

-- Create indexes
create index if not exists affirmation_category_weights_category_idx on public.affirmation_category_weights(category);
create index if not exists affirmation_context_blacklist_context_type_idx on public.affirmation_context_blacklist(context_type);

-- Enable RLS
alter table public.affirmation_category_weights enable row level security;
alter table public.affirmation_context_blacklist enable row level security;

-- RLS Policies
create policy "Anyone can view category weights"
  on public.affirmation_category_weights for select
  using (auth.role() = 'authenticated');

create policy "Anyone can view context blacklist"
  on public.affirmation_context_blacklist for select
  using (auth.role() = 'authenticated');

-- Function to get affirmation count for today in user's timezone
create or replace function public.get_affirmation_count_today(
  p_user_id uuid,
  p_timezone text default 'UTC'
)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
  v_start_of_day timestamp with time zone;
begin
  -- Calculate start of day in user's timezone
  v_start_of_day := date_trunc('day', (now() at time zone p_timezone)) at time zone p_timezone;
  
  -- Count affirmations shown today (in user's timezone)
  select count(*)
  into v_count
  from public.affirmation_usage
  where user_id = p_user_id
    and shown_at >= v_start_of_day;
  
  return coalesce(v_count, 0);
end;
$$;

