-- Phase 2: Enhanced Affirmation Engine
-- Create affirmation_frequency enum
create type affirmation_frequency as enum ('rare', 'balanced', 'frequent');

-- Add 'simple' to tone_type enum (if not already exists)
do $$ 
begin
  if not exists (
    select 1 from pg_enum 
    where enumlabel = 'simple' 
    and enumtypid = (select oid from pg_type where typname = 'tone_type')
  ) then
    alter type tone_type add value 'simple';
  end if;
end $$;

-- Add affirmation_frequency to profiles table
alter table public.profiles
add column if not exists affirmation_frequency affirmation_frequency default 'balanced'::affirmation_frequency;

-- Add affirmation_enabled to reminders table
alter table public.reminders
add column if not exists affirmation_enabled boolean default true;

-- Add comments for documentation
comment on column public.profiles.affirmation_frequency is 'Frequency of affirmations: rare, balanced, or frequent';
comment on column public.reminders.affirmation_enabled is 'Whether to include affirmation with this reminder';

