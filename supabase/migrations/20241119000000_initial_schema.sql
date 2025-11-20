-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create enum types
create type tone_type as enum ('motivational', 'professional', 'playful');
create type reminder_status as enum ('pending', 'sent', 'snoozed', 'dismissed');
create type notification_method as enum ('email', 'push', 'in_app');

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  tone_preference tone_type,
  push_enabled boolean default false,
  email_notifications boolean default true,
  push_notifications boolean default false,
  in_app_notifications boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create reminders table
create table public.reminders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  remind_at timestamp with time zone not null,
  tone tone_type default 'motivational'::tone_type not null,
  status reminder_status default 'pending'::reminder_status not null,
  notification_method notification_method default 'email'::notification_method not null,
  qstash_message_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create sent_logs table
create table public.sent_logs (
  id uuid default uuid_generate_v4() primary key,
  reminder_id uuid references public.reminders(id) on delete cascade not null,
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  affirmation_text text not null,
  delivery_method text not null,
  success boolean default true,
  error_message text
);

-- Create waitlist table
create table public.waitlist (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index reminders_user_id_idx on public.reminders(user_id);
create index reminders_remind_at_idx on public.reminders(remind_at);
create index reminders_status_idx on public.reminders(status);
create index sent_logs_reminder_id_idx on public.sent_logs(reminder_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.reminders enable row level security;
alter table public.sent_logs enable row level security;
alter table public.waitlist enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Reminders policies
create policy "Users can view their own reminders"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reminders"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reminders"
  on public.reminders for update
  using (auth.uid() = user_id);

create policy "Users can delete their own reminders"
  on public.reminders for delete
  using (auth.uid() = user_id);

-- Sent logs policies
create policy "Users can view logs for their own reminders"
  on public.sent_logs for select
  using (
    exists (
      select 1 from public.reminders
      where reminders.id = sent_logs.reminder_id
      and reminders.user_id = auth.uid()
    )
  );

-- Waitlist policies (public insert only)
create policy "Anyone can insert into waitlist"
  on public.waitlist for insert
  with check (true);

-- Function to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile when user signs up
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_reminders_updated_at
  before update on public.reminders
  for each row execute procedure public.handle_updated_at();
