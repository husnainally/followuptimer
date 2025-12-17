-- Fix: Add 'simple' to tone_type enum
-- This migration ensures 'simple' is added to the enum

-- Check if 'simple' exists in tone_type enum, if not add it
do $$ 
begin
  -- Check if 'simple' value exists in the enum
  if not exists (
    select 1 
    from pg_enum 
    where enumlabel = 'simple' 
    and enumtypid = (select oid from pg_type where typname = 'tone_type')
  ) then
    -- Add 'simple' to the enum
    alter type tone_type add value 'simple';
  end if;
end $$;

-- Verify it was added
do $$
declare
  enum_exists boolean;
begin
  select exists (
    select 1 
    from pg_enum 
    where enumlabel = 'simple' 
    and enumtypid = (select oid from pg_type where typname = 'tone_type')
  ) into enum_exists;
  
  if not enum_exists then
    raise exception 'Failed to add simple to tone_type enum';
  end if;
end $$;

