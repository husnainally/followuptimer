# Milestone 6: Weekly Digest Engine Testing Guide

## Prerequisites

1. **Run Database Migrations**
   ```bash
   # Apply all milestone 6 migrations
   supabase migration up
   ```
   
   Or manually apply:
   - `20250101000008_milestone6_trust_lite_events.sql`
   - `20250101000009_milestone6_digest_preferences.sql`
   - `20250101000010_milestone6_digest_tracking.sql`
   - `20250101000011_milestone6_in_app_digest_support.sql`

2. **Environment Variables**
   Ensure these are set:
   - `RESEND_API_KEY` (for email sending)
   - `DIGEST_CRON_SECRET` (for cron authentication)
   - `NEXT_PUBLIC_APP_URL` (for email links)

## Testing Checklist

### 1. Database Setup & Verification

**Test: Verify tables exist**
```sql
-- Check user_digest_preferences table
SELECT * FROM user_digest_preferences LIMIT 1;

-- Check weekly_digests table structure
\d weekly_digests

-- Check event types
SELECT unnest(enum_range(NULL::event_type)) as event_type;
-- Should include: reminder_triggered, reminder_overdue
```

**Test: Verify enums**
```sql
-- Check digest enums
SELECT unnest(enum_range(NULL::digest_channel)) as channel;
SELECT unnest(enum_range(NULL::digest_detail_level)) as detail_level;
SELECT unnest(enum_range(NULL::digest_variant)) as variant;
SELECT unnest(enum_range(NULL::digest_status)) as status;
```

### 2. User Preferences UI Testing

**Test: Access Settings Page**
1. Navigate to `/settings`
2. Click on "Digest" tab
3. Verify the form loads without errors

**Test: Enable/Disable Digest**
1. Toggle "Enable Weekly Digest" switch
2. Verify other fields appear/disappear
3. Save settings
4. Refresh page - verify settings persist

**Test: Configure Preferences**
1. Enable digest
2. Set day to "Monday"
3. Set time to "08:00"
4. Select channel: "Email"
5. Select detail level: "Standard"
6. Toggle "Only Send When Active" on/off
7. Save and verify all values persist

**Test: Validation**
1. Try invalid time format (should show error)
2. Try invalid day (should be prevented by UI)
3. Save with invalid data (should show error toast)

### 3. Trust-Lite Event Tracking

**Test: Reminder Triggered Event**
1. Create a reminder scheduled for now (or past)
2. Wait for it to fire (or manually trigger via `/api/reminders/send`)
3. Check events table:
   ```sql
   SELECT * FROM events 
   WHERE event_type = 'reminder_triggered' 
   ORDER BY created_at DESC LIMIT 1;
   ```
4. Verify `event_data` contains:
   - `reminder_id`
   - `intended_fire_time`
   - `actual_fire_time`
   - `notification_method`

**Test: Reminder Overdue Event**
1. Create a reminder with `remind_at` in the past
2. Call `/api/reminders/check-missed` (or wait for cron)
3. Check events:
   ```sql
   SELECT * FROM events 
   WHERE event_type = 'reminder_overdue' 
   ORDER BY created_at DESC LIMIT 1;
   ```
4. Verify it only logs once per reminder (idempotent)

**Test: Suppression Events**
1. Create reminder during quiet hours (if configured)
2. Verify `reminder_suppressed` event is logged
3. Check `event_data` contains:
   - `reason_code` (QUIET_HOURS, WORKDAY_DISABLED, etc.)
   - `intended_fire_time`
   - `evaluated_at`

### 4. Stats Computation Testing

**Test: Overall Stats**
1. Create test data:
   - Create 5 reminders this week
   - Complete 3 reminders
   - Snooze 1 reminder
   - Let 1 go overdue
   - Suppress 1 (via quiet hours)

2. Manually call stats computation:
   ```typescript
   // In browser console or test script
   const stats = await computeDigestStats(userId, weekStart, weekEnd, timezone);
   console.log(stats);
   ```

3. Verify counts match:
   - `total_reminders_created` = 5
   - `reminders_completed` = 3
   - `reminders_snoozed` = 1
   - `reminders_overdue` = 1
   - `reminders_suppressed` = 1
   - `completion_rate` = 60% (3/5)
   - `snooze_rate` = 20% (1/5)

**Test: Per-Contact Stats**
1. Create reminders linked to 3 different contacts
2. Complete reminders for 2 contacts
3. Verify top N contacts appear in stats
4. Verify archived contacts are excluded

**Test: Forward-Looking Stats**
1. Create reminders scheduled for next 7 days
2. Verify `upcoming_reminders_next_7_days` count is correct
3. Create contacts without reminders
4. Verify `contacts_with_no_followup_scheduled` count

### 5. Template Variant Selection

**Test: Standard Variant**
- Create moderate activity (10+ reminders, some completed)
- Verify Standard template is selected

**Test: Light Variant**
- Create ≤3 reminders, none completed
- Verify Light template is selected
- Or set user preference to "light"

**Test: Recovery Variant**
- Create high overdue count (3+)
- OR high snooze rate (50%+)
- OR low completion rate (<30%)
- Verify Recovery template is selected

**Test: No-Activity Variant**
- Create user with zero events in week
- Verify No-Activity template is selected

### 6. Manual Digest Generation

**Test: Force Digest Generation**
```bash
# Using curl
curl -X POST http://localhost:3000/api/digests/generate \
  -H "Authorization: Bearer YOUR_DIGEST_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Test: Check Digest Sent**
```sql
SELECT * FROM weekly_digests 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC LIMIT 1;
```

Verify:
- `dedupe_key` is set correctly
- `digest_variant` matches expected variant
- `status` is "sent"
- `stats_data` contains all stats
- `sent_at` is set

**Test: Idempotency**
1. Run digest generation twice for same user/week
2. Verify only one digest is sent
3. Check `dedupe_key` prevents duplicates

### 7. Email Delivery Testing

**Test: Email Sending**
1. Set user preference to "email" channel
2. Generate digest
3. Check email inbox (or Resend dashboard)
4. Verify:
   - Subject line is correct
   - HTML renders properly
   - Text version is included
   - Links work correctly
   - Stats are accurate

**Test: Email Template Variants**
- Test each variant (Standard, Light, Recovery, No-Activity)
- Verify correct template is used
- Check numbers are formatted correctly (no NaN)

### 8. In-App Notification Testing

**Test: In-App Delivery**
1. Set user preference to "in_app" channel
2. Generate digest
3. Check in-app notifications:
   ```sql
   SELECT * FROM in_app_notifications 
   WHERE user_id = 'YOUR_USER_ID' 
   AND data->>'variant' IS NOT NULL
   ORDER BY created_at DESC LIMIT 1;
   ```
4. Verify notification appears in UI
5. Verify `data` field contains digest content

**Test: Both Channels**
1. Set preference to "both"
2. Generate digest
3. Verify both email and in-app notification are created

### 9. Timezone Testing

**Test: Timezone-Aware Scheduling**
1. Set user timezone to "America/New_York"
2. Set digest day to Monday, time to 08:00
3. Verify scheduler checks time in user's timezone
4. Test with different timezones:
   - Europe/London
   - Asia/Singapore
   - America/Los_Angeles

**Test: Week Boundaries**
1. Create events on Sunday (end of week) and Monday (start of week)
2. Verify week boundaries are calculated correctly
3. Events on Sunday should be in previous week
4. Events on Monday should be in current week

**Test: DST Transitions**
1. Test during DST forward/backward transitions
2. Verify digest still sends at correct local time
3. Verify stats are calculated correctly

### 10. Retry Logic Testing

**Test: Retry on Failure**
1. Temporarily break email sending (invalid API key)
2. Generate digest
3. Verify retry attempts are logged:
   ```sql
   SELECT retry_count, last_retry_at, failure_reason 
   FROM weekly_digests 
   WHERE status = 'failed';
   ```
4. Verify max 3 retries
5. Verify exponential backoff timing

**Test: Skip on Permanent Failure**
1. After all retries fail, verify status is "failed"
2. Verify next week's digest still sends (doesn't double-send)

### 11. Edge Cases Testing

**Test: New User**
1. Create new user account
2. Verify first digest is delayed until:
   - At least 1 reminder exists, OR
   - 7 days since signup

**Test: No Activity Week**
1. User with `only_when_active = true`
2. Week with zero events
3. Verify digest is NOT sent (not an error, just skipped)

**Test: High Activity**
1. Create 1000+ events in a week
2. Verify digest generation completes within reasonable time
3. Verify top N contacts are limited correctly

**Test: Missing Events**
1. Manually delete some events
2. Verify stats computation handles gracefully
3. Verify digest still sends with available data

**Test: Deleted Contacts**
1. Create reminder linked to contact
2. Delete contact
3. Verify digest handles gracefully (shows "Unknown Contact")

### 12. Integration Testing

**Test: End-to-End Flow**
1. User signs up
2. Creates reminders throughout the week
3. Completes some, snoozes others
4. Sets digest preferences (Monday 08:00, email)
5. Wait for Monday 08:00 (or manually trigger)
6. Verify:
   - Digest is generated
   - Stats are accurate
   - Correct variant is selected
   - Email is sent
   - Digest is marked as sent
   - No duplicate sends

## Quick Test Script

Create a test script to verify basic functionality:

```javascript
// scripts/test-digest.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDigest() {
  // 1. Create test user preferences
  const userId = 'test-user-id';
  await supabase.from('user_digest_preferences').upsert({
    user_id: userId,
    weekly_digest_enabled: true,
    digest_day: 1, // Monday
    digest_time: '08:00:00',
    digest_channel: 'email',
    digest_detail_level: 'standard',
  });

  // 2. Create test events
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  
  await supabase.from('events').insert([
    {
      user_id: userId,
      event_type: 'reminder_created',
      event_data: { reminder_id: 'test-1' },
    },
    {
      user_id: userId,
      event_type: 'reminder_triggered',
      event_data: { reminder_id: 'test-1' },
    },
    {
      user_id: userId,
      event_type: 'reminder_completed',
      event_data: { reminder_id: 'test-1' },
    },
  ]);

  // 3. Call digest generation
  const response = await fetch('http://localhost:3000/api/digests/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DIGEST_CRON_SECRET}`,
    },
  });

  console.log('Digest generation result:', await response.json());

  // 4. Verify digest was created
  const { data: digest } = await supabase
    .from('weekly_digests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Digest created:', digest);
}

testDigest();
```

## Manual Testing Steps

### Step 1: Setup Test User
1. Sign up or use existing account
2. Go to Settings → Digest tab
3. Enable weekly digest
4. Set preferences (Monday 08:00, Email, Standard)

### Step 2: Create Test Data
1. Create 5-10 reminders for this week
2. Complete some reminders
3. Snooze some reminders
4. Let some go overdue

### Step 3: Force Digest Generation
```bash
# Option 1: Via API (requires DIGEST_CRON_SECRET)
curl -X POST http://localhost:3000/api/digests/generate \
  -H "Authorization: Bearer YOUR_SECRET"

# Option 2: Temporarily modify scheduler to run immediately
# Edit lib/digest-scheduler.ts to return your user for testing
```

### Step 4: Verify Results
1. Check email inbox
2. Check in-app notifications
3. Check database:
   ```sql
   SELECT * FROM weekly_digests WHERE user_id = 'YOUR_USER_ID';
   SELECT * FROM events WHERE event_type IN ('reminder_triggered', 'reminder_overdue');
   ```

## Common Issues & Solutions

**Issue: Digest not sending**
- Check user preferences are saved
- Check `weekly_digest_enabled = true`
- Check current day/time matches user's preference
- Check user timezone is set correctly

**Issue: Stats are wrong**
- Verify events are being logged correctly
- Check week boundaries (Monday start)
- Verify timezone is correct

**Issue: Duplicate digests**
- Check `dedupe_key` is working
- Verify idempotency check in code

**Issue: Email not received**
- Check Resend API key is valid
- Check email address in user profile
- Check Resend dashboard for delivery status

## Performance Testing

**Test: Large Dataset**
1. Create user with 1000+ reminders
2. Generate digest
3. Verify completion time < 30 seconds
4. Verify memory usage is reasonable

**Test: Concurrent Users**
1. Create 100 users with digests enabled
2. Trigger digest generation
3. Verify all digests are processed
4. Verify no race conditions

## Next Steps After Testing

Once testing is complete:
1. Set up production cron job (Vercel Cron, GitHub Actions, etc.)
2. Monitor digest generation logs
3. Set up alerts for failures
4. Track digest open rates (if email tracking enabled)




