-- Debug queries to understand reminder status issues
-- Run these in Supabase SQL Editor to investigate

-- 1. Check a specific reminder's current state
-- Replace '0d085097-24a7-4f33-bd96-0396258e3219' with the actual reminder ID
SELECT 
  id,
  user_id,
  message,
  status,
  remind_at,
  qstash_message_id,
  created_at,
  updated_at,
  contact_id
FROM reminders
WHERE id = '0d085097-24a7-4f33-bd96-0396258e3219';

-- 2. Get all events for a specific reminder (chronological order)
-- Replace '0d085097-24a7-4f33-bd96-0396258e3219' with the actual reminder ID
SELECT 
  id,
  event_type,
  event_data,
  created_at,
  source
FROM events
WHERE reminder_id = '0d085097-24a7-4f33-bd96-0396258e3219'
ORDER BY created_at DESC;

-- 3. Check recent reminder_snoozed events to see what status was set
-- Replace '0d085097-24a7-4f33-bd96-0396258e3219' with the actual reminder ID
SELECT 
  id,
  event_type,
  event_data->>'status_changed_to' as status_changed_to,
  event_data->>'new_remind_at' as new_remind_at,
  event_data->>'original_remind_at' as original_remind_at,
  event_data->>'duration_minutes' as duration_minutes,
  created_at
FROM events
WHERE reminder_id = '0d085097-24a7-4f33-bd96-0396258e3219'
  AND event_type = 'reminder_snoozed'
ORDER BY created_at DESC;

-- 4. Check user's snooze preferences
-- Replace '6791de44-a740-4367-89e1-f2fa611d6954' with the actual user ID
SELECT 
  user_id,
  working_hours_start,
  working_hours_end,
  working_days,
  allow_weekends,
  max_reminders_per_day,
  cooldown_minutes
FROM user_snooze_preferences
WHERE user_id = '6791de44-a740-4367-89e1-f2fa611d6954';

-- 5. Check all reminders for a user with their current status
-- Replace '6791de44-a740-4367-89e1-f2fa611d6954' with the actual user ID
SELECT 
  id,
  message,
  status,
  remind_at,
  created_at,
  updated_at,
  CASE 
    WHEN remind_at > NOW() THEN 'Future'
    WHEN remind_at <= NOW() AND status = 'pending' THEN 'Overdue'
    ELSE 'Past/Other'
  END as time_status
FROM reminders
WHERE user_id = '6791de44-a740-4367-89e1-f2fa611d6954'
ORDER BY remind_at DESC
LIMIT 20;

-- 6. Check if there are any popups queued for a reminder
-- Replace '0d085097-24a7-4f33-bd96-0396258e3219' with the actual reminder ID
SELECT 
  id,
  status,
  template_type,
  title,
  message,
  queued_at,
  displayed_at,
  expires_at
FROM popups
WHERE reminder_id = '0d085097-24a7-4f33-bd96-0396258e3219'
ORDER BY queued_at DESC;

-- 7. Check recent reminder_due events to see if popups were created
-- Replace '0d085097-24a7-4f33-bd96-0396258e3219' with the actual reminder ID
SELECT 
  e.id,
  e.event_type,
  e.created_at,
  e.event_data,
  COUNT(p.id) as popup_count
FROM events e
LEFT JOIN popups p ON p.source_event_id = e.id
WHERE e.reminder_id = '0d085097-24a7-4f33-bd96-0396258e3219'
  AND e.event_type = 'reminder_due'
GROUP BY e.id, e.event_type, e.created_at, e.event_data
ORDER BY e.created_at DESC;

-- 8. Find reminders that are in "snoozed" status but have future remind_at times
-- This helps identify the bug
SELECT 
  id,
  message,
  status,
  remind_at,
  NOW() as current_time,
  remind_at > NOW() as is_future,
  updated_at
FROM reminders
WHERE status = 'snoozed'
  AND remind_at > NOW()
ORDER BY remind_at ASC;
