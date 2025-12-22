-- Milestone 6: User Digest Preferences
-- Create user_digest_preferences table for digest settings

-- Create digest_channel enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'digest_channel'
  ) then
    create type digest_channel as enum (
      'email',
      'in_app',
      'both'
    );
  end if;
end $$;

-- Create digest_detail_level enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'digest_detail_level'
  ) then
    create type digest_detail_level as enum (
      'light',
      'standard'
    );
  end if;
end $$;

-- Create user_digest_preferences table
create table if not exists public.user_digest_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  weekly_digest_enabled boolean default false not null,
  digest_day integer default 1 not null, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  digest_time time default '08:00:00' not null, -- HH:mm format
  digest_channel digest_channel default 'email'::digest_channel not null,
  digest_detail_level digest_detail_level default 'standard'::digest_detail_level not null,
  only_when_active boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraints
  constraint digest_day_range check (digest_day >= 0 and digest_day <= 6)
);

-- Create indexes
create index if not exists user_digest_preferences_user_id_idx on public.user_digest_preferences(user_id);
create index if not exists user_digest_preferences_enabled_idx on public.user_digest_preferences(weekly_digest_enabled) where weekly_digest_enabled = true;

-- Enable Row Level Security
alter table public.user_digest_preferences enable row level security;

-- RLS Policies
create policy "Users can view their own digest preferences"
  on public.user_digest_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own digest preferences"
  on public.user_digest_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own digest preferences"
  on public.user_digest_preferences for update
  using (auth.uid() = user_id);

-- Add trigger for updated_at
drop trigger if exists handle_user_digest_preferences_updated_at on public.user_digest_preferences;
create trigger handle_user_digest_preferences_updated_at
  before update on public.user_digest_preferences
  for each row execute procedure public.handle_updated_at();

-- Add comments
comment on table public.user_digest_preferences is 'User preferences for weekly digest delivery and content';
comment on column public.user_digest_preferences.digest_day is 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)';
comment on column public.user_digest_preferences.digest_time is 'Time of day in HH:mm format (user local timezone)';
comment on column public.user_digest_preferences.only_when_active is 'If true, only send digest when there was activity in the week';

