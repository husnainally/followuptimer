# QA Testing Guide: Milestone 3 & 3.1
## Affirmation Engine & Analytics

**Version:** 1.0  
**Last Updated:** 2025-01-18  
**Scope:** Milestone 3 (Affirmation Engine) + Milestone 3.1 (Analytics & Reporting)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Milestone 3: Affirmation Engine Testing](#milestone-3-affirmation-engine-testing)
3. [Milestone 3.1: Analytics & Reporting Testing](#milestone-31-analytics--reporting-testing)
4. [Integration Testing](#integration-testing)
5. [Edge Cases & Error Handling](#edge-cases--error-handling)
6. [Database Verification](#database-verification)
7. [Performance Testing](#performance-testing)
8. [Final Checklist](#final-checklist)

---

## Prerequisites

### 1. Database Setup

**Verify migrations are applied:**

```sql
-- Check if affirmation tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'affirmation_categories',
    'affirmations',
    'affirmation_usage',
    'user_affirmation_preferences'
  );

-- Check if event types are added
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')
  AND enumlabel IN ('affirmation_shown', 'affirmation_suppressed', 'affirmation_action_clicked');

-- Check if suppression_reason enum exists
SELECT typname FROM pg_type WHERE typname = 'affirmation_suppression_reason';
```

**Expected Results:**
- [ ] All 4 tables exist
- [ ] All 3 event types exist in enum
- [ ] `affirmation_suppression_reason` enum exists

**Verify seed data:**

```sql
-- Check affirmation categories
SELECT COUNT(*) as category_count FROM affirmation_categories;
-- Expected: 6 categories

-- Check affirmations
SELECT category, COUNT(*) as count 
FROM affirmations 
GROUP BY category 
ORDER BY category;
-- Expected: 
--   sales_momentum: 10
--   calm_productivity: 8
--   consistency: 8
--   resilience: 8
--   focus: 8
--   general_positive: 8
--   Total: 50
```

**Expected Results:**
- [ ] 6 categories exist
- [ ] 50 affirmations total (10+8+8+8+8+8)

### 2. User Profile Setup

**Enable affirmations for test user:**

```sql
-- Update user profile to enable affirmations
UPDATE profiles 
SET affirmation_frequency = 'normal' 
WHERE id = 'YOUR_USER_ID';
```

**Or via UI:**
- Navigate to Settings → Notifications
- Ensure "Affirmation Frequency" is set to a non-null value

**Expected Results:**
- [ ] User profile has `affirmation_frequency` set

### 3. Test Data Preparation

**Create test reminders for popup triggers:**

```sql
-- Create a reminder that will trigger a popup
INSERT INTO reminders (
  user_id,
  title,
  due_date,
  status,
  contact_id
) VALUES (
  'YOUR_USER_ID',
  'Test Reminder for Affirmation',
  NOW() + INTERVAL '1 hour',
  'pending',
  NULL
);
```

---

## Milestone 3: Affirmation Engine Testing

### Test 3.1: Database Schema Verification

**Objective:** Verify all database tables, columns, and relationships are correct.

**Steps:**
1. Run the Prerequisites SQL queries above
2. Verify table structures:

```sql
-- Check affirmation_categories structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'affirmation_categories'
ORDER BY ordinal_position;

-- Check affirmations structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'affirmations'
ORDER BY ordinal_position;

-- Check affirmation_usage structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'affirmation_usage'
ORDER BY ordinal_position;

-- Check user_affirmation_preferences structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_affirmation_preferences'
ORDER BY ordinal_position;
```

**Expected Results:**
- [ ] `affirmation_categories`: `id`, `name`, `description`, `created_at`
- [ ] `affirmations`: `id`, `text`, `category`, `enabled`, `created_at`, `updated_at`
- [ ] `affirmation_usage`: `id`, `user_id`, `affirmation_id`, `popup_id`, `shown_at`, `category`
- [ ] `user_affirmation_preferences`: `user_id` (PK), 6 category toggles, `global_cooldown_minutes`, `daily_cap`, `updated_at`

### Test 3.2: User Preferences UI

**Objective:** Verify the Affirmation Settings UI works correctly.

**Steps:**
1. Navigate to Settings → Affirmations tab
2. Verify UI loads without errors
3. Check all 6 category toggles are visible:
   - Sales Momentum
   - Calm Productivity
   - Consistency & Habits
   - Resilience & Confidence
   - Focus & Execution
   - General Positive
4. Verify frequency controls:
   - Global Cooldown (minutes) input
   - Daily Cap input
5. Toggle off one category (e.g., "Sales Momentum")
6. Change Global Cooldown to 15 minutes
7. Change Daily Cap to 5
8. Click "Save Preferences"
9. Refresh the page
10. Verify settings persisted

**Expected Results:**
- [ ] UI loads without errors
- [ ] All 6 category toggles visible with descriptions
- [ ] Frequency controls visible with labels
- [ ] Can toggle categories on/off
- [ ] Can change cooldown and daily cap values
- [ ] Save button works
- [ ] Success toast appears
- [ ] Settings persist after refresh
- [ ] Cannot save with all categories disabled (should show error)

**Database Verification:**

```sql
-- Check saved preferences
SELECT * FROM user_affirmation_preferences 
WHERE user_id = 'YOUR_USER_ID';
```

**Expected Results:**
- [ ] Row exists with correct `user_id`
- [ ] Toggled category shows `false`
- [ ] `global_cooldown_minutes` = 15
- [ ] `daily_cap` = 5
- [ ] `updated_at` is recent

### Test 3.3: Affirmation Selection - Basic Flow

**Objective:** Verify affirmations are selected and shown in popups.

**Steps:**
1. Reset user preferences to defaults (all categories enabled, cooldown: 30, cap: 10)
2. Create a reminder that will trigger a popup (due in 1 hour)
3. Wait for popup to appear (or trigger manually via API)
4. Check if popup contains an affirmation text
5. Verify affirmation appears below the main popup message
6. Note the affirmation text and category

**Expected Results:**
- [ ] Popup appears
- [ ] Popup contains affirmation text
- [ ] Affirmation is displayed below main message
- [ ] Affirmation text is one of the 50 seeded affirmations
- [ ] Affirmation belongs to an enabled category

**Database Verification:**

```sql
-- Check popup has affirmation
SELECT id, affirmation, payload 
FROM popups 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 1;

-- Check affirmation_usage record
SELECT au.*, a.text, a.category
FROM affirmation_usage au
JOIN affirmations a ON au.affirmation_id = a.id
WHERE au.user_id = 'YOUR_USER_ID'
ORDER BY au.shown_at DESC
LIMIT 1;

-- Check affirmation_shown event
SELECT event_type, event_data, created_at
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'affirmation_shown'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] Popup record has `affirmation` field populated
- [ ] `affirmation_usage` record exists with correct `user_id`, `affirmation_id`, `popup_id`
- [ ] `affirmation_shown` event exists with:
  - [ ] `affirmation_id` in `event_data`
  - [ ] `category` in `event_data`
  - [ ] `popup_id` in `event_data`
  - [ ] `context_type` in `event_data`

### Test 3.4: Global Cooldown

**Objective:** Verify global cooldown prevents affirmations from showing too frequently.

**Steps:**
1. Set Global Cooldown to 5 minutes (for faster testing)
2. Create a reminder and trigger a popup
3. Verify affirmation appears
4. Immediately create another reminder and trigger another popup
5. Verify NO affirmation appears (cooldown active)
6. Wait 5+ minutes
7. Trigger another popup
8. Verify affirmation appears again

**Expected Results:**
- [ ] First popup shows affirmation
- [ ] Second popup (immediate) does NOT show affirmation
- [ ] After cooldown expires, third popup shows affirmation

**Database Verification:**

```sql
-- Check suppression events for cooldown
SELECT event_type, event_data, created_at
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'affirmation_suppressed'
  AND (event_data->>'reason') = 'cooldown_active'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `affirmation_suppressed` event exists with `reason: 'cooldown_active'`
- [ ] `event_data` contains `minutes_remaining` field
- [ ] `minutes_remaining` is approximately 5 (or less)

### Test 3.5: Daily Cap

**Objective:** Verify daily cap limits affirmations per day.

**Steps:**
1. Set Daily Cap to 2 (for faster testing)
2. Reset today's count (optional: delete today's `affirmation_usage` records)
3. Trigger 2 popups (should show affirmations)
4. Trigger a 3rd popup
5. Verify NO affirmation appears (daily cap reached)

**Expected Results:**
- [ ] First 2 popups show affirmations
- [ ] 3rd popup does NOT show affirmation

**Database Verification:**

```sql
-- Check today's count
SELECT COUNT(*) as count_today
FROM affirmation_usage
WHERE user_id = 'YOUR_USER_ID'
  AND DATE(shown_at) = CURRENT_DATE;

-- Check suppression event
SELECT event_type, event_data
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'affirmation_suppressed'
  AND (event_data->>'reason') = 'daily_limit_reached'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `count_today` = 2
- [ ] `affirmation_suppressed` event exists with `reason: 'daily_limit_reached'`
- [ ] `event_data` contains `count_today: 2` and `daily_cap: 2`

### Test 3.6: Category Disabling

**Objective:** Verify disabling categories prevents those affirmations from showing.

**Steps:**
1. Disable "Sales Momentum" category
2. Enable all other categories
3. Create a reminder that triggers a popup (context: `reminder_due` or `email_opened`)
4. Verify affirmation appears
5. Check that affirmation is NOT from "Sales Momentum" category
6. Repeat 5-10 times to ensure variety
7. Verify no "Sales Momentum" affirmations appear

**Expected Results:**
- [ ] Affirmations appear
- [ ] No affirmations from "Sales Momentum" category
- [ ] Affirmations come from other enabled categories

**Database Verification:**

```sql
-- Check recent affirmations shown
SELECT a.category, COUNT(*) as count
FROM affirmation_usage au
JOIN affirmations a ON au.affirmation_id = a.id
WHERE au.user_id = 'YOUR_USER_ID'
  AND au.shown_at > NOW() - INTERVAL '1 hour'
GROUP BY a.category;
```

**Expected Results:**
- [ ] No `sales_momentum` in results
- [ ] Only enabled categories appear

### Test 3.7: Context-Aware Category Selection

**Objective:** Verify affirmations are selected based on popup/event context.

**Steps:**
1. Enable all categories
2. Create a reminder and mark it as completed
3. Trigger popup (context: `reminder_completed`)
4. Note the affirmation category
5. Create a reminder that's due
6. Trigger popup (context: `reminder_due`)
7. Note the affirmation category
8. Create a missed reminder
9. Trigger popup (context: `reminder_missed`)
10. Note the affirmation category

**Expected Results:**
- [ ] `reminder_completed` → Affirmations from "Consistency" or "General Positive"
- [ ] `reminder_due` → Affirmations from "Sales Momentum" or "Focus"
- [ ] `reminder_missed` → Affirmations from "Resilience" or "Calm Productivity"

**Database Verification:**

```sql
-- Check context_type in events
SELECT 
  (event_data->>'context_type') as context_type,
  (event_data->>'category') as category,
  COUNT(*) as count
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'affirmation_shown'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY context_type, category
ORDER BY context_type, count DESC;
```

**Expected Results:**
- [ ] Context types match event types
- [ ] Categories align with expected context mappings

### Test 3.8: No-Repetition Logic

**Objective:** Verify affirmations don't repeat immediately.

**Steps:**
1. Set cooldown to 0 minutes (for faster testing)
2. Set daily cap to 20
3. Enable all categories
4. Trigger 10 popups in quick succession
5. Collect all affirmation texts
6. Verify no exact duplicates in the first 10
7. Continue triggering popups (11-20)
8. Verify affirmations start repeating only after cycling through available ones

**Expected Results:**
- [ ] First 10 affirmations are all different
- [ ] After 10+, some repetition may occur (expected after cycling)

**Database Verification:**

```sql
-- Check recent affirmations for duplicates
SELECT 
  a.text,
  COUNT(*) as count,
  array_agg(au.shown_at ORDER BY au.shown_at) as shown_times
FROM affirmation_usage au
JOIN affirmations a ON au.affirmation_id = a.id
WHERE au.user_id = 'YOUR_USER_ID'
  AND au.shown_at > NOW() - INTERVAL '1 hour'
GROUP BY a.text
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

**Expected Results:**
- [ ] No duplicates in first 10 shown
- [ ] Duplicates only appear after cycling through available affirmations

### Test 3.9: Affirmations Disabled by User

**Objective:** Verify affirmations don't show when user has them disabled.

**Steps:**
1. Disable affirmations in user profile:

```sql
UPDATE profiles 
SET affirmation_frequency = NULL 
WHERE id = 'YOUR_USER_ID';
```

2. Trigger a popup
3. Verify NO affirmation appears
4. Re-enable affirmations:

```sql
UPDATE profiles 
SET affirmation_frequency = 'normal' 
WHERE id = 'YOUR_USER_ID';
```

5. Trigger another popup
6. Verify affirmation appears

**Expected Results:**
- [ ] When disabled: No affirmation shown
- [ ] When enabled: Affirmation shown

**Database Verification:**

```sql
-- Check suppression event
SELECT event_type, event_data
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'affirmation_suppressed'
  AND (event_data->>'reason') = 'disabled_by_user'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] `affirmation_suppressed` event exists with `reason: 'disabled_by_user'`

---

## Milestone 3.1: Analytics & Reporting Testing

### Test 3.1.1: User Analytics Endpoint

**Objective:** Verify user analytics endpoint returns correct data.

**Steps:**
1. Generate some test data:
   - Show 5 affirmations
   - Suppress 3 affirmations (via cooldown/cap)
2. Call the API:

```javascript
// In browser console or API client
const response = await fetch('/api/analytics/affirmations/user?range=7d');
const data = await response.json();
console.log(data);
```

**Expected Results:**
- [ ] Response status: 200
- [ ] Response structure:
  ```json
  {
    "success": true,
    "range_days": 7,
    "analytics": {
      "shown_count": 5,
      "suppressed_count": 3,
      "top_categories": [
        { "category": "sales_momentum", "count": 2 },
        { "category": "focus", "count": 1 },
        ...
      ],
      "last_shown_at": "2025-01-18T10:30:00Z",
      "suppression_reasons": [
        { "reason": "cooldown_active", "count": 2 },
        { "reason": "daily_limit_reached", "count": 1 }
      ],
      "current_daily_count": 5,
      "daily_cap": 10,
      "cooldown_remaining_minutes": 15
    }
  }
  ```

**Verify each field:**
- [ ] `shown_count` matches actual shown affirmations
- [ ] `suppressed_count` matches actual suppressions
- [ ] `top_categories` sorted by count (descending)
- [ ] `last_shown_at` is most recent timestamp
- [ ] `suppression_reasons` sorted by count (descending)
- [ ] `current_daily_count` is today's count
- [ ] `daily_cap` matches user preferences
- [ ] `cooldown_remaining_minutes` is accurate (or null if none)

**Test different ranges:**

```javascript
// Test 30 days
const response30d = await fetch('/api/analytics/affirmations/user?range=30d');
const data30d = await response30d.json();
console.log('30 days:', data30d);

// Test 1 week
const response1w = await fetch('/api/analytics/affirmations/user?range=1w');
const data1w = await response1w.json();
console.log('1 week:', data1w);

// Test default (no range param)
const responseDefault = await fetch('/api/analytics/affirmations/user');
const dataDefault = await responseDefault.json();
console.log('Default:', dataDefault);
```

**Expected Results:**
- [ ] `30d` returns 30 days of data
- [ ] `1w` returns 7 days of data
- [ ] Default returns 7 days of data

### Test 3.1.2: Admin Analytics Endpoint

**Objective:** Verify admin analytics endpoint returns platform-wide data.

**Prerequisites:**
- User must have `is_admin = true` in profiles table

**Steps:**
1. Set user as admin:

```sql
UPDATE profiles 
SET is_admin = true 
WHERE id = 'YOUR_USER_ID';
```

2. Call the API:

```javascript
const response = await fetch('/api/analytics/affirmations/admin?range=30d');
const data = await response.json();
console.log(data);
```

**Expected Results:**
- [ ] Response status: 200
- [ ] Response structure:
  ```json
  {
    "success": true,
    "range_days": 30,
    "analytics": {
      "enabled_users_pct": 75.5,
      "total_shown": 1250,
      "total_suppressed": 320,
      "category_mix": [
        { "category": "sales_momentum", "count": 450, "percentage": 36.0 },
        { "category": "focus", "count": 300, "percentage": 24.0 },
        ...
      ],
      "suppression_reasons": [
        { "reason": "cooldown_active", "count": 200, "percentage": 62.5 },
        { "reason": "daily_limit_reached", "count": 100, "percentage": 31.25 },
        ...
      ],
      "action_click_rate_with_affirmation": 45.5,
      "action_click_rate_without_affirmation": 38.2,
      "engagement_uplift": 7.3
    }
  }
  ```

**Verify each field:**
- [ ] `enabled_users_pct` is between 0-100
- [ ] `total_shown` matches sum of all `affirmation_shown` events
- [ ] `total_suppressed` matches sum of all `affirmation_suppressed` events
- [ ] `category_mix` percentages sum to ~100%
- [ ] `suppression_reasons` percentages sum to ~100%
- [ ] `action_click_rate_with_affirmation` is between 0-100 (or null)
- [ ] `action_click_rate_without_affirmation` is between 0-100 (or null)
- [ ] `engagement_uplift` = with_rate - without_rate (or null)

**Test unauthorized access:**

```javascript
// Set user as non-admin
// UPDATE profiles SET is_admin = false WHERE id = 'YOUR_USER_ID';

const response = await fetch('/api/analytics/affirmations/admin');
const data = await response.json();
// Should return 403 Forbidden
```

**Expected Results:**
- [ ] Non-admin users get 403 Forbidden
- [ ] Error message: "Forbidden"

### Test 3.1.3: Suppression Event Logging

**Objective:** Verify all suppression reasons are logged correctly.

**Test each suppression reason:**

1. **disabled_by_user:**
   ```sql
   UPDATE profiles SET affirmation_frequency = NULL WHERE id = 'YOUR_USER_ID';
   ```
   - Trigger popup
   - Check for `affirmation_suppressed` event with `reason: 'disabled_by_user'`

2. **cooldown_active:**
   - Set cooldown to 60 minutes
   - Show an affirmation
   - Immediately trigger another popup
   - Check for `affirmation_suppressed` event with `reason: 'cooldown_active'` and `minutes_remaining`

3. **daily_limit_reached:**
   - Set daily cap to 1
   - Show 1 affirmation
   - Trigger another popup
   - Check for `affirmation_suppressed` event with `reason: 'daily_limit_reached'`, `count_today`, `daily_cap`

4. **category_disabled:**
   - Disable ALL categories
   - Trigger popup
   - Check for `affirmation_suppressed` event with `reason: 'category_disabled'`

5. **no_candidates_available:**
   - Disable all affirmations in a category (set `enabled = false`)
   - Enable only that category
   - Trigger popup
   - Check for `affirmation_suppressed` event with `reason: 'no_candidates_available'`

**Database Verification:**

```sql
-- Check all suppression events
SELECT 
  event_type,
  (event_data->>'reason') as reason,
  event_data,
  created_at
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'affirmation_suppressed'
ORDER BY created_at DESC;
```

**Expected Results:**
- [ ] Each suppression reason has at least one event
- [ ] `event_data` contains appropriate fields for each reason:
  - `cooldown_active`: `minutes_remaining`
  - `daily_limit_reached`: `count_today`, `daily_cap`
  - All: `context_type`, `popup_id` (if applicable)

### Test 3.1.4: Action Click Tracking

**Objective:** Verify `affirmation_action_clicked` events are logged when users click popup actions.

**Steps:**
1. Trigger a popup with an affirmation
2. Click an action button (e.g., "Follow up now", "Snooze", "Mark done")
3. Check for `affirmation_action_clicked` event

**Expected Results:**
- [ ] `affirmation_action_clicked` event is logged
- [ ] Event contains:
  - `popup_id`
  - `action` (FOLLOW_UP_NOW, SNOOZE, MARK_DONE)
  - `had_affirmation: true`

**Database Verification:**

```sql
-- Check action clicked events
SELECT 
  event_type,
  (event_data->>'popup_id') as popup_id,
  (event_data->>'action') as action,
  (event_data->>'had_affirmation') as had_affirmation,
  created_at
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'affirmation_action_clicked'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Results:**
- [ ] Events exist for popups with affirmations
- [ ] `had_affirmation` is `true`
- [ ] `action` field matches the button clicked

**Test popup without affirmation:**
1. Disable affirmations temporarily
2. Trigger popup (no affirmation)
3. Click action button
4. Verify NO `affirmation_action_clicked` event (only `popup_action_clicked`)

**Expected Results:**
- [ ] No `affirmation_action_clicked` event for popups without affirmations

---

## Integration Testing

### Test INT.1: Popup Engine Integration

**Objective:** Verify affirmations are automatically attached to popups.

**Steps:**
1. Ensure affirmations are enabled
2. Create various popup-triggering events:
   - Reminder due
   - Reminder completed
   - Reminder missed
   - Email opened (if applicable)
3. For each popup, verify:
   - Popup appears
   - Affirmation is automatically included (if eligible)
   - Affirmation text is displayed in UI
   - `affirmation_shown` event is logged

**Expected Results:**
- [ ] All popups that should have affirmations do have them
- [ ] Affirmations appear automatically (no manual intervention)
- [ ] UI displays affirmations correctly

### Test INT.2: Event System Integration

**Objective:** Verify all affirmation events are properly logged in the events table.

**Steps:**
1. Perform various affirmation actions:
   - Show affirmations (5 times)
   - Suppress affirmations (3 times, different reasons)
   - Click actions on popups with affirmations (2 times)
2. Query events table:

```sql
SELECT 
  event_type,
  COUNT(*) as count,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type IN (
    'affirmation_shown',
    'affirmation_suppressed',
    'affirmation_action_clicked'
  )
GROUP BY event_type
ORDER BY event_type;
```

**Expected Results:**
- [ ] `affirmation_shown`: 5 events
- [ ] `affirmation_suppressed`: 3 events
- [ ] `affirmation_action_clicked`: 2 events
- [ ] All events have proper `event_data` structure

---

## Edge Cases & Error Handling

### Test EC.1: No Affirmations Available

**Steps:**
1. Disable all affirmations in database:

```sql
UPDATE affirmations SET enabled = false;
```

2. Enable all categories in user preferences
3. Trigger popup
4. Verify graceful handling (no error, no affirmation shown)

**Expected Results:**
- [ ] No error thrown
- [ ] Popup appears without affirmation
- [ ] `affirmation_suppressed` event with `reason: 'no_candidates_available'`

### Test EC.2: All Categories Disabled

**Steps:**
1. Disable all categories in user preferences
2. Trigger popup
3. Verify graceful handling

**Expected Results:**
- [ ] No error thrown
- [ ] Popup appears without affirmation
- [ ] `affirmation_suppressed` event with `reason: 'category_disabled'`

### Test EC.3: Invalid Cooldown/Daily Cap Values

**Steps:**
1. Try to set cooldown to -1 (should be prevented by UI validation)
2. Try to set daily cap to 0 (should be prevented)
3. Try to set daily cap to 101 (should be prevented, max is 100)

**Expected Results:**
- [ ] UI validation prevents invalid values
- [ ] Error messages shown for invalid inputs

### Test EC.4: Concurrent Popup Triggers

**Steps:**
1. Trigger multiple popups simultaneously (e.g., 5 reminders due at once)
2. Verify:
   - All popups are created
   - Affirmations are handled correctly (cooldown applies)
   - No race conditions

**Expected Results:**
- [ ] All popups created successfully
- [ ] Cooldown logic works correctly
- [ ] No duplicate affirmations shown simultaneously

### Test EC.5: Missing User Preferences

**Steps:**
1. Delete user preferences:

```sql
DELETE FROM user_affirmation_preferences WHERE user_id = 'YOUR_USER_ID';
```

2. Trigger popup
3. Verify default preferences are created automatically

**Expected Results:**
- [ ] Default preferences created automatically
- [ ] All categories enabled by default
- [ ] Cooldown: 30 minutes, Daily cap: 10

---

## Database Verification

### Test DB.1: Data Integrity

**Verify foreign key constraints:**

```sql
-- Check for orphaned records
SELECT COUNT(*) as orphaned_usage
FROM affirmation_usage au
LEFT JOIN affirmations a ON au.affirmation_id = a.id
WHERE a.id IS NULL;

SELECT COUNT(*) as orphaned_preferences
FROM user_affirmation_preferences uap
LEFT JOIN profiles p ON uap.user_id = p.id
WHERE p.id IS NULL;
```

**Expected Results:**
- [ ] No orphaned records (both queries return 0)

**Verify data consistency:**

```sql
-- Check affirmation_usage matches events
SELECT 
  (SELECT COUNT(*) FROM affirmation_usage WHERE user_id = 'YOUR_USER_ID') as usage_count,
  (SELECT COUNT(*) FROM events WHERE user_id = 'YOUR_USER_ID' AND event_type = 'affirmation_shown') as event_count;
```

**Expected Results:**
- [ ] `usage_count` matches `event_count` (or is close, accounting for timing)

### Test DB.2: Index Performance

**Verify indexes exist:**

```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'events'
  AND indexname LIKE '%affirmation%';
```

**Expected Results:**
- [ ] Indexes exist for `user_id`, `event_type`, `created_at` combinations

**Test query performance:**

```sql
-- This should use indexes
EXPLAIN ANALYZE
SELECT *
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'affirmation_shown'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**Expected Results:**
- [ ] Query uses indexes (check "Index Scan" or "Bitmap Index Scan" in EXPLAIN output)
- [ ] Query completes quickly (< 100ms for typical data)

---

## Performance Testing

### Test PERF.1: Analytics Query Performance

**Steps:**
1. Generate large dataset (1000+ affirmation events)
2. Run analytics queries:

```javascript
console.time('user-analytics');
const response = await fetch('/api/analytics/affirmations/user?range=30d');
await response.json();
console.timeEnd('user-analytics');
```

**Expected Results:**
- [ ] User analytics completes in < 500ms
- [ ] Admin analytics completes in < 2000ms (for platform-wide data)

### Test PERF.2: Affirmation Selection Performance

**Steps:**
1. Trigger 100 popups in quick succession
2. Measure time for each affirmation selection
3. Verify no performance degradation

**Expected Results:**
- [ ] Each affirmation selection completes in < 100ms
- [ ] No timeouts or errors

---

## Final Checklist

### Milestone 3: Affirmation Engine

- [ ] Database schema verified (tables, columns, relationships)
- [ ] User preferences UI works correctly
- [ ] Affirmations are selected and shown in popups
- [ ] Global cooldown prevents too-frequent showing
- [ ] Daily cap limits affirmations per day
- [ ] Category disabling works correctly
- [ ] Context-aware category selection works
- [ ] No-repetition logic prevents immediate duplicates
- [ ] Affirmations disabled when user has them disabled
- [ ] All suppression reasons are logged correctly

### Milestone 3.1: Analytics & Reporting

- [ ] User analytics endpoint returns correct data
- [ ] Admin analytics endpoint returns correct data
- [ ] Suppression events are logged with correct reasons
- [ ] Action click tracking works for popups with affirmations
- [ ] Analytics queries perform well (< 500ms for user, < 2000ms for admin)
- [ ] Range parameters work correctly (7d, 30d, 1w, etc.)

### Integration & Edge Cases

- [ ] Popup engine integration works automatically
- [ ] Event system integration logs all events correctly
- [ ] Edge cases handled gracefully (no errors)
- [ ] Data integrity maintained (no orphaned records)
- [ ] Database indexes improve query performance

### Documentation

- [ ] All test cases documented
- [ ] Expected results verified
- [ ] Any issues found are logged

---

## Troubleshooting

### Issue: Affirmations not showing

**Check:**
1. User profile has `affirmation_frequency` set
2. At least one category is enabled
3. Cooldown has expired
4. Daily cap not reached
5. Affirmations exist and are enabled in database

### Issue: Analytics endpoint returns wrong data

**Check:**
1. Events are being logged correctly
2. Date ranges are calculated correctly
3. Aggregations are correct (COUNT, GROUP BY)
4. User ID matches in all queries

### Issue: Suppression events not logged

**Check:**
1. `logSuppression` function exists and is called
2. Event type `affirmation_suppressed` exists in enum
3. Event data structure is correct

---

## Notes

- **Testing Time:** Allow 2-3 hours for comprehensive testing
- **Test Data:** Use a dedicated test user account
- **Cleanup:** After testing, consider cleaning up test data:

```sql
-- Clean up test data (optional)
DELETE FROM affirmation_usage WHERE user_id = 'YOUR_USER_ID';
DELETE FROM events WHERE user_id = 'YOUR_USER_ID' AND event_type LIKE 'affirmation%';
DELETE FROM user_affirmation_preferences WHERE user_id = 'YOUR_USER_ID';
```

---

**End of Testing Guide**

