-- Script to promote a user to admin
-- Run this in Supabase SQL Editor after replacing the email address

-- Method 1: Promote by email
update public.profiles
set is_admin = true
where email = 'your-email@example.com'; -- Replace with the actual email

-- Method 2: Promote by user ID
-- update public.profiles
-- set is_admin = true
-- where id = 'user-uuid-here';

-- Verify the admin was created
select id, email, is_admin, created_at
from public.profiles
where is_admin = true;
