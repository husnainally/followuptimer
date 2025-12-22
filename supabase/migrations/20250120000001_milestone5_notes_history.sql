-- Milestone 5: Notes History System
-- Create contact_notes_history table for timestamped note tracking

-- Create contact_notes_history table
create table if not exists public.contact_notes_history (
  id uuid default uuid_generate_v4() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reminder_id uuid references public.reminders(id) on delete set null,
  note_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists contact_notes_history_contact_id_idx on public.contact_notes_history(contact_id);
create index if not exists contact_notes_history_user_id_idx on public.contact_notes_history(user_id);
create index if not exists contact_notes_history_created_at_idx on public.contact_notes_history(created_at);

-- Enable Row Level Security
alter table public.contact_notes_history enable row level security;

-- RLS Policies
drop policy if exists "Users can view their own contact notes" on public.contact_notes_history;
create policy "Users can view their own contact notes"
  on public.contact_notes_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own contact notes" on public.contact_notes_history;
create policy "Users can insert their own contact notes"
  on public.contact_notes_history for insert
  with check (auth.uid() = user_id);

-- Add comment
comment on table public.contact_notes_history is 'Timestamped history of notes added to contacts';

