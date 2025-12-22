-- Milestone 8: User Preferences (Tone, Notifications, Behaviour Controls)
-- Create user_preferences table for global settings

-- Create tone_style enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'tone_style'
  ) then
    create type tone_style as enum (
      'neutral',
      'supportive',
      'direct',
      'motivational',
      'minimal'
    );
  end if;
end $$;

-- Create notification_intensity enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'notification_intensity'
  ) then
    create type notification_intensity as enum (
      'standard',
      'reduced',
      'essential_only'
    );
  end if;
end $$;

-- Create overdue_handling enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'overdue_handling'
  ) then
    create type overdue_handling as enum (
      'gentle_nudge',
      'escalation',
      'none'
    );
  end if;
end $$;

-- Create suppression_transparency enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'suppression_transparency'
  ) then
    create type suppression_transparency as enum (
      'proactive',
      'on_open'
    );
  end if;
end $$;

-- Create user_preferences table
create table if not exists public.user_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  
  -- Tone settings
  tone_style tone_style default 'neutral'::tone_style not null,
  
  -- Notification settings
  notification_channels jsonb default '["email"]'::jsonb not null, -- Array of 'push', 'email', 'in_app'
  notification_intensity notification_intensity default 'standard'::notification_intensity not null,
  category_notifications jsonb default '{"followups": true, "affirmations": true, "general": true}'::jsonb not null,
  
  -- Behaviour controls
  default_snooze_minutes integer default 30 not null,
  default_followup_interval_days integer default 3 not null,
  auto_create_followup boolean default false not null,
  overdue_handling overdue_handling default 'gentle_nudge'::overdue_handling not null,
  suppression_transparency suppression_transparency default 'proactive'::suppression_transparency not null,
  
  -- Digest settings
  digest_tone_inherit boolean default true not null,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraints
  constraint default_snooze_minutes_range check (default_snooze_minutes >= 5 and default_snooze_minutes <= 1440), -- 5 minutes to 24 hours
  constraint default_followup_interval_range check (default_followup_interval_days >= 1 and default_followup_interval_days <= 365),
  constraint notification_channels_array check (jsonb_typeof(notification_channels) = 'array'),
  constraint category_notifications_object check (jsonb_typeof(category_notifications) = 'object')
);

-- Create indexes
create index if not exists user_preferences_user_id_idx on public.user_preferences(user_id);

-- Enable Row Level Security
alter table public.user_preferences enable row level security;

-- RLS Policies
create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

-- Add trigger for updated_at
drop trigger if exists handle_user_preferences_updated_at on public.user_preferences;
create trigger handle_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute procedure public.handle_updated_at();

-- Add comments
comment on table public.user_preferences is 'Global user preferences for tone, notifications, and behavior controls (Milestone 8)';
comment on column public.user_preferences.tone_style is 'Global tone preference: neutral, supportive, direct, motivational, minimal';
comment on column public.user_preferences.notification_channels is 'Array of enabled notification channels: ["push", "email", "in_app"]';
comment on column public.user_preferences.notification_intensity is 'Notification frequency: standard, reduced, essential_only';
comment on column public.user_preferences.category_notifications is 'Per-category notification controls: {"followups": boolean, "affirmations": boolean, "general": boolean}';
comment on column public.user_preferences.default_snooze_minutes is 'Default snooze duration in minutes (5-1440)';
comment on column public.user_preferences.default_followup_interval_days is 'Default follow-up interval in days (1-365)';
comment on column public.user_preferences.auto_create_followup is 'If true, prompt user to create follow-up after completing reminder';
comment on column public.user_preferences.overdue_handling is 'How to display overdue reminders: gentle_nudge, escalation, none';
comment on column public.user_preferences.suppression_transparency is 'When to show suppression reasons: proactive (always) or on_open (only in detail view)';
comment on column public.user_preferences.digest_tone_inherit is 'If true, digest uses global tone; if false, uses neutral or digest-specific tone';

-- Migrate existing users: Create default preferences for all existing users
-- This ensures every user has a preferences record
insert into public.user_preferences (user_id, tone_style)
select 
  id as user_id,
  case 
    when tone_preference = 'motivational'::tone_type then 'motivational'::tone_style
    when tone_preference = 'professional'::tone_type then 'neutral'::tone_style
    when tone_preference = 'playful'::tone_type then 'supportive'::tone_style
    else 'neutral'::tone_style
  end as tone_style
from public.profiles
where id not in (select user_id from public.user_preferences)
on conflict (user_id) do nothing;

-- Mark reminders.tone column as deprecated (add comment)
comment on column public.reminders.tone is 'DEPRECATED: Use user_preferences.tone_style instead. This field is kept for backward compatibility only.';

