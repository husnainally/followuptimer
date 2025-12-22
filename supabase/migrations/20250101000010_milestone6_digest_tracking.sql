-- Milestone 6: Enhanced Digest Tracking
-- Enhance weekly_digests table with variant, dedupe_key, retry_count, status

-- Create digest_variant enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'digest_variant'
  ) then
    create type digest_variant as enum (
      'standard',
      'light',
      'recovery',
      'no_activity'
    );
  end if;
end $$;

-- Create digest_status enum
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'digest_status'
  ) then
    create type digest_status as enum (
      'sent',
      'failed',
      'skipped'
    );
  end if;
end $$;

-- Add new columns to weekly_digests table
alter table public.weekly_digests
  add column if not exists digest_variant digest_variant default 'standard'::digest_variant,
  add column if not exists dedupe_key text,
  add column if not exists retry_count integer default 0 not null,
  add column if not exists last_retry_at timestamp with time zone,
  add column if not exists status digest_status default 'sent'::digest_status not null,
  add column if not exists failure_reason text;

-- Create unique index on dedupe_key (ensures idempotency)
create unique index if not exists weekly_digests_dedupe_key_idx 
  on public.weekly_digests(dedupe_key) 
  where dedupe_key is not null;

-- Create indexes for better query performance
create index if not exists weekly_digests_status_idx on public.weekly_digests(status);
create index if not exists weekly_digests_variant_idx on public.weekly_digests(digest_variant);
create index if not exists weekly_digests_user_week_idx on public.weekly_digests(user_id, week_start_date);

-- Add comments
comment on column public.weekly_digests.digest_variant is 'Template variant used: standard, light, recovery, or no_activity';
comment on column public.weekly_digests.dedupe_key is 'Unique key for idempotency: ${userId}_${weekStartISO}';
comment on column public.weekly_digests.retry_count is 'Number of retry attempts for failed sends';
comment on column public.weekly_digests.last_retry_at is 'Timestamp of last retry attempt';
comment on column public.weekly_digests.status is 'Send status: sent, failed, or skipped';
comment on column public.weekly_digests.failure_reason is 'Reason for failure if status is failed';

