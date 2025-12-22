# Milestone 8: Follow-Up Functionality Testing Guide

## Overview

The follow-up functionality allows users to automatically create follow-up reminders after completing a reminder. This guide explains how to test all aspects of this feature.

## Prerequisites

1. **Enable Auto-Create Follow-Up Setting**
   - Go to Settings → Behaviour
   - Enable "Auto-Create Follow-up Prompt" toggle
   - Save settings

2. **Create a Reminder with Contact**
   - The follow-up prompt only appears for reminders that have a `contact_id`
   - Create a reminder linked to a contact (or create a contact first)

## Testing Scenarios

### Scenario 1: Basic Follow-Up Prompt Flow

**Steps:**
1. Enable "Auto-Create Follow-up Prompt" in Settings → Behaviour
2. Set "Default Follow-up Interval" to 3 days (or your preferred interval)
3. Create a reminder linked to a contact:
   - Go to Contacts → Create/Select a contact
   - Create a reminder for that contact
   - Set reminder time to a few minutes from now (for quick testing)
4. Wait for reminder to fire (or manually trigger it)
5. Complete the reminder:
   - When popup appears, click "Mark Done" / "Complete"
   - OR go to reminder detail page and mark as complete
6. **Expected Result:**
   - A new popup should appear with title "Create Next Follow-up?"
   - Message should show suggested date (current date + default interval)
   - Popup should have action buttons

### Scenario 2: Follow-Up Creation via API

**Manual API Test:**

```bash
# 1. Get your reminder ID (from database or UI)
REMINDER_ID="your-reminder-id"

# 2. Create follow-up reminder
curl -X POST http://localhost:3000/api/reminders/create-followup \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "original_reminder_id": "'$REMINDER_ID'",
    "suggested_date": "2025-01-15T10:00:00Z",
    "message": "Follow up on previous conversation"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "reminder": {
    "id": "...",
    "message": "Follow up on previous conversation",
    "remind_at": "2025-01-15T10:00:00Z",
    "status": "pending",
    "contact_id": "..."
  }
}
```

### Scenario 3: Default Follow-Up Interval

**Steps:**
1. Go to Settings → Behaviour
2. Set "Default Follow-up Interval" to different values:
   - Test with 1 day
   - Test with 7 days
   - Test with 30 days
3. Complete a reminder with a contact
4. Check the suggested date in the follow-up prompt
5. **Expected Result:**
   - Suggested date should be: completion date + your interval setting
   - Date should respect working hours, quiet hours, and weekends (if configured)

### Scenario 4: Follow-Up Without Contact

**Steps:**
1. Create a reminder WITHOUT linking it to a contact
2. Complete the reminder
3. **Expected Result:**
   - NO follow-up prompt should appear
   - This is by design - follow-ups require a contact

### Scenario 5: Auto-Create Follow-Up Disabled

**Steps:**
1. Go to Settings → Behaviour
2. Disable "Auto-Create Follow-up Prompt"
3. Complete a reminder with a contact
4. **Expected Result:**
   - NO follow-up prompt should appear
   - Reminder completes normally

### Scenario 6: Working Hours & Quiet Hours Respect

**Steps:**
1. Set working hours (e.g., 9 AM - 5 PM) in Settings → Snooze
2. Set quiet hours (e.g., 10 PM - 7 AM) in Settings → Snooze
3. Set default follow-up interval to 1 day
4. Complete a reminder at 6 PM
5. **Expected Result:**
   - Suggested follow-up date should be next working day at start of working hours
   - Should NOT suggest times during quiet hours or weekends (if disabled)

## Testing via UI

### Method 1: Through Popup System

1. **Enable the feature:**
   ```
   Settings → Behaviour → Auto-Create Follow-up Prompt: ON
   ```

2. **Create test reminder:**
   - Create a contact (if needed)
   - Create reminder: "Test follow-up reminder"
   - Link to contact
   - Set time to 1 minute from now

3. **Complete reminder:**
   - Wait for popup or navigate to reminder
   - Click "Mark Done" / "Complete"

4. **Check for follow-up prompt:**
   - New popup should appear asking to create follow-up
   - Suggested date should be visible
   - You can accept, modify, or dismiss

### Method 2: Direct API Call (Developer Testing)

Use the browser console or Postman:

```javascript
// In browser console (on settings page)
const response = await fetch('/api/reminders/create-followup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    original_reminder_id: 'YOUR_REMINDER_ID',
    suggested_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // +3 days
    message: 'Follow up on previous conversation'
  })
});

const data = await response.json();
console.log(data);
```

## Verification Checklist

- [ ] Follow-up prompt appears after completing reminder with contact
- [ ] Follow-up prompt does NOT appear for reminders without contact
- [ ] Follow-up prompt does NOT appear when auto-create is disabled
- [ ] Suggested date uses default follow-up interval setting
- [ ] Suggested date respects working hours
- [ ] Suggested date respects quiet hours
- [ ] Suggested date respects weekend settings
- [ ] Follow-up reminder is created with correct contact_id
- [ ] Follow-up reminder is scheduled correctly
- [ ] Follow-up reminder appears in reminder list
- [ ] Original reminder message is preserved (or custom message works)

## Database Verification

Check the database to verify:

```sql
-- Check if follow-up prompt popup was created
SELECT * FROM popups 
WHERE template_type = 'follow_up_required' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if follow-up reminder was created
SELECT * FROM reminders 
WHERE contact_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;

-- Check events for reminder_completed
SELECT * FROM events 
WHERE event_type = 'reminder_completed' 
ORDER BY created_at DESC 
LIMIT 5;
```

## Troubleshooting

### Follow-up prompt doesn't appear

1. **Check settings:**
   - Verify "Auto-Create Follow-up Prompt" is enabled
   - Check in Settings → Behaviour

2. **Check reminder:**
   - Ensure reminder has a `contact_id`
   - Verify reminder was actually completed (status = 'sent')

3. **Check console:**
   - Open browser DevTools → Console
   - Look for errors when completing reminder

4. **Check database:**
   ```sql
   -- Check user preferences
   SELECT auto_create_followup FROM user_preferences WHERE user_id = 'YOUR_USER_ID';
   
   -- Check reminder
   SELECT id, contact_id, status FROM reminders WHERE id = 'YOUR_REMINDER_ID';
   ```

### Follow-up date is incorrect

1. **Check timezone:**
   - Verify user timezone in profiles table
   - Default follow-up calculation uses user timezone

2. **Check working hours:**
   - Verify working hours settings in user_snooze_preferences
   - Follow-up date should respect these settings

3. **Check default interval:**
   ```sql
   SELECT default_followup_interval_days FROM user_preferences WHERE user_id = 'YOUR_USER_ID';
   ```

## Quick Test Script

For rapid testing, you can use this sequence:

1. **Setup (one time):**
   ```
   Settings → Behaviour:
   - Auto-Create Follow-up: ON
   - Default Follow-up Interval: 3 days
   ```

2. **Test loop:**
   ```
   - Create contact
   - Create reminder (linked to contact, 1 min from now)
   - Wait for reminder / Complete reminder
   - Verify follow-up prompt appears
   - Create follow-up (or dismiss)
   - Repeat with different intervals
   ```

## Testing via Browser Console

You can also test the follow-up creation directly using the browser console:

### Step 1: Get a Reminder ID

```javascript
// In browser console on dashboard or reminders page
// Find a reminder ID from the page or database
const reminderId = "YOUR_REMINDER_ID_HERE";
```

### Step 2: Create Follow-Up via API

```javascript
// Create follow-up reminder
const response = await fetch('/api/reminders/create-followup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    original_reminder_id: reminderId,
    message: 'Follow up on previous conversation',
    // Optional: specify date, otherwise uses default interval
    // suggested_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  })
});

const result = await response.json();
console.log('Follow-up created:', result);
```

### Step 3: Verify in Database

```sql
-- Check the new follow-up reminder
SELECT 
  id,
  message,
  remind_at,
  status,
  contact_id,
  created_at
FROM reminders
WHERE contact_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

## Manual Testing Checklist

Use this checklist to systematically test all follow-up functionality:

### Setup Phase
- [ ] Enable "Auto-Create Follow-up Prompt" in Settings → Behaviour
- [ ] Set "Default Follow-up Interval" to 3 days
- [ ] Create a test contact (e.g., "John Doe")
- [ ] Note your current timezone setting

### Reminder Creation
- [ ] Create a reminder linked to the test contact
- [ ] Set reminder time to 1-2 minutes from now (for quick testing)
- [ ] Verify reminder appears in reminder list
- [ ] Verify reminder has `contact_id` set

### Reminder Completion
- [ ] Wait for reminder to fire (or manually trigger)
- [ ] Complete the reminder via popup or reminder detail page
- [ ] Verify reminder status changes to "sent"

### Follow-Up Prompt
- [ ] Check if follow-up prompt popup appears
- [ ] Verify popup title: "Create Next Follow-up?"
- [ ] Verify suggested date is ~3 days from now
- [ ] Verify suggested date respects working hours
- [ ] Verify suggested date respects quiet hours (if applicable)
- [ ] Verify suggested date respects weekends (if disabled)

### Follow-Up Creation (if implemented)
- [ ] Click "Follow up now" or similar button in popup
- [ ] Verify new reminder is created
- [ ] Verify new reminder has same contact_id
- [ ] Verify new reminder has correct remind_at date
- [ ] Verify new reminder appears in reminder list

### Edge Cases
- [ ] Test with reminder WITHOUT contact (should NOT show prompt)
- [ ] Test with auto-create DISABLED (should NOT show prompt)
- [ ] Test with different default intervals (1 day, 7 days, 30 days)
- [ ] Test with different timezones
- [ ] Test with working hours restrictions
- [ ] Test with quiet hours restrictions
- [ ] Test with weekend restrictions

## API Endpoint Testing

### Create Follow-Up Reminder

**Endpoint:** `POST /api/reminders/create-followup`

**Request Body:**
```json
{
  "original_reminder_id": "uuid-of-completed-reminder",
  "message": "Optional custom message (uses original if not provided)",
  "suggested_date": "2025-01-15T10:00:00Z" // Optional, uses default interval if not provided
}
```

**Success Response (200):**
```json
{
  "success": true,
  "reminder": {
    "id": "new-reminder-uuid",
    "message": "Follow up message",
    "remind_at": "2025-01-15T10:00:00Z",
    "status": "pending",
    "contact_id": "contact-uuid",
    "notification_method": "email",
    "affirmation_enabled": true
  }
}
```

**Error Responses:**
- `400`: Missing required fields
- `401`: Unauthorized
- `404`: Original reminder not found
- `500`: Server error

### Test with cURL

```bash
# Replace with your actual values
REMINDER_ID="your-reminder-id"
AUTH_COOKIE="your-auth-cookie"

curl -X POST http://localhost:3000/api/reminders/create-followup \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{
    "original_reminder_id": "'$REMINDER_ID'",
    "message": "Follow up on our conversation"
  }'
```

## Expected Behavior Summary

| Condition | Follow-Up Prompt? |
|-----------|-------------------|
| Reminder with contact + Auto-create ON | ✅ Yes |
| Reminder with contact + Auto-create OFF | ❌ No |
| Reminder without contact + Auto-create ON | ❌ No |
| Reminder without contact + Auto-create OFF | ❌ No |

## Notes

- Follow-up prompts only appear for reminders that have a `contact_id`
- The prompt is a popup, not an automatic creation (user must confirm)
- Default interval respects all snooze preferences (working hours, quiet hours, weekends)
- Follow-up reminders inherit notification method from original reminder
- Follow-up reminders are scheduled via QStash (if configured)

