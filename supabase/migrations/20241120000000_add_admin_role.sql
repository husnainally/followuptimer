-- Add is_admin column to profiles table
alter table public.profiles add column is_admin boolean default false not null;

-- Create index for admin lookups
create index profiles_is_admin_idx on public.profiles(is_admin) where is_admin = true;

-- Update waitlist RLS policy to allow admins to view all entries
create policy "Admins can view all waitlist entries"
  on public.waitlist for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Optional: Add policy to allow admins to delete waitlist entries
create policy "Admins can delete waitlist entries"
  on public.waitlist for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Add comment for documentation
comment on column public.profiles.is_admin is 'Flag to identify admin users with elevated privileges';
