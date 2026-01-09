-- Milestone 5: Reminder Schema Enhancement
-- Add linked_entities, last_interaction_at, completion_context fields to reminders table

-- Add new columns to reminders table
alter table public.reminders
add column if not exists linked_entities jsonb default '[]'::jsonb,
add column if not exists last_interaction_at timestamp with time zone,
add column if not exists completion_context text;

-- Create indexes for better performance
create index if not exists reminders_last_interaction_at_idx on public.reminders(last_interaction_at);
create index if not exists reminders_contact_interaction_idx on public.reminders(contact_id, last_interaction_at)
where contact_id is not null and last_interaction_at is not null;
create index if not exists reminders_linked_entities_idx on public.reminders using gin(linked_entities);

-- Add comments for documentation
comment on column public.reminders.linked_entities is 'Future-proof array for multi-contact reminders (JSON array of entity references)';
comment on column public.reminders.last_interaction_at is 'Timestamp of last interaction with the linked contact';
comment on column public.reminders.completion_context is 'Note or context added when reminder is completed';
