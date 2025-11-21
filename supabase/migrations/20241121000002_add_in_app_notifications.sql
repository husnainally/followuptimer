-- Add in_app_notifications table for storing in-app notifications
create table if not exists public.in_app_notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reminder_id uuid references public.reminders(id) on delete cascade not null,
  title text not null,
  message text not null,
  affirmation text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists in_app_notifications_user_id_idx on public.in_app_notifications(user_id);
create index if not exists in_app_notifications_is_read_idx on public.in_app_notifications(is_read) where is_read = false;
create index if not exists in_app_notifications_created_at_idx on public.in_app_notifications(created_at desc);

-- Enable Row Level Security
alter table public.in_app_notifications enable row level security;

-- RLS Policies for in_app_notifications
create policy "Users can view their own in-app notifications"
  on public.in_app_notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own in-app notifications"
  on public.in_app_notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete their own in-app notifications"
  on public.in_app_notifications for delete
  using (auth.uid() = user_id);

-- System can insert in-app notifications (for webhook)
create policy "Service role can insert in-app notifications"
  on public.in_app_notifications for insert
  with check (true);

-- Add comment for documentation
comment on table public.in_app_notifications is 'Stores in-app notifications for users';
comment on column public.in_app_notifications.is_read is 'Whether the user has read this notification';
