# QA Testing Guide: Milestone 1 & 2
## Comprehensive Testing Guide for Event System & Popup Engine

**Purpose**: This guide provides step-by-step instructions to thoroughly test Milestone 1 (Event System Foundations) and Milestone 2 (Popup Engine) to ensure 100% functionality before moving to Milestone 3.

**Estimated Testing Time**: 4-6 hours for complete coverage

---

## Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Milestone 1: Event System Testing](#milestone-1-event-system-testing)
3. [Milestone 2: Popup Engine Testing](#milestone-2-popup-engine-testing)
4. [Integration Testing](#integration-testing)
5. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
6. [Database Verification](#database-verification)
7. [Performance Testing](#performance-testing)
8. [Final Checklist](#final-checklist)

---

## Prerequisites & Setup

### 1. Environment Setup

**Required:**
- [ ] Development server running (`npm run dev`)
- [ ] Supabase project connected and migrations applied
- [ ] Test user account created and logged in
- [ ] Browser developer tools open (Console + Network tab)
- [ ] Supabase SQL Editor access

**Verify Migrations Applied:**
```sql
-- Run in Supabase SQL Editor
SELECT migration_name, applied_at 
FROM supabase_migrations.schema_migrations 
WHERE migration_name LIKE '%phase2%' OR migration_name LIKE '%milestone%'
ORDER BY applied_at DESC;
```

**Expected**: Should see:
- `20241201000000_phase2_events.sql`
- `20241201000008_milestone1_events_enhancement.sql`
- `20251218000000_phase2_milestone2_popup_engine.sql`

### 2. Test Data Preparation

**Create Test Contact:**
1. Navigate to `/contacts` or `/dashboard`
2. Create a test contact:
   - Name: "Test Contact QA"
   - Email: "test@example.com"
   - Save the contact ID (you'll need it)

**Create Test Reminder:**
1. Navigate to `/reminder/create` or dashboard
2. Create a reminder:
   - Contact: Select your test contact
   - Message: "QA Test Reminder"
   - Schedule: 5 minutes from now
   - Save the reminder ID

**Note Contact & Reminder IDs:**
- Contact ID: `_________________`
- Reminder ID: `_________________`

### 3. Browser Setup

**Open Developer Tools:**
- Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Go to **Console** tab
- Go to **Network** tab
- Filter by "Fetch/XHR"

**Clear Browser Data (Optional but Recommended):**
- Clear localStorage
- Clear sessionStorage
- Hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)

---

## Milestone 1: Event System Testing

### Test 1.1: Event Logging - Reminder Created

**Objective**: Verify `reminder_created` events are logged correctly.

**Steps:**
1. Navigate to `/reminder/create`
2. Fill in reminder form:
   - Contact: Select test contact
   - Message: "Test reminder for event logging"
   - Schedule: 10 minutes from now
3. Click "Create Reminder"
4. Wait for success message

**Verification:**
```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  event_type,
  source,
  contact_id,
  reminder_id,
  event_data,
  created_at
FROM events 
WHERE event_type = 'reminder_created' 
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] Event exists in database
- [ ] `event_type` = `'reminder_created'`
- [ ] `source` = `'app'`
- [ ] `contact_id` matches your test contact
- [ ] `reminder_id` matches created reminder
- [ ] `event_data` contains reminder details (message, tone, etc.)
- [ ] `created_at` is recent (within last minute)

**Console Check:**
- [ ] No errors in browser console
- [ ] Network request to `/api/reminders` succeeded (status 200)

---

### Test 1.2: Event Logging - Reminder Completed

**Objective**: Verify `reminder_completed` events are logged when reminders are sent/completed.

**Steps:**
1. Navigate to dashboard
2. Find a reminder with status "pending"
3. Click "Send Now" or wait for scheduled time
4. If using "Send Now", confirm the reminder is sent

**Verification:**
```sql
SELECT 
  id,
  event_type,
  source,
  reminder_id,
  event_data,
  created_at
FROM events 
WHERE event_type = 'reminder_completed' 
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] Event exists in database
- [ ] `event_type` = `'reminder_completed'`
- [ ] `reminder_id` matches completed reminder
- [ ] `event_data` may contain delivery status
- [ ] Event created within last minute

**Additional Check - Streak Tracking:**
```sql
-- Check if streak_incremented event was also logged
SELECT event_type, created_at 
FROM events 
WHERE event_type IN ('streak_incremented', 'streak_broken')
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

---

### Test 1.3: Event Logging - Reminder Snoozed

**Objective**: Verify `reminder_snoozed` events are logged and trigger creation for repeated snoozes.

**Note**: There is no snooze button in the reminders table UI. Use the API directly or snooze from a popup.

**Steps:**
1. Get a pending reminder ID from dashboard:
   - Navigate to `/dashboard` or `/reminder`
   - Find a reminder with status "pending"
   - Note the reminder ID (from URL or database)

2. **Option A: Use API directly (Recommended for testing)**
   - Open browser console
   - Run the snooze API call 3 times:
```javascript
const reminderId = 'YOUR_REMINDER_ID'; // Replace with actual reminder ID

// First snooze (1 hour)
await fetch(`/api/reminders/${reminderId}/snooze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ minutes: 60 })
})
.then(r => r.json())
.then(data => {
  console.log('Snooze 1:', data);
  
  // Second snooze (1 hour)
  return fetch(`/api/reminders/${reminderId}/snooze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes: 60 })
  });
})
.then(r => r.json())
.then(data => {
  console.log('Snooze 2:', data);
  
  // Third snooze (1 hour) - should trigger coaching popup
  return fetch(`/api/reminders/${reminderId}/snooze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes: 60 })
  });
})
.then(r => r.json())
.then(data => console.log('Snooze 3:', data));
```

   **Option B: Snooze from Popup (if popup appears)**
   - If a popup appears for a reminder, click "Snooze" button in the popup
   - Select "Snooze 1h" option
   - Repeat 2 more times (total 3 snoozes)

**Verification:**
```sql
-- Check snooze events
SELECT 
  event_type,
  reminder_id,
  event_data->>'duration_minutes' as duration,
  created_at
FROM events 
WHERE event_type = 'reminder_snoozed' 
  AND reminder_id = 'YOUR_REMINDER_ID'
ORDER BY created_at DESC;
```

**Expected Results:**
- [ ] At least 3 `reminder_snoozed` events exist
- [ ] Each event has `reminder_id` set
- [ ] `event_data` contains `duration_minutes`

**Check for Trigger (After 3rd Snooze):**
```sql
-- Check if snooze coaching trigger was created
SELECT 
  id,
  trigger_type,
  event_id,
  status,
  metadata,
  created_at
FROM behaviour_triggers 
WHERE trigger_type = 'show_snooze_coaching_popup'
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] Trigger exists after 3rd snooze
- [ ] `trigger_type` = `'show_snooze_coaching_popup'`
- [ ] `status` = `'pending'`
- [ ] `event_id` links to the snooze event

---

### Test 1.4: Event Logging - Reminder Dismissed

**Objective**: Verify `reminder_dismissed` events are logged.

**Note**: There is no "Dismiss" button in the reminders table UI. The table has a "Delete" button, but that's different from "Dismiss". Use the API directly to dismiss a reminder.

**Important Distinction:**
- **Delete**: Permanently removes the reminder from the database (no event logged for delete)
- **Dismiss**: Sets reminder status to 'dismissed' but keeps the reminder (logs `reminder_dismissed` event)

**Steps:**
1. Get a pending reminder ID:
   - Navigate to `/dashboard` or `/reminder`
   - Find a reminder with status "pending"
   - Note the reminder ID

2. **Use API to dismiss the reminder:**
   - Open browser console
   - Run:
```javascript
const reminderId = 'YOUR_REMINDER_ID'; // Replace with actual reminder ID

fetch(`/api/reminders/${reminderId}/dismiss`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
  console.log('Reminder dismissed:', data);
  console.log('Reminder status:', data.reminder?.status); // Should be 'dismissed'
})
.catch(console.error);
```

3. **Verify reminder status changed:**
   - Check in database or refresh the reminders page
   - Reminder should still exist but with status "dismissed"

**Verification:**
```sql
-- Check event was logged
SELECT 
  event_type,
  reminder_id,
  source,
  created_at
FROM events 
WHERE event_type = 'reminder_dismissed' 
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;

-- Verify reminder status
SELECT 
  id,
  status,
  message
FROM reminders 
WHERE id = 'YOUR_REMINDER_ID';
```

**Expected Results:**
- [ ] `reminder_dismissed` event exists in events table
- [ ] `event_type` = `'reminder_dismissed'`
- [ ] `reminder_id` matches dismissed reminder
- [ ] `source` = `'app'`
- [ ] Reminder still exists in database
- [ ] Reminder `status` = `'dismissed'` (not deleted)

---

### Test 1.5: API Endpoint - POST /api/events

**Objective**: Verify event API accepts and validates events correctly.

**Test 1.5a: Valid Event**

**Steps:**
1. Open browser console
2. Run:
```javascript
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'streak_achieved',
    event_data: { streak_count: 5 },
    source: 'app'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected Results:**
- [ ] Response status: 200
- [ ] Response contains `{ success: true, event_id: "..." }`
- [ ] Event appears in database

**Test 1.5b: Invalid Event Type**

**Steps:**
```javascript
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'invalid_event_type',
    event_data: {}
  })
})
.then(r => r.json())
.then(console.log);
```

**Expected Results:**
- [ ] Response status: 400
- [ ] Response contains error message about invalid event type

**Test 1.5c: Missing Required Field**

**Steps:**
```javascript
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_data: { test: 'data' }
    // Missing event_type
  })
})
.then(r => r.json())
.then(console.log);
```

**Expected Results:**
- [ ] Response status: 400
- [ ] Error message: "event_type is required"

---

### Test 1.6: API Endpoint - GET /api/events

**Objective**: Verify event querying works with filters.

**Steps:**
1. Open browser console
2. Run:
```javascript
fetch('/api/events?event_type=reminder_created&limit=5')
  .then(r => r.json())
  .then(data => {
    console.log('Events:', data);
    console.log('Count:', data.events?.length);
  });
```

**Expected Results:**
- [ ] Response status: 200
- [ ] Response contains `events` array
- [ ] All events have `event_type` = `'reminder_created'`
- [ ] Maximum 5 events returned
- [ ] Each event has: `id`, `event_type`, `source`, `event_data`, `created_at`

**Test with Date Filters:**
```javascript
const today = new Date().toISOString().split('T')[0];
fetch(`/api/events?start_date=${today}&limit=10`)
  .then(r => r.json())
  .then(console.log);
```

**Expected Results:**
- [ ] Only events from today or later are returned

---

### Test 1.7: Scheduled Endpoint - Check Missed Reminders

**Objective**: Verify missed reminders are detected and events logged.

**Prerequisites:**
- Create a reminder scheduled for 2 minutes ago (past due)
- Reminder status should be "pending"

**Steps:**
1. Get your user ID from Supabase:
```sql
SELECT id FROM auth.users WHERE email = 'your-email@example.com';
```

2. Create a reminder that's already overdue:
   - Go to Supabase SQL Editor
   - Run:
```sql
UPDATE reminders 
SET remind_at = NOW() - INTERVAL '5 minutes'
WHERE user_id = 'YOUR_USER_ID' 
  AND status = 'pending'
LIMIT 1;
```

3. Call the missed reminders endpoint:
```bash
# In terminal or Postman
curl -X POST "http://localhost:3000/api/reminders/check-missed" \
  -H "Authorization: Bearer YOUR_MISSED_REMINDERS_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Or from browser console (if no secret set):**
```javascript
fetch('/api/reminders/check-missed', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

**Verification:**
```sql
-- Check for reminder_missed events
SELECT 
  event_type,
  reminder_id,
  event_data,
  created_at
FROM events 
WHERE event_type = 'reminder_missed' 
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] `reminder_missed` event exists
- [ ] `reminder_id` matches overdue reminder
- [ ] `source` = `'scheduler'`
- [ ] `event_data` may contain `minutes_overdue`

**Check Trigger:**
```sql
SELECT * FROM behaviour_triggers 
WHERE trigger_type = 'show_missed_reminder_popup'
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] Trigger exists
- [ ] `status` = `'pending'`

---

### Test 1.8: Scheduled Endpoint - Check Inactivity

**Objective**: Verify inactivity detection works.

**Prerequisites:**
- No events logged in last 24+ hours (or adjust threshold)

**Steps:**
1. Check last activity:
```sql
SELECT MAX(created_at) as last_event 
FROM events 
WHERE user_id = 'YOUR_USER_ID';
```

2. If recent, manually set last event to 25 hours ago:
```sql
-- Create a fake old event (for testing only)
INSERT INTO events (user_id, event_type, source, created_at)
VALUES (
  'YOUR_USER_ID',
  'reminder_created',
  'app',
  NOW() - INTERVAL '25 hours'
);
```

3. Call inactivity endpoint:
```bash
curl -X POST "http://localhost:3000/api/events/check-inactivity" \
  -H "Authorization: Bearer YOUR_INACTIVITY_CRON_SECRET"
```

**Or from browser:**
```javascript
fetch('/api/events/check-inactivity', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

**Verification:**
```sql
SELECT 
  event_type,
  event_data,
  source,
  created_at
FROM events 
WHERE event_type = 'inactivity_detected' 
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] `inactivity_detected` event exists
- [ ] `source` = `'scheduler'`
- [ ] `event_data` may contain `hours_inactive`

**Check Trigger:**
```sql
SELECT * FROM behaviour_triggers 
WHERE trigger_type = 'show_inactivity_popup'
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] Trigger exists
- [ ] `status` = `'pending'`

---

### Test 1.9: Streak Tracking

**Objective**: Verify streak calculation and events.

**Steps:**
1. Complete a reminder today
2. Wait for streak calculation (or trigger manually)
3. Complete another reminder tomorrow (or simulate by updating dates)

**Manual Streak Test:**
```sql
-- Complete a reminder
UPDATE reminders 
SET status = 'sent', sent_at = NOW()
WHERE user_id = 'YOUR_USER_ID' 
  AND status = 'pending'
LIMIT 1;

-- Log reminder_completed event manually
INSERT INTO events (user_id, event_type, source, reminder_id, created_at)
VALUES (
  'YOUR_USER_ID',
  'reminder_completed',
  'app',
  'YOUR_REMINDER_ID',
  NOW()
);
```

**Verification:**
```sql
-- Check for streak events
SELECT 
  event_type,
  event_data->>'streak_count' as streak_count,
  created_at
FROM events 
WHERE event_type IN ('streak_incremented', 'streak_broken', 'streak_achieved')
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

**Expected Results:**
- [ ] `streak_incremented` events logged on consecutive completions
- [ ] `streak_achieved` events logged at milestones (e.g., 5, 10, 30 days)
- [ ] `streak_broken` logged when streak is broken

---

### Test 1.10: Database Schema Verification

**Objective**: Verify all database tables and columns exist.

**Run in Supabase SQL Editor:**
```sql
-- Check events table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'events' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check behaviour_triggers table
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'behaviour_triggers' 
  AND table_schema = 'public';

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('events', 'behaviour_triggers')
  AND schemaname = 'public';
```

**Expected Results:**
- [ ] `events` table has columns: `id`, `user_id`, `event_type`, `source`, `contact_id`, `reminder_id`, `event_data`, `created_at`
- [ ] `behaviour_triggers` table exists with: `id`, `user_id`, `trigger_type`, `event_id`, `status`, `metadata`, `created_at`, `consumed_at`
- [ ] Indexes exist on: `user_id`, `event_type`, `created_at`, `source`, `contact_id`, `reminder_id`

**Check RLS Policies:**
```sql
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('events', 'behaviour_triggers')
  AND schemaname = 'public';
```

**Expected Results:**
- [ ] RLS policies exist for both tables
- [ ] Users can only SELECT/INSERT their own events
- [ ] Users can only SELECT/INSERT their own triggers

---

## Milestone 2: Popup Engine Testing

### Test 2.1: Popup Creation from Event - Email Opened

**Objective**: Verify popup is created when `email_opened` event is logged.

**Steps:**
1. Open browser console
2. Log an `email_opened` event:
```javascript
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'email_opened',
    event_data: {
      contact_name: 'Test Contact QA',
      thread_link: 'https://mail.google.com/mail/u/0/#inbox/thread123',
      message_id: 'msg123'
    },
    source: 'extension_gmail',
    contact_id: 'YOUR_CONTACT_ID'
  })
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
-- Check popup was created
SELECT 
  id,
  user_id,
  rule_id,
  source_event_id,
  contact_id,
  title,
  message,
  affirmation,
  status,
  priority,
  queued_at,
  expires_at
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND contact_id = 'YOUR_CONTACT_ID'
ORDER BY queued_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] Popup exists in database
- [ ] `status` = `'queued'`
- [ ] `title` = `'Email opened'`
- [ ] `message` contains contact name and time ago (e.g., "Your email to Test Contact QA was opened 2 minutes ago.")
- [ ] `affirmation` is set (if user has `affirmation_frequency` enabled)
- [ ] `source_event_id` links to the `email_opened` event
- [ ] `priority` = 9 (from default rule)
- [ ] `expires_at` is set (30 minutes from creation, based on rule TTL)

**Check Event:**
```sql
-- Verify source event exists
SELECT id, event_type, created_at 
FROM events 
WHERE id = (
  SELECT source_event_id FROM popups 
  WHERE user_id = 'YOUR_USER_ID' 
  ORDER BY queued_at DESC LIMIT 1
);
```

**Expected Results:**
- [ ] Source event exists
- [ ] `event_type` = `'email_opened'`

---

### Test 2.2: Popup Display - GET /api/popups

**Objective**: Verify popup is fetched and transitioned to displayed.

**Steps:**
1. Ensure you have a queued popup (from Test 2.1)
2. Open browser console
3. Call the popup endpoint:
```javascript
fetch('/api/popups')
  .then(r => r.json())
  .then(data => {
    console.log('Popup:', data);
    console.log('Popup ID:', data.popup?.id);
  });
```

**Verification:**
```sql
-- Check popup status changed
SELECT 
  id,
  status,
  displayed_at,
  shown_at,
  queued_at
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY queued_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] `status` = `'displayed'` (was `'queued'`)
- [ ] `displayed_at` is set (recent timestamp)
- [ ] `shown_at` is set (same as `displayed_at`)

**Check popup_shown Event:**
```sql
SELECT 
  event_type,
  event_data->>'popup_id' as popup_id,
  event_data->>'rule_id' as rule_id,
  created_at
FROM events 
WHERE event_type = 'popup_shown' 
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] `popup_shown` event exists
- [ ] `popup_id` matches the displayed popup
- [ ] `rule_id` matches the popup rule

**UI Check:**
- [ ] Navigate to dashboard
- [ ] Popup should appear in bottom-right corner
- [ ] Popup shows title, message, and affirmation (if set)
- [ ] Popup has action buttons: "Follow up now", "Snooze", "Mark done", "Dismiss"

---

### Test 2.3: Popup Display - POST /api/popups/[id]/displayed

**Objective**: Verify new displayed endpoint works.

**Steps:**
1. Create a new popup (use Test 2.1)
2. Get the popup ID from database:
```sql
SELECT id FROM popups 
WHERE user_id = 'YOUR_USER_ID' 
  AND status = 'queued'
ORDER BY queued_at DESC 
LIMIT 1;
```

3. Call the displayed endpoint:
```javascript
const popupId = 'YOUR_POPUP_ID';
fetch(`/api/popups/${popupId}/displayed`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
SELECT status, displayed_at, shown_at 
FROM popups 
WHERE id = 'YOUR_POPUP_ID';
```

**Expected Results:**
- [ ] `status` = `'displayed'`
- [ ] `displayed_at` is set
- [ ] `shown_at` is set

**Check Event:**
```sql
SELECT event_type, event_data->>'popup_id' as popup_id
FROM events 
WHERE event_type = 'popup_shown' 
  AND event_data->>'popup_id' = 'YOUR_POPUP_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] `popup_shown` event logged

---

### Test 2.4: Popup Action - Follow Up Now

**Objective**: Verify "Follow up now" action works.

**Steps:**
1. Ensure you have a displayed popup with a thread link
2. Click "Follow up now" button in the UI
   - OR call API directly:
```javascript
const popupId = 'YOUR_POPUP_ID';
fetch(`/api/popups/${popupId}/action`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action_type: 'FOLLOW_UP_NOW'
  })
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
-- Check popup status
SELECT 
  status,
  action_taken,
  closed_at
FROM popups 
WHERE id = 'YOUR_POPUP_ID';
```

**Expected Results:**
- [ ] `status` = `'acted'`
- [ ] `action_taken` = `'FOLLOW_UP_NOW'`
- [ ] `closed_at` is set

**Check Events:**
```sql
SELECT 
  event_type,
  event_data->>'popup_id' as popup_id,
  event_data->>'action_type' as action_type
FROM events 
WHERE event_type = 'popup_action_clicked' 
  AND event_data->>'popup_id' = 'YOUR_POPUP_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] `popup_action_clicked` event exists
- [ ] `action_type` = `'FOLLOW_UP_NOW'`

**UI Check:**
- [ ] New tab/window opens with thread link (if provided)
- [ ] OR redirects to dashboard contact/reminder page (if no thread link)
- [ ] Popup disappears from UI

---

### Test 2.5: Popup Action - Snooze

**Objective**: Verify snooze action creates reminder schedule.

**Steps:**
1. Get a popup with a reminder_id:
```sql
SELECT id, reminder_id FROM popups 
WHERE user_id = 'YOUR_USER_ID' 
  AND reminder_id IS NOT NULL
  AND status IN ('queued', 'displayed')
ORDER BY queued_at DESC 
LIMIT 1;
```

2. Call snooze action:
```javascript
const popupId = 'YOUR_POPUP_ID';
const snoozeUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

fetch(`/api/popups/${popupId}/action`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action_type: 'SNOOZE',
    snooze_until: snoozeUntil,
    action_data: { minutes: 60 }
  })
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
-- Check popup
SELECT 
  status,
  action_taken,
  snooze_until,
  closed_at
FROM popups 
WHERE id = 'YOUR_POPUP_ID';

-- Check reminder was snoozed
SELECT 
  id,
  status,
  remind_at,
  snooze_count
FROM reminders 
WHERE id = (
  SELECT reminder_id FROM popups WHERE id = 'YOUR_POPUP_ID'
);
```

**Expected Results:**
- [ ] Popup `status` = `'acted'`
- [ ] Popup `action_taken` = `'SNOOZE'`
- [ ] Popup `snooze_until` is set (1 hour from now)
- [ ] Reminder `remind_at` updated to future time
- [ ] Reminder `snooze_count` incremented

**Check Events:**
```sql
SELECT 
  event_type,
  event_data
FROM events 
WHERE event_type IN ('popup_snoozed', 'popup_action_clicked', 'reminder_scheduled')
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 3;
```

**Expected Results:**
- [ ] `popup_snoozed` event exists with `snooze_until` and `minutes`
- [ ] `popup_action_clicked` event exists
- [ ] `reminder_scheduled` event exists

---

### Test 2.6: Popup Action - Mark Done

**Objective**: Verify "Mark done" completes reminder and logs task_completed.

**Steps:**
1. Get a popup with reminder_id
2. Call mark done action:
```javascript
const popupId = 'YOUR_POPUP_ID';
fetch(`/api/popups/${popupId}/action`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action_type: 'MARK_DONE'
  })
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
-- Check popup
SELECT status, action_taken FROM popups WHERE id = 'YOUR_POPUP_ID';

-- Check reminder
SELECT status, sent_at FROM reminders 
WHERE id = (SELECT reminder_id FROM popups WHERE id = 'YOUR_POPUP_ID');
```

**Expected Results:**
- [ ] Popup `status` = `'acted'`
- [ ] Popup `action_taken` = `'MARK_DONE'`
- [ ] Reminder `status` = `'sent'` (or `'completed'`)
- [ ] Reminder `sent_at` is set

**Check Events:**
```sql
SELECT 
  event_type,
  event_data
FROM events 
WHERE event_type IN ('task_completed', 'popup_action_clicked', 'reminder_completed')
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 3;
```

**Expected Results:**
- [ ] `task_completed` event exists
- [ ] `popup_action_clicked` event exists
- [ ] `reminder_completed` event exists (if reminder was marked as sent)

---

### Test 2.7: Popup Action - Dismiss

**Objective**: Verify dismiss action logs popup_dismissed event.

**Steps:**
1. Get a displayed popup
2. Click "Dismiss" (X button) in UI
   - OR call API:
```javascript
const popupId = 'YOUR_POPUP_ID';
fetch(`/api/popups/${popupId}/dismiss`, {
  method: 'POST'
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
SELECT 
  status,
  closed_at
FROM popups 
WHERE id = 'YOUR_POPUP_ID';
```

**Expected Results:**
- [ ] `status` = `'dismissed'`
- [ ] `closed_at` is set

**Check Event:**
```sql
SELECT 
  event_type,
  event_data->>'popup_id' as popup_id
FROM events 
WHERE event_type = 'popup_dismissed' 
  AND event_data->>'popup_id' = 'YOUR_POPUP_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] `popup_dismissed` event exists

---

### Test 2.8: Eligibility Checks - Deduplication

**Objective**: Verify same event doesn't create duplicate popups.

**Steps:**
1. Log the same `email_opened` event twice (same `source_event_id`):
```javascript
const eventData = {
  event_type: 'email_opened',
  event_data: { contact_name: 'Test', thread_link: 'https://example.com' },
  source: 'extension_gmail',
  contact_id: 'YOUR_CONTACT_ID'
};

// First call
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(eventData)
})
.then(r => r.json())
.then(data => {
  console.log('First event:', data.event_id);
  
  // Second call with same data
  return fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
-- Count popups for this event
SELECT 
  COUNT(*) as popup_count,
  source_event_id
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND source_event_id IN (
    SELECT id FROM events 
    WHERE event_type = 'email_opened' 
      AND user_id = 'YOUR_USER_ID'
    ORDER BY created_at DESC 
    LIMIT 2
  )
GROUP BY source_event_id;
```

**Expected Results:**
- [ ] Only 1 popup per unique `source_event_id`
- [ ] Second event either:
  - Doesn't create a popup (dedupe check), OR
  - Creates popup but insert fails due to unique constraint (silently ignored)

**Check Unique Constraint:**
```sql
-- Verify unique index exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'popups' 
  AND indexdef LIKE '%source_event_id%'
  AND schemaname = 'public';
```

**Expected Results:**
- [ ] Unique index on `(user_id, source_event_id)` exists

---

### Test 2.9: Eligibility Checks - Cooldown

**Objective**: Verify global and per-rule cooldowns prevent popup spam.

**Test 2.9a: Global Cooldown (60 seconds)**

**Steps:**
1. Create a popup (use Test 2.1)
2. Immediately create another popup from different event:
```javascript
// Wait 0 seconds (should be blocked)
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'reminder_due',
    event_data: { contact_name: 'Test 2' },
    contact_id: 'YOUR_CONTACT_ID'
  })
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
-- Check if second popup was created
SELECT 
  COUNT(*) as popup_count,
  MAX(queued_at) - MIN(queued_at) as time_diff
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND queued_at > NOW() - INTERVAL '5 minutes';
```

**Expected Results:**
- [ ] Only 1 popup created (or second popup blocked by cooldown)
- [ ] If 2 popups exist, time difference >= 60 seconds

**Test 2.9b: Per-Rule Cooldown**

**Steps:**
1. Check rule cooldown:
```sql
SELECT rule_name, cooldown_seconds 
FROM popup_rules 
WHERE trigger_event_type = 'email_opened' 
  AND user_id = 'YOUR_USER_ID';
```

2. Create two `email_opened` events within cooldown period (e.g., 30 minutes)
3. Verify only one popup created

**Expected Results:**
- [ ] Second popup blocked if within `cooldown_seconds` of first

---

### Test 2.10: Eligibility Checks - Per-Entity Cap

**Objective**: Verify max popups per contact per day.

**Steps:**
1. Check rule max_per_day:
```sql
SELECT rule_name, max_per_day 
FROM popup_rules 
WHERE trigger_event_type = 'email_opened' 
  AND user_id = 'YOUR_USER_ID';
```

2. Create 7 `email_opened` events for the same contact (within same day):
```javascript
const contactId = 'YOUR_CONTACT_ID';
for (let i = 1; i <= 7; i++) {
  setTimeout(() => {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'email_opened',
        event_data: { contact_name: `Test ${i}` },
        contact_id: contactId
      })
    })
    .then(r => r.json())
    .then(data => console.log(`Event ${i}:`, data));
  }, i * 1000); // 1 second apart
}
```

**Verification:**
```sql
-- Count popups for this contact today
SELECT 
  COUNT(*) as popup_count,
  contact_id
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND contact_id = 'YOUR_CONTACT_ID'
  AND queued_at >= DATE_TRUNC('day', NOW())
GROUP BY contact_id;
```

**Expected Results:**
- [ ] Maximum `max_per_day` popups created (e.g., 6 for email_opened rule)
- [ ] 7th popup blocked by per-entity cap

---

### Test 2.11: Popup Expiry (TTL)

**Objective**: Verify expired popups are marked and events logged.

**Steps:**
1. Create a popup with short TTL:
```sql
-- Manually set expires_at to past
UPDATE popups 
SET expires_at = NOW() - INTERVAL '1 minute',
    status = 'queued'
WHERE user_id = 'YOUR_USER_ID'
  AND status = 'queued'
LIMIT 1;
```

2. Call GET /api/popups:
```javascript
fetch('/api/popups')
  .then(r => r.json())
  .then(console.log);
```

**Verification:**
```sql
-- Check expired popup
SELECT 
  id,
  status,
  expires_at,
  closed_at
FROM popups 
WHERE expires_at < NOW()
  AND user_id = 'YOUR_USER_ID'
ORDER BY expires_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] `status` = `'expired'`
- [ ] `closed_at` is set

**Check popup_expired Event:**
```sql
SELECT 
  event_type,
  event_data->>'popup_id' as popup_id,
  event_data->>'rule_id' as rule_id
FROM events 
WHERE event_type = 'popup_expired' 
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] `popup_expired` event exists
- [ ] `popup_id` matches expired popup
- [ ] `rule_id` is included

**Verify Expired Popup Not Shown:**
```sql
-- Expired popups should not be returned by getNextPopup
SELECT * FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND status IN ('queued', 'pending')
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY priority DESC, queued_at ASC 
LIMIT 1;
```

**Expected Results:**
- [ ] Expired popup not in results

---

### Test 2.12: Affirmation Rotation

**Objective**: Verify affirmations are appended and rotate to avoid repetition.

**Prerequisites:**
- User must have `affirmation_frequency` set in profiles:
```sql
UPDATE profiles 
SET affirmation_frequency = 'balanced',
    tone_preference = 'motivational'
WHERE id = 'YOUR_USER_ID';
```

**Steps:**
1. Create multiple popups:
```javascript
// Create 6 popups quickly
for (let i = 1; i <= 6; i++) {
  setTimeout(() => {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'reminder_completed',
        event_data: { contact_name: `Contact ${i}` }
      })
    });
  }, i * 500);
}
```

**Verification:**
```sql
-- Check affirmations in recent popups
SELECT 
  id,
  affirmation,
  queued_at
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND affirmation IS NOT NULL
ORDER BY queued_at DESC 
LIMIT 6;
```

**Expected Results:**
- [ ] All popups have `affirmation` set (not null)
- [ ] Affirmations are different (no immediate repetition in first 5)
- [ ] Affirmations match user's `tone_preference`

**Check Rotation Logic:**
```sql
-- Count unique affirmations in last 5
SELECT 
  COUNT(DISTINCT affirmation) as unique_count,
  COUNT(*) as total_count
FROM (
  SELECT affirmation 
  FROM popups 
  WHERE user_id = 'YOUR_USER_ID'
    AND affirmation IS NOT NULL
  ORDER BY queued_at DESC 
  LIMIT 5
) subq;
```

**Expected Results:**
- [ ] At least 3-4 unique affirmations in last 5 popups (rotation working)

---

### Test 2.13: Email Opened Time Calculation

**Objective**: Verify email opened popup shows "X minutes/hours/days ago".

**Steps:**
1. Create an `email_opened` event with old timestamp (simulate):
```sql
-- Create event 2 hours ago
INSERT INTO events (user_id, event_type, source, contact_id, event_data, created_at)
VALUES (
  'YOUR_USER_ID',
  'email_opened',
  'extension_gmail',
  'YOUR_CONTACT_ID',
  '{"contact_name": "Test Contact", "thread_link": "https://example.com"}'::jsonb,
  NOW() - INTERVAL '2 hours'
)
RETURNING id;
```

2. Manually trigger popup creation (or wait for automatic):
```sql
-- Get the event ID
SELECT id FROM events 
WHERE event_type = 'email_opened' 
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC 
LIMIT 1;
```

3. Check popup message:
```sql
SELECT 
  message,
  payload->>'source_event_created_at' as event_time
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND source_event_id = (
    SELECT id FROM events 
    WHERE event_type = 'email_opened' 
      AND user_id = 'YOUR_USER_ID'
    ORDER BY created_at DESC 
    LIMIT 1
  );
```

**Expected Results:**
- [ ] `message` contains "opened 2 hours ago" (or "opened X hours ago")
- [ ] Time calculation is accurate

**Test Different Time Ranges:**
- 5 minutes ago → "opened 5 minutes ago"
- 1 hour ago → "opened 1 hour ago"
- 2 days ago → "opened 2 days ago"

---

### Test 2.14: Action Debouncing

**Objective**: Verify duplicate actions are prevented.

**Steps:**
1. Get a displayed popup
2. Call action endpoint twice quickly:
```javascript
const popupId = 'YOUR_POPUP_ID';
const action = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action_type: 'MARK_DONE' })
};

// First call
fetch(`/api/popups/${popupId}/action`, action)
  .then(r => r.json())
  .then(data => {
    console.log('First call:', data);
    
    // Second call immediately
    return fetch(`/api/popups/${popupId}/action`, action);
  })
  .then(r => r.json())
  .then(data => console.log('Second call:', data));
```

**Verification:**
```sql
-- Check popup status
SELECT status, action_taken FROM popups WHERE id = 'YOUR_POPUP_ID';

-- Check events (should only be one action_clicked)
SELECT 
  COUNT(*) as event_count,
  event_type
FROM events 
WHERE event_type = 'popup_action_clicked'
  AND event_data->>'popup_id' = 'YOUR_POPUP_ID'
GROUP BY event_type;
```

**Expected Results:**
- [ ] Second call returns 409 Conflict or error
- [ ] Only 1 `popup_action_clicked` event exists
- [ ] Popup `status` = `'acted'` (not changed twice)

**UI Check:**
- [ ] Buttons disabled after first click (loading state)
- [ ] Second click doesn't trigger another API call

---

### Test 2.15: Default Popup Rules

**Objective**: Verify default rules are created for new users.

**Steps:**
1. Check if default rules exist:
```sql
SELECT 
  rule_name,
  trigger_event_type,
  template_key,
  priority,
  cooldown_seconds,
  max_per_day,
  ttl_seconds,
  enabled
FROM popup_rules 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY priority DESC;
```

**Expected Results:**
- [ ] At least 4 default rules exist:
  - `email_opened` (priority 9, cooldown 30min, max 6/day)
  - `reminder_due` (priority 8, cooldown 15min, max 10/day)
  - `reminder_completed` (priority 7, cooldown 5min, max 20/day)
  - `no_reply_after_n_days` (priority 7, cooldown 12hr, max 6/day)
- [ ] All rules have `enabled` = `true`
- [ ] All rules have valid `template_key`

**Test Rule Creation for New User:**
1. Create a test user (or use existing)
2. Trigger an event that should create default rules:
```javascript
// This should trigger ensureDefaultPopupRules
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'email_opened',
    event_data: { contact_name: 'Test' }
  })
})
.then(r => r.json())
.then(() => {
  // Check rules were created
  return fetch('/api/popups');
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
-- Check rules exist after event
SELECT COUNT(*) as rule_count 
FROM popup_rules 
WHERE user_id = 'YOUR_USER_ID';
```

**Expected Results:**
- [ ] Default rules created automatically

---

### Test 2.16: UI Components & Animations

**Objective**: Verify popup UI displays correctly with animations.

**Steps:**
1. Navigate to dashboard
2. Trigger a popup (use Test 2.1)
3. Observe popup appearance

**Visual Checks:**
- [ ] Popup appears in bottom-right corner
- [ ] Popup has smooth fade-in animation (200-300ms)
- [ ] Popup slides up slightly on enter
- [ ] Title is displayed correctly
- [ ] Message is displayed correctly
- [ ] Affirmation is displayed (if set)
- [ ] Action buttons are visible:
  - [ ] "Follow up now" (primary button)
  - [ ] "Snooze" dropdown (if reminder_id exists)
  - [ ] "Mark done" (if reminder_id exists)
  - [ ] "Dismiss" (X icon)
- [ ] Popup has correct template styling (success/streak/inactivity/follow_up_required)

**Animation Checks:**
- [ ] Enter animation: `opacity-0 translate-y-2` → `opacity-100 translate-y-0`
- [ ] Exit animation: `opacity-100 translate-y-0` → `opacity-0 translate-y-2`
- [ ] Animations respect reduced motion preference:
  - Enable: `prefers-reduced-motion: reduce` in browser
  - Verify animations are disabled

**Interaction Checks:**
- [ ] Click "Follow up now" → Opens link or redirects
- [ ] Click "Snooze" → Dropdown shows options (1h, Tomorrow, Next week)
- [ ] Click "Mark done" → Popup closes, reminder completed
- [ ] Click "Dismiss" → Popup closes with fade-out
- [ ] Buttons show loading state during API calls
- [ ] Buttons are disabled during loading

**Browser Console:**
- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] Network requests succeed (200 status)

---

## Integration Testing

### Test 3.1: End-to-End Flow - Email Opened → Popup → Action

**Objective**: Test complete flow from event to action.

**Steps:**
1. Log `email_opened` event
2. Verify popup created
3. Verify popup displayed in UI
4. Click "Follow up now"
5. Verify action processed
6. Verify all events logged

**Complete Flow:**
```javascript
// Step 1: Log event
const eventResponse = await fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'email_opened',
    event_data: {
      contact_name: 'Integration Test',
      thread_link: 'https://mail.google.com/mail/u/0/#inbox/test123'
    },
    contact_id: 'YOUR_CONTACT_ID'
  })
});
const eventData = await eventResponse.json();
console.log('Event logged:', eventData.event_id);

// Step 2: Wait a moment, then fetch popup
setTimeout(async () => {
  const popupResponse = await fetch('/api/popups');
  const popupData = await popupResponse.json();
  console.log('Popup:', popupData.popup);
  
  if (popupData.popup) {
    // Step 3: Take action
    const actionResponse = await fetch(`/api/popups/${popupData.popup.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: 'FOLLOW_UP_NOW' })
    });
    const actionData = await actionResponse.json();
    console.log('Action taken:', actionData);
  }
}, 2000);
```

**Verification:**
```sql
-- Check all events in sequence
SELECT 
  event_type,
  created_at,
  event_data
FROM events 
WHERE user_id = 'YOUR_USER_ID'
  AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at ASC;
```

**Expected Sequence:**
1. `email_opened` event
2. `popup_shown` event
3. `popup_action_clicked` event (with `action_type: 'FOLLOW_UP_NOW'`)

**Expected Results:**
- [ ] All events logged in correct order
- [ ] Popup created and displayed
- [ ] Action processed successfully
- [ ] UI updated correctly

---

### Test 3.2: Multiple Events Priority Resolution

**Objective**: Verify highest priority popup is shown first.

**Steps:**
1. Create multiple events simultaneously:
```javascript
const events = [
  { event_type: 'email_opened', priority: 9 },
  { event_type: 'reminder_due', priority: 8 },
  { event_type: 'reminder_completed', priority: 7 }
];

Promise.all(events.map(evt => 
  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: evt.event_type,
      event_data: { contact_name: 'Test' }
    })
  })
))
.then(() => {
  // Fetch popup
  return fetch('/api/popups');
})
.then(r => r.json())
.then(data => {
  console.log('Popup shown:', data.popup);
  console.log('Priority:', data.popup?.priority);
});
```

**Verification:**
```sql
-- Check all popups created
SELECT 
  id,
  title,
  priority,
  status,
  queued_at
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND queued_at > NOW() - INTERVAL '5 minutes'
ORDER BY priority DESC, queued_at ASC;
```

**Expected Results:**
- [ ] Multiple popups created (one per event)
- [ ] Highest priority popup (priority 9) is returned first by `GET /api/popups`
- [ ] Lower priority popups remain `queued`

---

## Edge Cases & Error Scenarios

### Test 4.1: Missing Contact ID

**Objective**: Verify popup works when contact_id is missing.

**Steps:**
```javascript
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'email_opened',
    event_data: { contact_name: 'Unknown Contact' }
    // No contact_id
  })
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
SELECT 
  contact_id,
  message
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
ORDER BY queued_at DESC 
LIMIT 1;
```

**Expected Results:**
- [ ] Popup created successfully
- [ ] `contact_id` is NULL
- [ ] Message uses fallback: "this contact" or contact_name from event_data

---

### Test 4.2: Missing Thread Link

**Objective**: Verify "Follow up now" falls back to dashboard.

**Steps:**
1. Create popup without thread_link
2. Click "Follow up now"

**Verification:**
- [ ] Action succeeds
- [ ] Redirects to dashboard contact page (if contact_id exists)
- [ ] OR redirects to dashboard reminder page (if reminder_id exists)
- [ ] OR redirects to dashboard home (if neither exists)

---

### Test 4.3: User Preferences - In-App Notifications Disabled

**Objective**: Verify popups are not shown when disabled.

**Steps:**
1. Disable in-app notifications:
```sql
UPDATE profiles 
SET in_app_notifications = false
WHERE id = 'YOUR_USER_ID';
```

2. Create an event that should trigger popup:
```javascript
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'email_opened',
    event_data: { contact_name: 'Test' }
  })
})
.then(r => r.json())
.then(console.log);
```

**Verification:**
```sql
-- Check if popup was created
SELECT COUNT(*) as popup_count 
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND queued_at > NOW() - INTERVAL '5 minutes';
```

**Expected Results:**
- [ ] No popup created (eligibility check failed)
- [ ] Event still logged

---

### Test 4.4: Invalid Popup ID

**Objective**: Verify error handling for invalid popup IDs.

**Steps:**
```javascript
fetch('/api/popups/invalid-id-123/action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action_type: 'MARK_DONE' })
})
.then(r => r.json())
.then(console.log);
```

**Expected Results:**
- [ ] Response status: 404
- [ ] Error message: "Popup not found"

---

### Test 4.5: Network Failure Handling

**Objective**: Verify UI handles API failures gracefully.

**Steps:**
1. Open browser DevTools → Network tab
2. Enable "Offline" mode
3. Try to interact with popup (click action button)

**Expected Results:**
- [ ] Error toast shown: "Failed to complete action"
- [ ] Popup remains visible (not closed)
- [ ] No JavaScript errors
- [ ] App doesn't crash

---

## Database Verification

### Test 5.1: Schema Integrity

**Run in Supabase SQL Editor:**
```sql
-- Check all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'events',
    'behaviour_triggers',
    'popup_rules',
    'popups',
    'profiles',
    'reminders',
    'contacts'
  )
ORDER BY table_name;

-- Check popup_rules schema
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'popup_rules' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check popups schema (Milestone 2 columns)
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'popups' 
  AND table_schema = 'public'
  AND column_name IN (
    'rule_id',
    'source_event_id',
    'dedupe_hash',
    'queued_at',
    'displayed_at',
    'closed_at',
    'expires_at',
    'snooze_until',
    'action_taken',
    'payload'
  )
ORDER BY column_name;
```

**Expected Results:**
- [ ] All tables exist
- [ ] All Milestone 2 columns exist in `popups` table
- [ ] Data types are correct

---

### Test 5.2: Indexes & Constraints

```sql
-- Check unique constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'popups'::regclass
  AND contype = 'u';

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'popups' 
  AND schemaname = 'public';
```

**Expected Results:**
- [ ] Unique constraint on `(user_id, source_event_id)`
- [ ] Unique constraint on `(user_id, dedupe_hash)` (if exists)
- [ ] Indexes on: `user_id`, `status`, `priority`, `queued_at`

---

### Test 5.3: RLS Policies

```sql
-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('events', 'popups', 'popup_rules', 'behaviour_triggers');

-- Check policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('events', 'popups', 'popup_rules', 'behaviour_triggers')
  AND schemaname = 'public';
```

**Expected Results:**
- [ ] RLS enabled on all tables
- [ ] Policies exist for SELECT, INSERT, UPDATE
- [ ] Policies restrict access to user's own data

---

## Performance Testing

### Test 6.1: Multiple Popups Creation

**Objective**: Verify system handles bulk popup creation.

**Steps:**
```javascript
// Create 50 events rapidly
const promises = [];
for (let i = 0; i < 50; i++) {
  promises.push(
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'reminder_completed',
        event_data: { contact_name: `Contact ${i}` }
      })
    })
  );
}

Promise.all(promises)
  .then(responses => Promise.all(responses.map(r => r.json())))
  .then(results => {
    console.log('Created events:', results.length);
    console.log('Success rate:', results.filter(r => r.success).length / results.length);
  });
```

**Verification:**
```sql
-- Check popup creation rate
SELECT 
  COUNT(*) as popup_count,
  MIN(queued_at) as first_popup,
  MAX(queued_at) as last_popup,
  EXTRACT(EPOCH FROM (MAX(queued_at) - MIN(queued_at))) as duration_seconds
FROM popups 
WHERE user_id = 'YOUR_USER_ID'
  AND queued_at > NOW() - INTERVAL '5 minutes';
```

**Expected Results:**
- [ ] All events processed (may be rate-limited by cooldowns)
- [ ] Popups created within reasonable time (< 10 seconds for 50 events)
- [ ] No database errors
- [ ] Cooldowns respected (not all 50 popups created)

---

### Test 6.2: API Response Times

**Objective**: Verify API endpoints respond quickly.

**Steps:**
1. Open browser DevTools → Network tab
2. Call each endpoint and measure response time:
```javascript
async function measureTime(url, options = {}) {
  const start = performance.now();
  const response = await fetch(url, options);
  const end = performance.now();
  console.log(`${url}: ${(end - start).toFixed(2)}ms`);
  return response;
}

// Test endpoints
await measureTime('/api/events?limit=10');
await measureTime('/api/popups');
await measureTime('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'reminder_created',
    event_data: {}
  })
});
```

**Expected Results:**
- [ ] GET `/api/events`: < 500ms
- [ ] GET `/api/popups`: < 300ms
- [ ] POST `/api/events`: < 1000ms

---

## Final Checklist

### Milestone 1 Completion

- [ ] All event types can be logged
- [ ] Events are stored correctly in database
- [ ] Triggers are created for appropriate events
- [ ] Scheduled endpoints work (missed reminders, inactivity)
- [ ] Streak tracking works
- [ ] API validation works (rejects invalid events)
- [ ] RLS policies work (users can only see their events)
- [ ] Database schema is correct

### Milestone 2 Completion

- [ ] Popups are created from events
- [ ] Popups are displayed in UI
- [ ] All button actions work (Follow up, Snooze, Mark done, Dismiss)
- [ ] Eligibility checks work (dedupe, cooldown, caps)
- [ ] Popup expiry works (TTL)
- [ ] Affirmations are appended and rotate
- [ ] Email opened time calculation is accurate
- [ ] Action debouncing prevents duplicates
- [ ] Default rules are created
- [ ] UI animations work correctly
- [ ] Error handling is graceful

### Integration

- [ ] End-to-end flows work (event → popup → action)
- [ ] Multiple events handled correctly
- [ ] Priority resolution works
- [ ] Edge cases handled gracefully

### Performance

- [ ] API response times acceptable
- [ ] Bulk operations don't crash system
- [ ] Database queries are optimized

---

## Test Results Summary

**Date**: _______________

**Tester**: _______________

**Environment**: [ ] Development [ ] Staging [ ] Production

### Milestone 1 Results

| Test | Status | Notes |
|------|--------|-------|
| 1.1 Event Logging - Reminder Created | [ ] Pass [ ] Fail | |
| 1.2 Event Logging - Reminder Completed | [ ] Pass [ ] Fail | |
| 1.3 Event Logging - Reminder Snoozed | [ ] Pass [ ] Fail | |
| 1.4 Event Logging - Reminder Dismissed | [ ] Pass [ ] Fail | |
| 1.5 API Endpoint - POST /api/events | [ ] Pass [ ] Fail | |
| 1.6 API Endpoint - GET /api/events | [ ] Pass [ ] Fail | |
| 1.7 Scheduled Endpoint - Check Missed | [ ] Pass [ ] Fail | |
| 1.8 Scheduled Endpoint - Check Inactivity | [ ] Pass [ ] Fail | |
| 1.9 Streak Tracking | [ ] Pass [ ] Fail | |
| 1.10 Database Schema Verification | [ ] Pass [ ] Fail | |

### Milestone 2 Results

| Test | Status | Notes |
|------|--------|-------|
| 2.1 Popup Creation - Email Opened | [ ] Pass [ ] Fail | |
| 2.2 Popup Display - GET /api/popups | [ ] Pass [ ] Fail | |
| 2.3 Popup Display - POST /api/popups/[id]/displayed | [ ] Pass [ ] Fail | |
| 2.4 Popup Action - Follow Up Now | [ ] Pass [ ] Fail | |
| 2.5 Popup Action - Snooze | [ ] Pass [ ] Fail | |
| 2.6 Popup Action - Mark Done | [ ] Pass [ ] Fail | |
| 2.7 Popup Action - Dismiss | [ ] Pass [ ] Fail | |
| 2.8 Eligibility - Deduplication | [ ] Pass [ ] Fail | |
| 2.9 Eligibility - Cooldown | [ ] Pass [ ] Fail | |
| 2.10 Eligibility - Per-Entity Cap | [ ] Pass [ ] Fail | |
| 2.11 Popup Expiry (TTL) | [ ] Pass [ ] Fail | |
| 2.12 Affirmation Rotation | [ ] Pass [ ] Fail | |
| 2.13 Email Opened Time Calculation | [ ] Pass [ ] Fail | |
| 2.14 Action Debouncing | [ ] Pass [ ] Fail | |
| 2.15 Default Popup Rules | [ ] Pass [ ] Fail | |
| 2.16 UI Components & Animations | [ ] Pass [ ] Fail | |

### Integration Results

| Test | Status | Notes |
|------|--------|-------|
| 3.1 End-to-End Flow | [ ] Pass [ ] Fail | |
| 3.2 Multiple Events Priority | [ ] Pass [ ] Fail | |

### Edge Cases Results

| Test | Status | Notes |
|------|--------|-------|
| 4.1 Missing Contact ID | [ ] Pass [ ] Fail | |
| 4.2 Missing Thread Link | [ ] Pass [ ] Fail | |
| 4.3 In-App Notifications Disabled | [ ] Pass [ ] Fail | |
| 4.4 Invalid Popup ID | [ ] Pass [ ] Fail | |
| 4.5 Network Failure Handling | [ ] Pass [ ] Fail | |

### Overall Status

**Milestone 1**: [ ] ✅ Complete [ ] ❌ Issues Found

**Milestone 2**: [ ] ✅ Complete [ ] ❌ Issues Found

**Ready for Milestone 3**: [ ] Yes [ ] No

**Issues Found** (if any):
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

---

## Next Steps

If all tests pass:
1. ✅ Mark Milestone 1 & 2 as complete
2. ✅ Document any edge cases discovered
3. ✅ Proceed to Milestone 3 planning

If issues found:
1. ❌ Document issues in detail
2. ❌ Prioritize fixes
3. ❌ Re-test after fixes
4. ❌ Update this guide with new test cases if needed

---

**End of QA Testing Guide**

