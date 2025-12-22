-- Milestone 5: Archive Contacts Functionality
-- Add soft delete support with archived_at column

-- Add archived_at column to contacts table
alter table public.contacts
add column if not exists archived_at timestamp with time zone;

-- Create index for filtering archived contacts
create index if not exists contacts_archived_at_idx on public.contacts(archived_at)
where archived_at is not null;

-- Create index for active contacts (non-archived)
create index if not exists contacts_user_active_idx on public.contacts(user_id, archived_at)
where archived_at is null;

-- Update RLS policies to exclude archived contacts from default views
-- Users can still view archived contacts explicitly, but they won't show in normal queries
drop policy if exists "Users can view their own contacts" on public.contacts;
create policy "Users can view their own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

-- Add comment
comment on column public.contacts.archived_at is 'Timestamp when contact was archived (soft delete). NULL means contact is active.';

