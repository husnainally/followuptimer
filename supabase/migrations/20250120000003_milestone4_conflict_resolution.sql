-- Phase 2 Milestone 4: Smart Snooze System - Conflict Resolution
-- Create reminder_bundles table and add conflict resolution preferences

-- Create bundle_format enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'bundle_format'
  ) then
    create type bundle_format as enum (
      'list',
      'summary',
      'combined'
    );
  end if;
end $$;

-- Create reminder_bundles table
create table if not exists public.reminder_bundles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  bundle_time timestamp with time zone not null,
  reminder_ids uuid[] not null,
  delivery_format bundle_format default 'list'::bundle_format not null,
  delivered boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index if not exists reminder_bundles_user_id_idx on public.reminder_bundles(user_id);
create index if not exists reminder_bundles_bundle_time_idx on public.reminder_bundles(bundle_time);
create index if not exists reminder_bundles_delivered_idx on public.reminder_bundles(delivered);
create index if not exists reminder_bundles_user_time_idx on public.reminder_bundles(user_id, bundle_time);

-- Enable Row Level Security
alter table public.reminder_bundles enable row level security;

-- RLS Policies
drop policy if exists "Users can view their own reminder bundles" on public.reminder_bundles;
create policy "Users can view their own reminder bundles"
  on public.reminder_bundles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own reminder bundles" on public.reminder_bundles;
create policy "Users can insert their own reminder bundles"
  on public.reminder_bundles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reminder bundles" on public.reminder_bundles;
create policy "Users can update their own reminder bundles"
  on public.reminder_bundles for update
  using (auth.uid() = user_id);

-- Add trigger for updated_at
drop trigger if exists handle_reminder_bundles_updated_at on public.reminder_bundles;
create trigger handle_reminder_bundles_updated_at
  before update on public.reminder_bundles
  for each row
  execute function public.handle_updated_at();

-- Add conflict resolution preferences to user_snooze_preferences
alter table public.user_snooze_preferences
add column if not exists bundle_window_minutes integer default 5 not null,
add column if not exists bundle_enabled boolean default true not null,
add column if not exists bundle_format bundle_format default 'list'::bundle_format not null;

comment on column public.user_snooze_preferences.bundle_window_minutes is 'Time window in minutes for bundling reminders (default: 5 minutes)';
comment on column public.user_snooze_preferences.bundle_enabled is 'Whether conflict resolution/bundling is enabled';
comment on column public.user_snooze_preferences.bundle_format is 'Format for bundled reminders: list, summary, or combined';

-- Add comments
comment on table public.reminder_bundles is 'Tracks bundled reminders that are due at the same time';
comment on column public.reminder_bundles.reminder_ids is 'Array of reminder IDs in this bundle';
comment on column public.reminder_bundles.delivery_format is 'Format used to deliver the bundle';
