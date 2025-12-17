-- Phase 2: Popup System
-- Create popup template type enum (if not exists)
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'popup_template_type') then
    create type popup_template_type as enum (
      'success',
      'streak',
      'inactivity',
      'follow_up_required'
    );
  end if;
end $$;

-- Create popup status enum (if not exists)
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'popup_status') then
    create type popup_status as enum (
      'pending',
      'shown',
      'dismissed',
      'action_taken'
    );
  end if;
end $$;

-- Create popups table
create table if not exists public.popups (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reminder_id uuid references public.reminders(id) on delete set null,
  template_type popup_template_type not null,
  title text not null,
  message text not null,
  affirmation text,
  priority integer default 5 not null, -- 1-10 scale, higher = more important
  status popup_status default 'pending'::popup_status not null,
  action_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  shown_at timestamp with time zone,
  dismissed_at timestamp with time zone
);

-- Create popup_actions table to track user interactions
create table if not exists public.popup_actions (
  id uuid default uuid_generate_v4() primary key,
  popup_id uuid references public.popups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action_type text not null, -- 'complete', 'snooze', 'follow_up', 'dismiss'
  action_data jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists popups_user_id_idx on public.popups(user_id);
create index if not exists popups_status_idx on public.popups(status);
create index if not exists popups_priority_idx on public.popups(priority);
create index if not exists popups_created_at_idx on public.popups(created_at);
create index if not exists popups_user_status_priority_idx on public.popups(user_id, status, priority);

create index if not exists popup_actions_popup_id_idx on public.popup_actions(popup_id);
create index if not exists popup_actions_user_id_idx on public.popup_actions(user_id);

-- Enable Row Level Security
alter table public.popups enable row level security;
alter table public.popup_actions enable row level security;

-- RLS Policies for popups
drop policy if exists "Users can view their own popups" on public.popups;
create policy "Users can view their own popups"
  on public.popups for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own popups" on public.popups;
create policy "Users can insert their own popups"
  on public.popups for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own popups" on public.popups;
create policy "Users can update their own popups"
  on public.popups for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own popups" on public.popups;
create policy "Users can delete their own popups"
  on public.popups for delete
  using (auth.uid() = user_id);

-- RLS Policies for popup_actions
drop policy if exists "Users can view their own popup actions" on public.popup_actions;
create policy "Users can view their own popup actions"
  on public.popup_actions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own popup actions" on public.popup_actions;
create policy "Users can insert their own popup actions"
  on public.popup_actions for insert
  with check (auth.uid() = user_id);

-- Add comments for documentation
comment on table public.popups is 'Queue of behaviour-triggered popups for users';
comment on table public.popup_actions is 'Tracks user interactions with popups';
comment on column public.popups.priority is 'Priority level 1-10, higher = more important';
comment on column public.popups.action_data is 'JSONB structure for popup-specific action data';

