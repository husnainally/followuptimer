-- Add privacy settings columns to profiles table
alter table public.profiles
add column if not exists data_collection boolean default false not null,
add column if not exists marketing_emails boolean default false not null;

-- Add comment
comment on column public.profiles.data_collection is 'User consent for usage analytics collection';
comment on column public.profiles.marketing_emails is 'User consent for marketing communications';
