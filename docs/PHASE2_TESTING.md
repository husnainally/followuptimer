# Phase 2 Testing Guide

This guide will help you test all the new Phase 2 features systematically.

## Prerequisites

1. **Run Database Migrations**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run these migrations in order:
     - `20241201000000_phase2_events.sql`
     - `20241201000001_phase2_popups.sql`
     - `20241201000002_phase2_affirmations.sql`
     - `20241201000003_phase2_smart_snooze.sql`
     - `20241201000004_phase2_digests.sql`

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Verify Environment Variables**
   - Ensure `RESEND_API_KEY` is set (for weekly digests)
   - Ensure `NEXT_PUBLIC_APP_URL` is set
   - Optional: `DIGEST_CRON_SECRET` for digest endpoint security

---

## 1. Behaviour Event System Testing

### Test Event Logging

1. **Create a Reminder**
   - Go to `/reminder/create`
   - Create a new reminder
   - Check browser console for: `[Events] Logged reminder_created event`
   - Verify in Supabase: `SELECT * FROM events WHERE event_type = 'reminder_created' ORDER BY created_at DESC LIMIT 1;`

2. **Snooze a Reminder**
   - Go to dashboard
   - Snooze an existing reminder
   - Verify event: `SELECT * FROM events WHERE event_type = 'reminder_snoozed' ORDER BY created_at DESC LIMIT 1;`

3. **Dismiss a Reminder**
   - Dismiss a reminder
   - Verify event: `SELECT * FROM events WHERE event_type = 'reminder_dismissed' ORDER BY created_at DESC LIMIT 1;`

### Test Event API

```bash
# Get events
curl -X GET "http://localhost:3000/api/events?event_type=reminder_created&limit=10" \
  -H "Cookie: your-auth-cookie"

# Log a custom event (from browser console)
fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'streak_achieved',
    event_data: { streak_count: 5 }
  })
})
```

---

## 2. Popup System Testing

### Test Popup Creation

1. **Manual Popup Creation**
   ```bash
   # From browser console (while logged in)
   fetch('/api/popups', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       template_type: 'success',
       title: 'Test Popup',
       message: 'This is a test popup message',
       affirmation: 'You are doing great!',
       priority: 7,
       reminder_id: null
     })
   })
   ```

2. **Verify Popup Appears**
   - Check bottom-right corner of dashboard
   - Popup should animate in
   - Should show title, message, and affirmation

3. **Test Popup Actions**
   - Click "Complete" button
   - Verify popup disappears
   - Check database: `SELECT * FROM popup_actions ORDER BY created_at DESC LIMIT 1;`

4. **Test Popup Dismiss**
   - Create another popup
   - Click X button to dismiss
   - Verify it's marked as dismissed in database

### Test Popup Triggers

1. **Trigger Success Popup**
   - Complete a reminder (mark as sent)
   - This should trigger a success popup automatically
   - Check: `SELECT * FROM popups WHERE template_type = 'success' ORDER BY created_at DESC LIMIT 1;`

2. **Test Priority Queue**
   - Create multiple popups with different priorities
   - Verify highest priority popup shows first

---

## 3. Enhanced Affirmation Engine Testing

### Test New 'Simple' Tone

1. **Create Reminder with Simple Tone**
   - Go to `/reminder/create`
   - Select "simple" tone (should be 4th option)
   - Create reminder
   - Verify affirmation is simple/direct

2. **Test Affirmation Bar**
   - Go to dashboard
   - Verify affirmation bar appears above reminders table
   - Click refresh button
   - Verify affirmation changes

3. **Test Affirmation Frequency**
   - Go to Settings → Notifications
   - Change "Affirmation Frequency" to "Rare"
   - Save settings
   - Verify in database: `SELECT affirmation_frequency FROM profiles WHERE id = 'your-user-id';`

4. **Test Per-Reminder Toggle**
   - Create a new reminder
   - Toggle "Include Affirmation" off
   - Create reminder
   - Verify in database: `SELECT affirmation_enabled FROM reminders WHERE id = 'reminder-id';`

### Test Expanded Affirmations

```javascript
// In browser console
import { generateAffirmation } from '@/lib/affirmations';

// Test all tones
['motivational', 'professional', 'playful', 'simple'].forEach(tone => {
  console.log(`${tone}:`, generateAffirmation(tone));
});
```

---

## 4. Smart Snooze System Testing

### Enable Smart Snooze

1. **Enable in Settings**
   - Go to Settings → Notifications
   - Toggle "Smart Snooze" ON
   - Save preferences

2. **Create Snooze History**
   - Snooze 3-4 reminders with different durations (5, 10, 15, 30 minutes)
   - Verify in database: `SELECT * FROM snooze_history ORDER BY created_at DESC;`

### Test Smart Suggestions

1. **Get Suggestion**
   ```bash
   # From browser console
   fetch('/api/snooze/suggestions?reminder_id=your-reminder-id')
     .then(r => r.json())
     .then(console.log)
   ```

2. **Verify Pattern Learning**
   - Check snooze patterns: `SELECT snooze_pattern FROM profiles WHERE id = 'your-user-id';`
   - Should see time-of-day and day-of-week patterns

3. **Test Snooze with Smart Suggestion**
   - Snooze a reminder
   - Check if suggestion is used (if smart snooze enabled)
   - Verify in snooze_history: `SELECT snooze_reason FROM snooze_history ORDER BY created_at DESC LIMIT 1;`

---

## 5. Weekly Performance Digests Testing

### Configure Digest Preferences

1. **Enable Weekly Digest**
   - Go to Settings → Notifications
   - Toggle "Weekly Digest" ON
   - Select day of week (e.g., Monday)
   - Save preferences

2. **Verify Settings**
   ```sql
   SELECT digest_preferences FROM profiles WHERE id = 'your-user-id';
   -- Should show: {"enabled": true, "day_of_week": 1, "time": "09:00", "format": "html"}
   ```

### Test Digest Generation

1. **Create Test Data**
   - Create several reminders this week
   - Complete some, snooze some
   - This creates data for the digest

2. **Manually Trigger Digest**
   ```bash
   # Set DIGEST_CRON_SECRET in .env.local first
   curl -X POST "http://localhost:3000/api/digests/generate" \
     -H "Authorization: Bearer YOUR_DIGEST_CRON_SECRET"
   ```

   Or from browser console (if no secret set):
   ```javascript
   fetch('/api/digests/generate', { method: 'POST' })
     .then(r => r.json())
     .then(console.log)
   ```

3. **Check Email**
   - If Resend is configured, check your email
   - Should receive beautiful HTML digest with stats

4. **Verify Database**
   ```sql
   SELECT * FROM weekly_digests ORDER BY created_at DESC LIMIT 1;
   -- Should show stats_data with all metrics
   ```

### Test Digest Stats

```sql
-- Check what stats were generated
SELECT 
  stats_data->>'remindersCreated' as created,
  stats_data->>'remindersCompleted' as completed,
  stats_data->>'completionRate' as rate,
  stats_data->>'currentStreak' as streak
FROM weekly_digests 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## 6. Integration Testing

### End-to-End Flow

1. **Complete User Journey**
   - Create reminder → Event logged
   - Reminder triggers → Popup appears
   - Snooze reminder → Smart suggestion used
   - Complete reminder → Success popup
   - Check weekly digest → Stats aggregated

2. **Test Dashboard**
   - Verify affirmation bar appears
   - Verify popups work
   - Check all stats display correctly

3. **Test Settings**
   - Change affirmation frequency
   - Toggle smart snooze
   - Configure weekly digest
   - Verify all save correctly

---

## 7. Database Verification Queries

Run these in Supabase SQL Editor to verify everything:

```sql
-- Check all Phase 2 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('events', 'popups', 'popup_actions', 'snooze_history', 'weekly_digests', 'behaviour_rules')
ORDER BY table_name;

-- Check profiles have new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('affirmation_frequency', 'smart_snooze_enabled', 'snooze_pattern', 'digest_preferences');

-- Check reminders have affirmation_enabled
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'reminders' 
  AND column_name = 'affirmation_enabled';

-- Count events by type
SELECT event_type, COUNT(*) 
FROM events 
GROUP BY event_type 
ORDER BY COUNT(*) DESC;

-- Check popup queue
SELECT template_type, status, COUNT(*) 
FROM popups 
GROUP BY template_type, status;

-- Check snooze patterns
SELECT user_id, snooze_pattern 
FROM profiles 
WHERE snooze_pattern IS NOT NULL 
  AND snooze_pattern != '{}'::jsonb;
```

---

## 8. Common Issues & Solutions

### Issue: Popups not appearing
- **Check**: Is popup system component in layout?
- **Verify**: `SELECT * FROM popups WHERE status = 'pending' ORDER BY priority DESC;`
- **Solution**: Check browser console for errors

### Issue: Events not logging
- **Check**: Is `lib/events.ts` imported correctly?
- **Verify**: Check API route imports
- **Solution**: Check Supabase RLS policies

### Issue: Smart snooze not working
- **Check**: Is `smart_snooze_enabled = true` in profiles?
- **Verify**: Do you have snooze history? (need at least 1-2 snoozes)
- **Solution**: Enable in settings, create some snooze history first

### Issue: Weekly digest not sending
- **Check**: Is `digest_preferences->>'enabled' = 'true'`?
- **Verify**: Is today the selected day of week?
- **Solution**: Manually trigger via API endpoint

### Issue: Affirmation bar not showing
- **Check**: Is component imported in dashboard?
- **Verify**: Check browser console for errors
- **Solution**: Verify user has tone_preference set

---

## 9. Performance Testing

1. **Load Test Events**
   ```javascript
   // Create 100 events quickly
   for (let i = 0; i < 100; i++) {
     fetch('/api/events', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         event_type: 'reminder_created',
         event_data: { test: i }
       })
     });
   }
   ```

2. **Test Popup Queue**
   - Create 10 popups with different priorities
   - Verify queue management works correctly

3. **Test Database Queries**
   - Check query performance in Supabase dashboard
   - Verify indexes are being used

---

## 10. Browser Console Testing

Open browser console and test these:

```javascript
// Test event logging
await fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_type: 'streak_achieved',
    event_data: { streak_count: 7 }
  })
});

// Test popup creation
await fetch('/api/popups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_type: 'streak',
    title: 'Amazing Streak!',
    message: 'You have a 7-day streak!',
    affirmation: 'Consistency is key!',
    priority: 9
  })
});

// Test smart snooze
await fetch('/api/snooze/suggestions?reminder_id=test-id')
  .then(r => r.json())
  .then(console.log);

// Get next popup
await fetch('/api/popups')
  .then(r => r.json())
  .then(console.log);

// Get events
await fetch('/api/events?limit=10')
  .then(r => r.json())
  .then(console.log);
```

---

## Next Steps

1. ✅ Run all migrations
2. ✅ Test each feature individually
3. ✅ Test integration between features
4. ✅ Verify database integrity
5. ✅ Check for any console errors
6. ✅ Test in production environment

For production testing, ensure:
- All environment variables are set
- Database migrations are applied
- QStash is configured (for reminders)
- Resend is configured (for digests)
- Vercel cron job is set up for weekly digests (optional)

