-- Milestone 5: Contact Entity Schema Enhancement
-- Add first_name, last_name, company, job_title, tags, source fields to contacts table

-- Add new columns to contacts table
alter table public.contacts
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists company text,
add column if not exists job_title text,
add column if not exists tags text[] default '{}',
add column if not exists source text default 'manual' not null;

-- Create indexes for better performance
create index if not exists contacts_first_name_idx on public.contacts(first_name);
create index if not exists contacts_last_name_idx on public.contacts(last_name);
create index if not exists contacts_company_idx on public.contacts(company);
create index if not exists contacts_source_idx on public.contacts(source);
create index if not exists contacts_tags_idx on public.contacts using gin(tags);

-- Add check constraint: first_name OR email must be provided (per spec)
-- Note: This will be enforced at application level, but we add a database constraint for data integrity
alter table public.contacts
add constraint contacts_name_or_email_check 
check (first_name is not null and first_name != '' or email is not null and email != '');

-- Add comments for documentation
comment on column public.contacts.first_name is 'First name of the contact (required if email not provided)';
comment on column public.contacts.last_name is 'Last name of the contact (optional)';
comment on column public.contacts.company is 'Company name (optional)';
comment on column public.contacts.job_title is 'Job title (optional)';
comment on column public.contacts.tags is 'Array of tags for categorizing contacts (optional)';
comment on column public.contacts.source is 'Source of contact: manual, extension, or future integration (default: manual)';
