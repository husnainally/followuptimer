-- Milestone 6: Trust-Lite Event Layer Enhancements
-- Add reminder_triggered and reminder_overdue event types
-- Update suppression reason codes to match spec

-- Add reminder_triggered event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'reminder_triggered'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'reminder_triggered';
  end if;
end $$;

-- Add reminder_overdue event type
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'reminder_overdue'
      and enumtypid = (select oid from pg_type where typname = 'event_type')
  ) then
    alter type event_type add value 'reminder_overdue';
  end if;
end $$;

-- Note: Suppression reason codes are already defined in reminder_suppression_reason enum
-- The mapping to spec codes is handled in application code:
-- quiet_hours -> QUIET_HOURS
-- working_hours -> WORKDAY_DISABLED
-- daily_cap -> DAILY_CAP
-- cooldown_active -> COOLDOWN_ACTIVE
-- category_disabled -> CATEGORY_DISABLED
-- notif_permission_denied -> NOTIFICATION_PERMISSION_DENIED

-- Add comments
comment on type event_type is 'Event types including reminder_triggered and reminder_overdue for Trust-Lite digest tracking';

