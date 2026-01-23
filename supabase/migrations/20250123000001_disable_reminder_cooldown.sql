-- Disable cooldown for reminder_due popups entirely
-- This shows ALL reminders immediately when they fire, no delays

UPDATE popup_rules
SET 
  cooldown_seconds = 0,  -- No cooldown
  updated_at = NOW()
WHERE trigger_event_type = 'reminder_due'
  AND rule_name = 'Reminder due popup';

-- Verify the change
SELECT 
  rule_name,
  trigger_event_type,
  cooldown_seconds,
  max_per_day,
  enabled
FROM popup_rules
WHERE trigger_event_type = 'reminder_due';
