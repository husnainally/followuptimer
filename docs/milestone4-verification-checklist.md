# Milestone 4 Verification Checklist
## Smart Snooze System (Preferences + Predictive Snooze Engine)

**Version:** 1.0  
**Last Updated:** 2025-01-18  
**Scope:** Phase 2 - Milestone 4

---

## Table of Contents

1. [Database Schema Verification](#database-schema-verification)
2. [User Preferences](#user-preferences)
3. [Snooze Engine Logic](#snooze-engine-logic)
4. [Rules Validation](#rules-validation)
5. [UI Components](#ui-components)
6. [API Endpoints](#api-endpoints)
7. [Event Logging](#event-logging)
8. [Integration Testing](#integration-testing)
9. [Edge Cases](#edge-cases)

---

## Database Schema Verification

### Test DB.1: User Snooze Preferences Table

**Objective:** Verify `user_snooze_preferences` table exists with all required columns.

**Steps:**
1. Run migration: `20250101000004_phase2_milestone4_snooze_preferences.sql`
2. Verify table structure:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_snooze_preferences'
ORDER BY ordinal_position;
```

**Expected Results:**
- [ ] Table exists
- [ ] Columns: `user_id` (PK), `working_hours_start`, `working_hours_end`, `working_days`, `quiet_hours_start`, `quiet_hours_end`, `max_reminders_per_day`, `allow_weekends`, `default_snooze_options`, `follow_up_cadence`, `created_at`, `updated_at`
- [ ] `working_days` is integer array
- [ ] `default_snooze_options` is JSONB
- [ ] `follow_up_cadence` is enum type

### Test DB.2: Event Types

**Objective:** Verify new event types are added to enum.

**Steps:**
1. Run migration: `20250101000005_phase2_milestone4_snooze_events.sql`
2. Verify event types:

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_type')
  AND enumlabel IN ('snooze_suggested', 'snooze_selected', 'reminder_deferred_by_rule');
```

**Expected Results:**
- [ ] All 3 event types exist in enum

### Test DB.3: RLS Policies

**Objective:** Verify Row Level Security policies are correct.

**Steps:**
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_snooze_preferences';
```

**Expected Results:**
- [ ] Policies exist for SELECT, INSERT, UPDATE
- [ ] All policies use `auth.uid() = user_id`

---

## User Preferences

### Test PREF.1: Default Preferences Creation

**Objective:** Verify default preferences are created automatically.

**Steps:**
1. Create a new user (or delete existing preferences)
2. Call `getUserSnoozePreferences(userId)`
3. Check database:

```sql
SELECT * FROM user_snooze_preferences WHERE user_id = 'YOUR_USER_ID';
```

**Expected Results:**
- [ ] Row created automatically
- [ ] `working_hours_start` = "09:00:00"
- [ ] `working_hours_end` = "17:30:00"
- [ ] `working_days` = [1,2,3,4,5] (Mon-Fri)
- [ ] `max_reminders_per_day` = 10
- [ ] `allow_weekends` = false
- [ ] `follow_up_cadence` = "balanced"
- [ ] All default snooze options enabled

### Test PREF.2: Settings UI - Working Hours

**Objective:** Verify working hours can be set and saved.

**Steps:**
1. Navigate to Settings → Snooze
2. Change working hours start to "08:00"
3. Change working hours end to "18:00"
4. Click "Save Preferences"
5. Refresh page
6. Verify settings persisted

**Expected Results:**
- [ ] UI loads without errors
- [ ] Time inputs work correctly
- [ ] Save button works
- [ ] Success toast appears
- [ ] Settings persist after refresh

### Test PREF.3: Settings UI - Working Days

**Objective:** Verify working days can be selected.

**Steps:**
1. Navigate to Settings → Snooze
2. Uncheck "Monday" and "Friday"
3. Check "Saturday"
4. Save preferences
5. Verify in database:

```sql
SELECT working_days FROM user_snooze_preferences WHERE user_id = 'YOUR_USER_ID';
```

**Expected Results:**
- [ ] Checkboxes work correctly
- [ ] `working_days` = [2,3,4,6] (Tue, Wed, Thu, Sat)
- [ ] At least one day selected (validation)

### Test PREF.4: Settings UI - Quiet Hours

**Objective:** Verify quiet hours can be set (optional).

**Steps:**
1. Navigate to Settings → Snooze
2. Set quiet hours: 22:00 - 08:00
3. Save preferences
4. Verify in database

**Expected Results:**
- [ ] Quiet hours can be set
- [ ] Can be cleared (set to null)
- [ ] Settings persist

### Test PREF.5: Settings UI - Weekend Behavior

**Objective:** Verify weekend behavior toggle works.

**Steps:**
1. Navigate to Settings → Snooze
2. Toggle "Allow weekends" ON
3. Save preferences
4. Verify `allow_weekends` = true
5. Toggle OFF
6. Verify `allow_weekends` = false

**Expected Results:**
- [ ] Toggle works correctly
- [ ] Settings persist

### Test PREF.6: Settings UI - Follow-up Cadence

**Objective:** Verify follow-up cadence selection works.

**Steps:**
1. Navigate to Settings → Snooze
2. Select "Fast" cadence
3. Save preferences
4. Verify `follow_up_cadence` = "fast"
5. Change to "Light-touch"
6. Verify `follow_up_cadence` = "light_touch"

**Expected Results:**
- [ ] Radio buttons work correctly
- [ ] Settings persist

---

## Snooze Engine Logic

### Test ENG.1: Candidate Generation

**Objective:** Verify all candidate types are generated correctly.

**Steps:**
1. Enable all default snooze options
2. Call API: `GET /api/snooze/suggestions?reminder_id=xxx`
3. Verify response structure

**Expected Results:**
- [ ] Response contains `candidates` array
- [ ] At least 3-5 candidates returned
- [ ] Each candidate has: `type`, `scheduledTime`, `label`, `score`, `adjusted`
- [ ] One candidate has `recommended: true`
- [ ] "Pick a time" option included if enabled

### Test ENG.2: Later Today Candidate

**Objective:** Verify "later today" candidate is generated correctly.

**Steps:**
1. Set current time context (e.g., 10:00 AM on Monday)
2. Call suggestions API
3. Find candidate with `type: "later_today"`

**Expected Results:**
- [ ] Candidate exists
- [ ] `scheduledTime` is ~2 hours from now
- [ ] Adjusted to working hours if needed
- [ ] Label format: "Today at HH:MMam/pm"

### Test ENG.3: Tomorrow Morning Candidate

**Objective:** Verify "tomorrow morning" candidate.

**Steps:**
1. Call suggestions API
2. Find candidate with `type: "tomorrow_morning"`

**Expected Results:**
- [ ] Candidate exists
- [ ] `scheduledTime` is next working day at working hours start + 15 min
- [ ] Label format: "Tomorrow at HH:MMam/pm"

### Test ENG.4: Next Working Day Candidate

**Objective:** Verify "next working day" candidate.

**Steps:**
1. Call suggestions API
2. Find candidate with `type: "next_working_day"`

**Expected Results:**
- [ ] Candidate exists
- [ ] `scheduledTime` is next working day at working hours start
- [ ] Skips weekends if not allowed
- [ ] Label format: "Next working day at HH:MMam/pm"

### Test ENG.5: Scoring Algorithm

**Objective:** Verify candidates are scored correctly.

**Steps:**
1. Call suggestions API
2. Check scores for each candidate
3. Verify highest score is marked as recommended

**Expected Results:**
- [ ] All candidates have scores (0-100)
- [ ] Highest score candidate has `recommended: true`
- [ ] Scores reflect:
  - [ ] Working hours compliance (+30)
  - [ ] Quiet hours avoidance (+20)
  - [ ] Weekend compliance (+15)
  - [ ] Historical pattern matching (+25)
  - [ ] Daily cap compliance (+10)

### Test ENG.6: Historical Pattern Matching

**Objective:** Verify scoring uses historical snooze patterns.

**Steps:**
1. Create 5 snoozes with ~60 minute duration
2. Call suggestions API
3. Verify candidates close to 60 minutes have higher scores

**Expected Results:**
- [ ] Candidates with durations matching history score higher
- [ ] Time-of-day patterns considered
- [ ] Day-of-week patterns considered

---

## Rules Validation

### Test RULES.1: Working Hours Enforcement

**Objective:** Verify reminders are adjusted to working hours.

**Steps:**
1. Set working hours: 09:00 - 17:30
2. Try to snooze to 08:00 (before working hours)
3. Verify reminder is adjusted to 09:00

**Expected Results:**
- [ ] Reminder `remind_at` = 09:00 (or working hours start)
- [ ] `reminder_deferred_by_rule` event logged with `reason: "working_hours"`
- [ ] `was_adjusted: true` in `snooze_selected` event

### Test RULES.2: Quiet Hours Enforcement

**Objective:** Verify reminders are adjusted to avoid quiet hours.

**Steps:**
1. Set quiet hours: 22:00 - 08:00
2. Try to snooze to 23:00 (in quiet hours)
3. Verify reminder is adjusted

**Expected Results:**
- [ ] Reminder moved outside quiet hours
- [ ] `reminder_deferred_by_rule` event logged with `reason: "quiet_hours"`

### Test RULES.3: Weekend Deferral

**Objective:** Verify weekend reminders are deferred when not allowed.

**Steps:**
1. Set `allow_weekends: false`
2. Try to snooze to Saturday
3. Verify reminder is deferred to Monday

**Expected Results:**
- [ ] Reminder moved to next working day (Monday)
- [ ] `reminder_deferred_by_rule` event logged with `reason: "weekend"`
- [ ] Time set to working hours start

### Test RULES.4: Daily Cap Enforcement

**Objective:** Verify daily cap prevents too many reminders.

**Steps:**
1. Set `max_reminders_per_day: 2`
2. Create 2 reminders for today
3. Try to snooze another reminder
4. Verify reminder is deferred to next day

**Expected Results:**
- [ ] Reminder moved to next day
- [ ] `reminder_deferred_by_rule` event logged with `reason: "daily_cap"`
- [ ] Count includes only pending reminders for today

### Test RULES.5: Multiple Rule Violations

**Objective:** Verify system handles multiple violations correctly.

**Steps:**
1. Set working hours: 09:00 - 17:30, no weekends
2. Try to snooze to Saturday 23:00
3. Verify reminder adjusted correctly

**Expected Results:**
- [ ] Reminder moved to next working day at working hours start
- [ ] Only one `reminder_deferred_by_rule` event (with primary reason)

---

## UI Components

### Test UI.1: Snooze Suggestions Display

**Objective:** Verify suggestions are displayed correctly in popup.

**Steps:**
1. Trigger a popup with reminder_id
2. Verify snooze suggestions appear
3. Check UI elements

**Expected Results:**
- [ ] 3-5 snooze buttons displayed
- [ ] One button marked "Recommended" with badge
- [ ] Labels are human-readable (e.g., "Tomorrow at 9:15am")
- [ ] Buttons are clickable

### Test UI.2: Recommended Badge

**Objective:** Verify recommended suggestion is visually distinct.

**Steps:**
1. View popup with snooze suggestions
2. Identify recommended button

**Expected Results:**
- [ ] Recommended button has different styling (default variant vs outline)
- [ ] Badge with "Recommended" text visible
- [ ] Sparkles icon in badge

### Test UI.3: Pick a Time Picker

**Objective:** Verify date/time picker opens and works.

**Steps:**
1. Click "Pick a time" button
2. Select a date
3. Select a time
4. Click "Set Reminder"

**Expected Results:**
- [ ] Date picker opens inline
- [ ] Time input works
- [ ] Can select future date/time
- [ ] Validation prevents past dates
- [ ] Reminder scheduled with selected time

### Test UI.4: Settings UI Layout

**Objective:** Verify settings page is well-organized.

**Steps:**
1. Navigate to Settings → Snooze
2. Review layout

**Expected Results:**
- [ ] All sections visible and organized
- [ ] Form validation works
- [ ] Save button visible
- [ ] Success feedback works

---

## API Endpoints

### Test API.1: GET /api/snooze/suggestions

**Objective:** Verify suggestions endpoint returns correct data.

**Steps:**
```javascript
const response = await fetch('/api/snooze/suggestions?reminder_id=xxx&event_type=reminder_due');
const data = await response.json();
console.log(data);
```

**Expected Results:**
- [ ] Response status: 200
- [ ] Response structure:
  ```json
  {
    "candidates": [
      {
        "type": "tomorrow_morning",
        "scheduledTime": "2025-01-19T09:15:00Z",
        "label": "Tomorrow at 9:15am",
        "score": 85,
        "recommended": true,
        "adjusted": false
      },
      ...
    ],
    "context": {
      "eventType": "reminder_due",
      "engagementSignal": "reminder_due"
    }
  }
  ```

### Test API.2: GET /api/snooze/preferences

**Objective:** Verify preferences endpoint returns user preferences.

**Steps:**
```javascript
const response = await fetch('/api/snooze/preferences');
const data = await response.json();
```

**Expected Results:**
- [ ] Response status: 200
- [ ] Response contains `preferences` object
- [ ] All preference fields present

### Test API.3: POST /api/snooze/preferences

**Objective:** Verify preferences can be updated.

**Steps:**
```javascript
const response = await fetch('/api/snooze/preferences', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    working_hours_start: '08:00:00',
    working_hours_end: '18:00:00',
    working_days: [1,2,3,4,5],
    max_reminders_per_day: 15,
  })
});
```

**Expected Results:**
- [ ] Response status: 200
- [ ] Preferences updated in database
- [ ] Response contains updated preferences

### Test API.4: POST /api/reminders/[id]/snooze (Enhanced)

**Objective:** Verify enhanced snooze endpoint validates and adjusts.

**Steps:**
1. Set working hours: 09:00 - 17:30
2. Snooze reminder to 08:00:

```javascript
const response = await fetch('/api/reminders/xxx/snooze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scheduled_time: '2025-01-19T08:00:00Z',
    candidate_type: 'later_today',
    was_recommended: false
  })
});
```

**Expected Results:**
- [ ] Reminder `remind_at` adjusted to 09:00
- [ ] `reminder_deferred_by_rule` event logged
- [ ] `snooze_selected` event logged with `was_adjusted: true`

---

## Event Logging

### Test EVT.1: Snooze Suggested Event

**Objective:** Verify `snooze_suggested` events are logged.

**Steps:**
1. Call suggestions API
2. Check events table:

```sql
SELECT event_type, event_data, created_at
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'snooze_suggested'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] Event exists
- [ ] `event_data` contains:
  - [ ] `reminder_id`
  - [ ] `candidates` array
  - [ ] `recommended_type`
  - [ ] `context_type`

### Test EVT.2: Snooze Selected Event

**Objective:** Verify `snooze_selected` events are logged.

**Steps:**
1. Select a snooze suggestion
2. Check events table:

```sql
SELECT event_type, event_data
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'snooze_selected'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] Event exists
- [ ] `event_data` contains:
  - [ ] `reminder_id`
  - [ ] `selected_type`
  - [ ] `scheduled_time`
  - [ ] `was_recommended` (boolean)
  - [ ] `was_adjusted` (boolean)

### Test EVT.3: Reminder Deferred by Rule Event

**Objective:** Verify `reminder_deferred_by_rule` events are logged when adjusted.

**Steps:**
1. Snooze reminder outside working hours
2. Check events table:

```sql
SELECT event_type, event_data
FROM events
WHERE user_id = 'YOUR_USER_ID'
  AND event_type = 'reminder_deferred_by_rule'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- [ ] Event exists
- [ ] `event_data` contains:
  - [ ] `reminder_id`
  - [ ] `original_time`
  - [ ] `adjusted_time`
  - [ ] `reason` (working_hours, quiet_hours, weekend, or daily_cap)

---

## Integration Testing

### Test INT.1: End-to-End Snooze Flow

**Objective:** Verify complete snooze flow works.

**Steps:**
1. Create a reminder
2. Trigger popup
3. View snooze suggestions
4. Select recommended suggestion
5. Verify reminder scheduled correctly

**Expected Results:**
- [ ] Popup shows suggestions
- [ ] Recommended option visible
- [ ] Selection schedules reminder
- [ ] Reminder time respects preferences
- [ ] All events logged correctly

### Test INT.2: Pick a Time Flow

**Objective:** Verify manual time selection works.

**Steps:**
1. Trigger popup
2. Click "Pick a time"
3. Select date and time
4. Submit

**Expected Results:**
- [ ] Date/time picker opens
- [ ] Can select future time
- [ ] Reminder scheduled with selected time
- [ ] Time validated against preferences

### Test INT.3: Multiple Popups

**Objective:** Verify suggestions work for multiple popups.

**Steps:**
1. Trigger 3 popups in quick succession
2. Verify each has correct suggestions
3. Select different suggestions for each

**Expected Results:**
- [ ] Each popup gets its own suggestions
- [ ] Suggestions are context-aware
- [ ] No conflicts between popups

---

## Edge Cases

### Test EC.1: All Snooze Options Disabled

**Objective:** Verify graceful handling when all options disabled.

**Steps:**
1. Disable all default snooze options
2. Trigger popup
3. Verify behavior

**Expected Results:**
- [ ] No error thrown
- [ ] Fallback to basic snooze options or message
- [ ] "Pick a time" still available

### Test EC.2: Invalid Time Selection

**Objective:** Verify validation prevents invalid times.

**Steps:**
1. Open date/time picker
2. Try to select past date
3. Try to select time outside working hours

**Expected Results:**
- [ ] Past dates disabled/validated
- [ ] Warning shown for invalid times
- [ ] Cannot submit invalid selection

### Test EC.3: Timezone Edge Cases

**Objective:** Verify timezone handling works correctly.

**Steps:**
1. Set user timezone to "America/New_York"
2. Set working hours: 09:00 - 17:30
3. Generate suggestions
4. Verify times are in user's timezone

**Expected Results:**
- [ ] All times calculated in user timezone
- [ ] Daily cap uses user's local day
- [ ] Working hours respected in user timezone

### Test EC.4: Concurrent Snooze Requests

**Objective:** Verify no race conditions with concurrent requests.

**Steps:**
1. Trigger 2 snooze actions simultaneously
2. Verify both complete successfully

**Expected Results:**
- [ ] Both reminders scheduled correctly
- [ ] No duplicate events
- [ ] Daily cap enforced correctly

---

## Final Checklist

### Database
- [ ] `user_snooze_preferences` table created
- [ ] `follow_up_cadence` enum created
- [ ] Event types added to enum
- [ ] RLS policies configured
- [ ] Indexes created

### Backend Logic
- [ ] `snooze-rules.ts` functions work correctly
- [ ] `smart-snooze-engine.ts` generates candidates
- [ ] Scoring algorithm works
- [ ] Rules validation works
- [ ] Daily cap enforcement works

### API Endpoints
- [ ] GET /api/snooze/suggestions returns candidates
- [ ] GET /api/snooze/preferences returns preferences
- [ ] POST /api/snooze/preferences updates preferences
- [ ] POST /api/reminders/[id]/snooze validates and adjusts

### UI Components
- [ ] Snooze suggestions display in popup
- [ ] Recommended badge visible
- [ ] Date/time picker works
- [ ] Settings UI complete and functional

### Event Logging
- [ ] `snooze_suggested` events logged
- [ ] `snooze_selected` events logged
- [ ] `reminder_deferred_by_rule` events logged

### Integration
- [ ] End-to-end flow works
- [ ] Popup system integrates correctly
- [ ] Reminder scheduling works

---

**End of Verification Checklist**

