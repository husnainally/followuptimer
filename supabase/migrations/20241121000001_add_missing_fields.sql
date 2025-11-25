-- Add missing fields to profiles table
alter table public.profiles
add column if not exists full_name text,
add column if not exists reminder_before_minutes integer default 15;

-- Add missing user_id column to sent_logs table
alter table public.sent_logs
add column if not exists user_id uuid references public.profiles(id) on delete cascade;

-- Rename affirmation_text to affirmation for consistency with frontend
alter table public.sent_logs
rename column affirmation_text to affirmation;

-- Add status column to sent_logs for tracking delivery status
alter table public.sent_logs
add column if not exists status text default 'delivered';

-- Create index on sent_logs.user_id for better query performance
create index if not exists sent_logs_user_id_idx on public.sent_logs(user_id);

-- Update existing sent_logs records to populate user_id from reminders
-- This ensures existing data has the user_id field populated
update public.sent_logs
set user_id = (
  select user_id from public.reminders
  where reminders.id = sent_logs.reminder_id
)
where user_id is null;

-- Add RLS policy for sent_logs to use user_id directly
drop policy if exists "Users can view logs for their own reminders" on public.sent_logs;

create policy "Users can view their own sent logs"
  on public.sent_logs for select
  using (auth.uid() = user_id);

create policy "Users can delete their own sent logs"
  on public.sent_logs for delete
  using (auth.uid() = user_id);

-- Add comments for documentation
comment on column public.profiles.full_name is 'User full name for profile display';
comment on column public.profiles.reminder_before_minutes is 'Default minutes before event to send reminder';
comment on column public.sent_logs.user_id is 'Direct reference to user for efficient querying';
comment on column public.sent_logs.affirmation is 'The affirmation text sent with the reminder';
comment on column public.sent_logs.status is 'Delivery status: delivered, snoozed, failed';
