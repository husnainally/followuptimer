-- Phase 2: Monetisation Groundwork
-- Create plan_type enum
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'plan_type') then
    create type plan_type as enum ('free', 'pro', 'enterprise');
  end if;
end $$;

-- Create plan_status enum
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'plan_status') then
    create type plan_status as enum ('active', 'trial', 'cancelled', 'expired');
  end if;
end $$;

-- Add monetisation fields to profiles table
alter table public.profiles
add column if not exists plan_type plan_type default 'free'::plan_type,
add column if not exists plan_status plan_status default 'active'::plan_status,
add column if not exists trial_end timestamp with time zone,
add column if not exists is_premium boolean default false;

-- Create index for premium users
create index if not exists profiles_is_premium_idx on public.profiles(is_premium);
create index if not exists profiles_plan_type_idx on public.profiles(plan_type);

-- Add comments for documentation
comment on column public.profiles.plan_type is 'User subscription plan type: free, pro, enterprise';
comment on column public.profiles.plan_status is 'Plan status: active, trial, cancelled, expired';
comment on column public.profiles.trial_end is 'Trial end date for trial users';
comment on column public.profiles.is_premium is 'Feature flag: true if user has premium features enabled';

