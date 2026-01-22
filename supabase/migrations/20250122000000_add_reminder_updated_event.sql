-- Add reminder_updated event type to event_type enum
do $$ 
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'reminder_updated' 
    and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'reminder_updated';
  end if;
end $$;
