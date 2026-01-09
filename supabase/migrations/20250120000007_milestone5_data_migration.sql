-- Milestone 5: Data Migration
-- Migrate existing name field to first_name/last_name
-- This migration splits the existing 'name' field into 'first_name' and 'last_name'

-- Function to split name intelligently
do $$
declare
  contact_record record;
  name_parts text[];
  first_part text;
  last_part text;
begin
  -- Loop through all contacts that have a name but no first_name yet
  for contact_record in 
    select id, name 
    from public.contacts 
    where name is not null 
      and name != ''
      and (first_name is null or first_name = '')
  loop
    -- Trim the name
    contact_record.name := trim(contact_record.name);
    
    -- Skip if empty after trimming
    if contact_record.name = '' then
      continue;
    end if;
    
    -- Split name by spaces
    name_parts := string_to_array(contact_record.name, ' ');
    
    -- Handle different cases
    if array_length(name_parts, 1) = 1 then
      -- Single word: put in first_name
      first_part := name_parts[1];
      last_part := null;
    elsif array_length(name_parts, 1) = 2 then
      -- Two words: first in first_name, second in last_name
      first_part := name_parts[1];
      last_part := name_parts[2];
    else
      -- Multiple words: first word in first_name, rest in last_name
      first_part := name_parts[1];
      last_part := array_to_string(name_parts[2:], ' ');
    end if;
    
    -- Update the contact
    update public.contacts
    set 
      first_name = first_part,
      last_name = last_part
    where id = contact_record.id;
    
  end loop;
end $$;

-- Set source to 'manual' for all existing contacts (migration default)
update public.contacts
set source = 'manual'
where source is null or source = '';

-- Add comment
comment on column public.contacts.name is 'Legacy name field - kept for backward compatibility. Use first_name and last_name instead.';
