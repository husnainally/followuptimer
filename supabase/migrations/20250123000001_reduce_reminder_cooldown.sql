-- Reduce reminder_due popup cooldown from 15 minutes to 30 seconds
-- This allows users to see multiple reminder popups that fire close together

UPDATE popup_rules
SET 
  cooldown_seconds = 30,  -- Changed from 900 (15 min) to 30 seconds
  updated_at = NOW()
WHERE trigger_event_type = 'reminder_due'
  AND rule_name = 'Reminder due popup';

-- Verify the change
SELECT 
  rule_name,
  trigger_event_type,
  cooldown_seconds,
  cooldown_seconds / 60 as cooldown_minutes,
  max_per_day,
  enabled
FROM popup_rules
WHERE trigger_event_type = 'reminder_due';
