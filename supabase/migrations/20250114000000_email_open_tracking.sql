-- Email Open Tracking via Resend Webhooks
-- Store metadata for emails sent via Resend to track opens

-- Create sent_emails table
create table if not exists public.sent_emails (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete set null,
  reminder_id uuid references public.reminders(id) on delete set null,
  resend_email_id text not null unique,
  recipient_email text not null,
  email_type text default 'reminder' not null,
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  opened_at timestamp with time zone,
  opened_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for better performance
create index if not exists sent_emails_user_id_idx on public.sent_emails(user_id);
create index if not exists sent_emails_contact_id_idx on public.sent_emails(contact_id);
create index if not exists sent_emails_reminder_id_idx on public.sent_emails(reminder_id);
create index if not exists sent_emails_resend_email_id_idx on public.sent_emails(resend_email_id);
create index if not exists sent_emails_opened_at_idx on public.sent_emails(opened_at) where opened_at is not null;

-- Enable Row Level Security
alter table public.sent_emails enable row level security;

-- RLS Policies for sent_emails
drop policy if exists "Users can view their own sent emails" on public.sent_emails;
create policy "Users can view their own sent emails"
  on public.sent_emails for select
  using (auth.uid() = user_id);

drop policy if exists "Service role can manage all sent emails" on public.sent_emails;
create policy "Service role can manage all sent emails"
  on public.sent_emails for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Add trigger for updated_at
drop trigger if exists handle_sent_emails_updated_at on public.sent_emails;
create trigger handle_sent_emails_updated_at
  before update on public.sent_emails
  for each row execute procedure public.handle_updated_at();

-- Add comments for documentation
comment on table public.sent_emails is 'Tracks emails sent via Resend for open tracking via webhooks';
comment on column public.sent_emails.resend_email_id is 'Resend email ID from API response (e.g., re_...)';
comment on column public.sent_emails.email_type is 'Type of email: reminder, digest, or waitlist';
comment on column public.sent_emails.opened_at is 'Timestamp of first email open (NULL if never opened)';
comment on column public.sent_emails.opened_count is 'Number of times email was opened (0 if never opened)';
