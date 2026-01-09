-- Phase 2 Milestone 4: Smart Snooze System - Category-Level Settings
-- Create category_snooze_preferences table for per-category snooze settings

-- Create reminder_category enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'reminder_category'
  ) then
    create type reminder_category as enum (
      'follow_up',
      'affirmation',
      'generic'
    );
  end if;
end $$;

-- Create category_intensity enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'category_intensity'
  ) then
    create type category_intensity as enum (
      'low',
      'medium',
      'high'
    );
  end if;
end $$;

-- Create category_snooze_preferences table
create table if not exists public.category_snooze_preferences (
  user_id uuid references public.profiles(id) on delete cascade not null,
  category reminder_category not null,
  default_duration_minutes integer default 30 not null,
  intensity category_intensity default 'medium'::category_intensity not null,
  enabled boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, category)
);

-- Create indexes
create index if not exists category_snooze_preferences_user_id_idx on public.category_snooze_preferences(user_id);
create index if not exists category_snooze_preferences_category_idx on public.category_snooze_preferences(category);

-- Enable Row Level Security
alter table public.category_snooze_preferences enable row level security;

-- RLS Policies
drop policy if exists "Users can view their own category snooze preferences" on public.category_snooze_preferences;
create policy "Users can view their own category snooze preferences"
  on public.category_snooze_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own category snooze preferences" on public.category_snooze_preferences;
create policy "Users can insert their own category snooze preferences"
  on public.category_snooze_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own category snooze preferences" on public.category_snooze_preferences;
create policy "Users can update their own category snooze preferences"
  on public.category_snooze_preferences for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own category snooze preferences" on public.category_snooze_preferences;
create policy "Users can delete their own category snooze preferences"
  on public.category_snooze_preferences for delete
  using (auth.uid() = user_id);

-- Add trigger for updated_at
drop trigger if exists handle_category_snooze_preferences_updated_at on public.category_snooze_preferences;
create trigger handle_category_snooze_preferences_updated_at
  before update on public.category_snooze_preferences
  for each row
  execute function public.handle_updated_at();

-- Add comments
comment on table public.category_snooze_preferences is 'Per-category snooze preferences: follow_up, affirmation, generic';
comment on column public.category_snooze_preferences.default_duration_minutes is 'Default snooze duration in minutes for this category';
comment on column public.category_snooze_preferences.intensity is 'Intensity level: low (conservative), medium (balanced), high (aggressive)';
comment on column public.category_snooze_preferences.enabled is 'Whether this category is enabled for snooze suggestions';
