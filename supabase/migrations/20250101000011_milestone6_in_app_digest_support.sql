-- Milestone 6: In-App Digest Support
-- Make reminder_id nullable and add data JSONB field for digest content

-- Make reminder_id nullable (weekly digests don't have a reminder_id)
alter table public.in_app_notifications
  alter column reminder_id drop not null;

-- Add data JSONB field for storing digest content and other metadata
alter table public.in_app_notifications
  add column if not exists data jsonb default '{}'::jsonb;

-- Add index for data field queries
create index if not exists in_app_notifications_data_idx on public.in_app_notifications using gin(data);

-- Add comment
comment on column public.in_app_notifications.data is 'JSONB field for storing notification metadata (e.g., digest content)';
comment on column public.in_app_notifications.reminder_id is 'Optional reminder ID (nullable for weekly digests)';

