-- Milestone 9: Monetisation Groundwork
-- Plan Model, Feature Flags, Stripe-Ready Architecture, Trial Logic

-- Step 1: Update plan_type enum to match spec (FREE/PRO/TEAM)
-- Drop existing enum if it exists and recreate with correct values
do $$
begin
  -- Check if enum exists and has different values
  if exists (select 1 from pg_type where typname = 'plan_type') then
    -- Drop dependent columns first
    alter table public.profiles drop column if exists plan_type;
    drop type if exists plan_type;
  end if;
  
  -- Create new enum with correct values
  create type plan_type as enum ('FREE', 'PRO', 'TEAM');
end $$;

-- Step 2: Create subscription_status enum (replaces plan_status)
do $$
begin
  if exists (select 1 from pg_type where typname = 'subscription_status') then
    -- Drop dependent columns first
    alter table public.profiles drop column if exists subscription_status;
    drop type if exists subscription_status;
  end if;
  
  create type subscription_status as enum ('none', 'trialing', 'active', 'past_due', 'canceled', 'paused');
end $$;

-- Step 3: Add/update monetisation fields to profiles table
alter table public.profiles
  -- Plan fields
  add column if not exists plan_type plan_type default 'FREE'::plan_type,
  add column if not exists subscription_status subscription_status default 'none'::subscription_status,
  add column if not exists plan_started_at timestamp with time zone,
  add column if not exists trial_ends_at timestamp with time zone,
  
  -- Stripe fields (ready for integration)
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_product_id text,
  
  -- Legacy fields (keep for backward compatibility, will be deprecated)
  add column if not exists plan_status text, -- Keep old field for migration
  add column if not exists trial_end timestamp with time zone, -- Keep old field for migration
  add column if not exists is_premium boolean default false; -- Keep for backward compatibility

-- Step 4: Create indexes
create index if not exists profiles_plan_type_idx on public.profiles(plan_type);
create index if not exists profiles_subscription_status_idx on public.profiles(subscription_status);
create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id) where stripe_customer_id is not null;
create index if not exists profiles_trial_ends_at_idx on public.profiles(trial_ends_at) where trial_ends_at is not null;

-- Step 5: Migrate existing data
-- Convert old plan_type values to new enum
update public.profiles
set plan_type = case
  when plan_type::text = 'free' then 'FREE'::plan_type
  when plan_type::text = 'pro' then 'PRO'::plan_type
  when plan_type::text = 'enterprise' then 'TEAM'::plan_type
  else 'FREE'::plan_type
end
where plan_type is not null;

-- Convert old plan_status to subscription_status
update public.profiles
set subscription_status = case
  when plan_status = 'active' then 'active'::subscription_status
  when plan_status = 'trial' then 'trialing'::subscription_status
  when plan_status = 'cancelled' then 'canceled'::subscription_status
  when plan_status = 'expired' then 'canceled'::subscription_status
  else 'none'::subscription_status
end
where plan_status is not null;

-- Migrate trial_end to trial_ends_at
update public.profiles
set trial_ends_at = trial_end
where trial_end is not null and trial_ends_at is null;

-- Set plan_started_at for existing users
update public.profiles
set plan_started_at = created_at
where plan_started_at is null;

-- Step 6: Create usage_metrics table for metering
create table if not exists public.usage_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  metric_type text not null, -- 'reminders_active', 'contacts_count', 'digests_sent', 'audit_history_depth'
  metric_value integer default 0 not null,
  period_start timestamp with time zone not null,
  period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraints
  constraint unique_user_metric_period unique (user_id, metric_type, period_start),
  constraint metric_value_non_negative check (metric_value >= 0)
);

-- Create indexes for usage_metrics
create index if not exists usage_metrics_user_id_idx on public.usage_metrics(user_id);
create index if not exists usage_metrics_type_idx on public.usage_metrics(metric_type);
create index if not exists usage_metrics_period_idx on public.usage_metrics(period_start, period_end);

-- Enable Row Level Security
alter table public.usage_metrics enable row level security;

-- RLS Policies for usage_metrics
create policy "Users can view their own usage metrics"
  on public.usage_metrics
  for select
  using (auth.uid() = user_id);

-- Step 7: Create trial_history table for tracking trial events
create table if not exists public.trial_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  trial_started_at timestamp with time zone not null,
  trial_ended_at timestamp with time zone,
  trial_duration_days integer,
  converted_to_paid boolean default false,
  conversion_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for trial_history
create index if not exists trial_history_user_id_idx on public.trial_history(user_id);
create index if not exists trial_history_started_at_idx on public.trial_history(trial_started_at);

-- Enable Row Level Security
alter table public.trial_history enable row level security;

-- RLS Policies for trial_history
create policy "Users can view their own trial history"
  on public.trial_history
  for select
  using (auth.uid() = user_id);

-- Step 8: Create billing_events table for webhook event logging
create table if not exists public.billing_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null, -- 'subscription.created', 'subscription.updated', etc.
  stripe_event_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  event_data jsonb default '{}'::jsonb,
  processed boolean default false,
  processed_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for billing_events
create index if not exists billing_events_user_id_idx on public.billing_events(user_id);
create index if not exists billing_events_stripe_event_id_idx on public.billing_events(stripe_event_id);
create index if not exists billing_events_event_type_idx on public.billing_events(event_type);
create index if not exists billing_events_processed_idx on public.billing_events(processed);

-- Step 9: Add comments for documentation
comment on column public.profiles.plan_type is 'User subscription plan type: FREE, PRO, TEAM';
comment on column public.profiles.subscription_status is 'Subscription status: none, trialing, active, past_due, canceled, paused';
comment on column public.profiles.plan_started_at is 'When the current plan started';
comment on column public.profiles.trial_ends_at is 'Trial end date (null if not in trial)';
comment on column public.profiles.stripe_customer_id is 'Stripe customer ID (stored but not required for app to function)';
comment on column public.profiles.stripe_subscription_id is 'Stripe subscription ID';
comment on column public.profiles.stripe_price_id is 'Stripe price ID (for future pricing flexibility)';
comment on column public.profiles.stripe_product_id is 'Stripe product ID';

