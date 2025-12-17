-- Phase 2: Contact Management System
-- Create contacts table
create table if not exists public.contacts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add contact_id to reminders table
alter table public.reminders
add column if not exists contact_id uuid references public.contacts(id) on delete set null;

-- Create indexes for better performance
create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contacts_email_idx on public.contacts(email);
create index if not exists reminders_contact_id_idx on public.reminders(contact_id);

-- Enable Row Level Security
alter table public.contacts enable row level security;

-- RLS Policies for contacts
drop policy if exists "Users can view their own contacts" on public.contacts;
create policy "Users can view their own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own contacts" on public.contacts;
create policy "Users can insert their own contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own contacts" on public.contacts;
create policy "Users can update their own contacts"
  on public.contacts for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own contacts" on public.contacts;
create policy "Users can delete their own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id);

-- Add trigger for updated_at on contacts
drop trigger if exists handle_contacts_updated_at on public.contacts;
create trigger handle_contacts_updated_at
  before update on public.contacts
  for each row execute procedure public.handle_updated_at();

-- Add comments for documentation
comment on table public.contacts is 'User contacts for linking reminders';
comment on column public.reminders.contact_id is 'Optional link to contact for this reminder';

