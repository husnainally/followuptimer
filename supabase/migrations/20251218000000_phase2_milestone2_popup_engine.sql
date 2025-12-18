-- Phase 2 Milestone 2: Popup Engine (rules, eligibility, lifecycle)

-- 1) Extend event_type enum with popup lifecycle + new trigger event types
do $$
begin
  -- Popup lifecycle
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'popup_dismissed'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'popup_dismissed';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumlabel = 'popup_action_clicked'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'popup_action_clicked';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumlabel = 'popup_snoozed'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'popup_snoozed';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumlabel = 'popup_expired'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'popup_expired';
  end if;

  -- Action side-effects
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'reminder_scheduled'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'reminder_scheduled';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumlabel = 'task_completed'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'task_completed';
  end if;

  -- New popup trigger event types (MVP)
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'reminder_due'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'reminder_due';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumlabel = 'no_reply_after_n_days'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'no_reply_after_n_days';
  end if;
end $$;

-- 2) Extend popup_status enum to support richer instance states (keep old values for backward compatibility)
do $$
begin
  if exists (select 1 from pg_type where typname = 'popup_status') then
    if not exists (
      select 1 from pg_enum
      where enumlabel = 'queued'
        and enumtypid = (select oid from pg_type where typname = 'popup_status')
    ) then
      alter type popup_status add value 'queued';
    end if;

    if not exists (
      select 1 from pg_enum
      where enumlabel = 'displayed'
        and enumtypid = (select oid from pg_type where typname = 'popup_status')
    ) then
      alter type popup_status add value 'displayed';
    end if;

    if not exists (
      select 1 from pg_enum
      where enumlabel = 'acted'
        and enumtypid = (select oid from pg_type where typname = 'popup_status')
    ) then
      alter type popup_status add value 'acted';
    end if;

    if not exists (
      select 1 from pg_enum
      where enumlabel = 'expired'
        and enumtypid = (select oid from pg_type where typname = 'popup_status')
    ) then
      alter type popup_status add value 'expired';
    end if;
  end if;
end $$;

-- 3) Create popup_rules table (DB-driven rules)
create table if not exists public.popup_rules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rule_name text not null,
  trigger_event_type event_type not null,
  conditions jsonb default '{}'::jsonb,
  template_key text not null, -- 'email_opened', 'reminder_due', 'no_reply_after_n_days'
  priority integer default 5 not null,
  cooldown_seconds integer default 300 not null,
  max_per_day integer,
  ttl_seconds integer default 86400 not null,
  enabled boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists popup_rules_user_id_idx on public.popup_rules(user_id);
create index if not exists popup_rules_user_trigger_idx on public.popup_rules(user_id, trigger_event_type);
create index if not exists popup_rules_enabled_idx on public.popup_rules(enabled);

alter table public.popup_rules enable row level security;

drop policy if exists "Users can view their own popup rules" on public.popup_rules;
create policy "Users can view their own popup rules"
  on public.popup_rules for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own popup rules" on public.popup_rules;
create policy "Users can insert their own popup rules"
  on public.popup_rules for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own popup rules" on public.popup_rules;
create policy "Users can update their own popup rules"
  on public.popup_rules for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own popup rules" on public.popup_rules;
create policy "Users can delete their own popup rules"
  on public.popup_rules for delete
  using (auth.uid() = user_id);

drop trigger if exists handle_popup_rules_updated_at on public.popup_rules;
create trigger handle_popup_rules_updated_at
  before update on public.popup_rules
  for each row execute procedure public.handle_updated_at();

comment on table public.popup_rules is 'Rules that map events to popup instances with cooldowns, caps, and templates';
comment on column public.popup_rules.conditions is 'JSON conditions used by the popup engine (MVP uses limited checks)';

-- 4) Extend popups table to behave as popup_instances
alter table public.popups
  add column if not exists rule_id uuid references public.popup_rules(id) on delete set null,
  add column if not exists source_event_id uuid references public.events(id) on delete set null,
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists dedupe_hash text,
  add column if not exists queued_at timestamp with time zone,
  add column if not exists displayed_at timestamp with time zone,
  add column if not exists closed_at timestamp with time zone,
  add column if not exists expires_at timestamp with time zone,
  add column if not exists action_taken text,
  add column if not exists snooze_until timestamp with time zone,
  add column if not exists payload jsonb default '{}'::jsonb;

-- Backfill queued_at for existing rows
update public.popups
set queued_at = created_at
where queued_at is null;

-- Indexes & dedupe constraints
create index if not exists popups_rule_id_idx on public.popups(rule_id);
create index if not exists popups_source_event_id_idx on public.popups(source_event_id);
create index if not exists popups_contact_id_idx on public.popups(contact_id);
create index if not exists popups_user_status_priority_queued_idx on public.popups(user_id, status, priority, queued_at);
create index if not exists popups_user_rule_contact_displayed_idx on public.popups(user_id, rule_id, contact_id, displayed_at);

-- Dedupe: prevent multiple instances for same source event for a user
create unique index if not exists popups_user_source_event_unique
  on public.popups(user_id, source_event_id)
  where source_event_id is not null;

-- Dedupe: optional hash (for derived triggers)
create unique index if not exists popups_user_dedupe_hash_unique
  on public.popups(user_id, dedupe_hash)
  where dedupe_hash is not null;


