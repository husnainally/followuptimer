-- Phase 2: Behaviour Event System
-- Create event_type enum (if not exists)
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'event_type') then
    create type event_type as enum (
      'reminder_created',
      'reminder_completed',
      'reminder_snoozed',
      'reminder_dismissed',
      'popup_shown',
      'popup_action',
      'inactivity_detected',
      'streak_achieved',
      'follow_up_required'
    );
  end if;
end $$;

-- Create events table
create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type event_type not null,
  event_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create behaviour_rules table for configurable trigger rules
create table if not exists public.behaviour_rules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rule_name text not null,
  trigger_event_type event_type not null,
  conditions jsonb default '{}'::jsonb,
  action_type text not null, -- 'popup', 'notification', etc.
  action_config jsonb default '{}'::jsonb,
  enabled boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists events_user_id_idx on public.events(user_id);
create index if not exists events_event_type_idx on public.events(event_type);
create index if not exists events_created_at_idx on public.events(created_at);
create index if not exists events_user_type_created_idx on public.events(user_id, event_type, created_at);

create index if not exists behaviour_rules_user_id_idx on public.behaviour_rules(user_id);
create index if not exists behaviour_rules_enabled_idx on public.behaviour_rules(enabled);

-- Enable Row Level Security
alter table public.events enable row level security;
alter table public.behaviour_rules enable row level security;

-- RLS Policies for events
drop policy if exists "Users can view their own events" on public.events;
create policy "Users can view their own events"
  on public.events for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own events" on public.events;
create policy "Users can insert their own events"
  on public.events for insert
  with check (auth.uid() = user_id);

-- RLS Policies for behaviour_rules
drop policy if exists "Users can view their own behaviour rules" on public.behaviour_rules;
create policy "Users can view their own behaviour rules"
  on public.behaviour_rules for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own behaviour rules" on public.behaviour_rules;
create policy "Users can insert their own behaviour rules"
  on public.behaviour_rules for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own behaviour rules" on public.behaviour_rules;
create policy "Users can update their own behaviour rules"
  on public.behaviour_rules for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own behaviour rules" on public.behaviour_rules;
create policy "Users can delete their own behaviour rules"
  on public.behaviour_rules for delete
  using (auth.uid() = user_id);

-- Add trigger for updated_at on behaviour_rules
drop trigger if exists handle_behaviour_rules_updated_at on public.behaviour_rules;
create trigger handle_behaviour_rules_updated_at
  before update on public.behaviour_rules
  for each row execute procedure public.handle_updated_at();

-- Add comments for documentation
comment on table public.events is 'Tracks user behaviour events for analytics and popup triggers';
comment on table public.behaviour_rules is 'Configurable rules for triggering actions based on events';
comment on column public.events.event_data is 'JSONB structure for extension-ready event data model';

