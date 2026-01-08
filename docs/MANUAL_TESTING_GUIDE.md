# Manual User Testing Guide - Phase 2 Features

This guide walks you through testing all Phase 2 features as a regular user would use them.

## Prerequisites

✅ **Before you start:**
1. Run all database migrations in Supabase SQL Editor
2. Start your dev server: `npm run dev`
3. Log in to your account (or create one)

---

## 🎯 Feature 1: Enhanced Affirmation Engine

### Test 1.1: See Affirmation Bar on Dashboard

**Steps:**
1. Go to `/dashboard`
2. Look above the reminders table
3. **Expected:** You should see an affirmation bar with:
   - A sparkle icon
   - A motivational message
   - A refresh button (circular arrow icon)

**What to check:**
- ✅ Affirmation bar is visible
- ✅ Message changes when you click refresh
- ✅ Styling looks good (gradient background)

---

### Test 1.2: Create Reminder with "Simple" Tone

**Steps:**
1. Click "New Reminder" button
2. Fill in reminder details:
   - Message: "Test simple tone"
   - Date & Time: Pick a future time
3. **Look for tone options** - you should see 4 buttons:
   - Motivational
   - Professional
   - Playful
   - **Simple** (NEW!)
4. Click "Simple"
5. **Look for "Include Affirmation" toggle** - should be ON by default
6. Toggle it OFF
7. Click "Create Reminder"

**What to check:**
- ✅ "Simple" tone option appears (4th option)
- ✅ "Include Affirmation" toggle is visible
- ✅ Can toggle affirmation on/off
- ✅ Reminder creates successfully

---

### Test 1.3: Change Affirmation Frequency in Settings

**Steps:**
1. Go to Settings (gear icon in sidebar)
2. Click "Notifications" tab
3. Scroll down to find "Affirmation Frequency"
4. **You should see a dropdown** with 3 options:
   - Rare - Once per day
   - Balanced - Every 4 hours
   - Frequent - Every hour
5. Select "Rare"
6. Click "Save Preferences"

**What to check:**
- ✅ Affirmation Frequency dropdown appears
- ✅ Can select different frequencies
- ✅ Settings save successfully
- ✅ No error messages

---

## 🎉 Feature 2: Popup System

### Test 2.1: See a Success Popup

**Steps:**
1. Go to dashboard
2. **Create a reminder** and mark it as completed (or wait for it to trigger)
3. **Expected:** A popup should appear in the **bottom-right corner** with:
   - Green border/background (success style)
   - Title: "Great job!"
   - Message about completing reminder
   - An affirmation message
   - Action buttons: "Complete", "Snooze", "Follow Up"

**What to check:**
- ✅ Popup appears smoothly (fade-in animation)
- ✅ Styled correctly (green for success)
- ✅ All text is readable
- ✅ Buttons are clickable

---

### Test 2.2: Interact with Popup

**Steps:**
1. When popup appears, try these actions:
   - Click "Complete" button
   - OR click "Snooze" button
   - OR click "Follow Up" button
   - OR click the X button (top-right) to dismiss

**What to check:**
- ✅ Each button works
- ✅ Popup disappears after action
- ✅ No errors in browser console
- ✅ If you have multiple popups, next one appears

---

### Test 2.3: Create Custom Popup (Advanced)

**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Paste and run this code:

```javascript
fetch('/api/popups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template_type: 'streak',
    title: 'Amazing Streak!',
    message: 'You have a 7-day streak going!',
    affirmation: 'Consistency is key to success!',
    priority: 9
  })
}).then(r => r.json()).then(console.log);
```

4. **Expected:** A yellow/orange popup appears with streak theme

**What to check:**
- ✅ Popup appears with correct template type
- ✅ Different colors for different templates:
  - Success = Green
  - Streak = Yellow/Orange
  - Inactivity = Blue
  - Follow-up Required = Orange

---

## ⏰ Feature 3: Smart Snooze System

### Test 3.1: Enable Smart Snooze

**Steps:**
1. Go to Settings → Notifications
2. Scroll down to find "Smart Snooze" toggle
3. Turn it ON
4. Click "Save Preferences"

**What to check:**
- ✅ Toggle appears in settings
- ✅ Can enable/disable it
- ✅ Settings save successfully

---

### Test 3.2: Use Smart Snooze

**Steps:**
1. Go to dashboard
2. Find a reminder (or create one)
3. Snooze it (use existing snooze functionality)
4. **After snoozing 2-3 reminders**, snooze another one
5. **Expected:** System learns your patterns

**What to check:**
- ✅ Snooze works normally
- ✅ System tracks your snooze patterns
- ✅ After multiple snoozes, suggestions improve

---

### Test 3.3: Get Smart Suggestion (Advanced)

**Steps:**
1. Make sure you've snoozed at least 2-3 reminders
2. Open browser DevTools Console
3. Run:

```javascript
fetch('/api/snooze/suggestions')
  .then(r => r.json())
  .then(data => {
    if (data.suggestion) {
      console.log('Suggested duration:', data.suggestion.durationMinutes, 'minutes');
      console.log('Confidence:', (data.suggestion.confidence * 100).toFixed(0) + '%');
      console.log('Reason:', data.suggestion.reason);
    } else {
      console.log('No suggestion available');
    }
  });
```

**What to check:**
- ✅ Suggestion appears (if smart snooze enabled)
- ✅ Duration makes sense based on your history
- ✅ Confidence level is shown

---

## 📊 Feature 4: Weekly Performance Digests

### Test 4.1: Enable Weekly Digest

**Steps:**
1. Go to Settings → Notifications
2. Find "Weekly Digest" toggle
3. Turn it ON
4. **A dropdown should appear** for "Day of Week"
5. Select a day (e.g., "Monday")
6. Click "Save Preferences"

**What to check:**
- ✅ Weekly Digest toggle appears
- ✅ Day selector appears when enabled
- ✅ Can select different days
- ✅ Settings save

---

### Test 4.2: Generate Test Digest

**Steps:**
1. Make sure you have some reminder activity:
   - Create 3-4 reminders
   - Complete 1-2 of them
   - Snooze 1 reminder
2. Open browser DevTools Console
3. Run this to manually trigger digest:

```javascript
fetch('/api/digests/generate', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('Digest sent to:', data.sent, 'users');
    console.log('Check your email!');
  });
```

4. **Expected:** If Resend is configured, check your email inbox

**What to check:**
- ✅ No errors in console
- ✅ Email received (if email configured)
- ✅ Email has nice formatting with stats
- ✅ Shows your completion rate, streak, etc.

---

## 📝 Feature 5: Behaviour Event System

### Test 5.1: Events are Logged Automatically

**Steps:**
1. Create a new reminder
2. **Expected:** Event is logged automatically (you won't see this, but it happens)
3. Snooze a reminder
4. **Expected:** Another event is logged
5. Dismiss a reminder
6. **Expected:** Another event is logged

**Verify in Database:**
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Run:

```sql
SELECT event_type, COUNT(*) as count
FROM events
WHERE user_id = 'YOUR_USER_ID'
GROUP BY event_type
ORDER BY count DESC;
```

**What to check:**
- ✅ Events appear in database
- ✅ Different event types are logged:
  - `reminder_created`
  - `reminder_snoozed`
  - `reminder_dismissed`

---

## 🎨 Feature 6: UI/UX Improvements

### Test 6.1: Dashboard Layout

**Steps:**
1. Go to dashboard
2. **Check layout:**
   - Affirmation bar at top
   - Stats cards (3 cards showing counts)
   - Reminders table below

**What to check:**
- ✅ Everything is visible
- ✅ Layout looks good on desktop
- ✅ Layout looks good on mobile (resize browser)
- ✅ No overlapping elements

---

### Test 6.2: Settings Page

**Steps:**
1. Go to Settings
2. **Check all tabs:**
   - Profile
   - Notifications (should have new options)
   - Privacy
   - Account

**What to check:**
- ✅ All tabs work
- ✅ New settings appear in Notifications tab:
  - Affirmation Frequency
  - Smart Snooze toggle
  - Weekly Digest with day selector
- ✅ Forms save correctly
- ✅ Success messages appear

---

## 🔄 Complete User Journey Test

### Full Workflow Test

**Steps:**
1. **Create Account** (if new user)
   - Sign up
   - Complete onboarding
   - Set tone preference

2. **Configure Settings**
   - Go to Settings → Notifications
   - Enable Smart Snooze
   - Set Affirmation Frequency to "Balanced"
   - Enable Weekly Digest, set to Monday
   - Save

3. **Create Reminders**
   - Create 3 reminders with different tones
   - Try "Simple" tone
   - Toggle affirmation off for one reminder

4. **Interact with Reminders**
   - Snooze one reminder (builds pattern)
   - Complete one reminder (triggers success popup)
   - Dismiss one reminder

5. **Check Dashboard**
   - Verify affirmation bar shows
   - Refresh affirmation
   - Check stats cards update

6. **Test Popups**
   - Complete a reminder → success popup
   - Interact with popup buttons
   - Dismiss popup

7. **Check Weekly Digest**
   - Wait for your selected day OR manually trigger
   - Check email for digest

---

## ✅ Quick Visual Checklist

Go through your app and verify:

- [ ] **Dashboard**
  - [ ] Affirmation bar visible
  - [ ] Affirmation bar has refresh button
  - [ ] Stats cards show correct numbers
  - [ ] Reminders table works

- [ ] **Create Reminder Page**
  - [ ] 4 tone options (including "Simple")
  - [ ] "Include Affirmation" toggle visible
  - [ ] Can create reminder successfully

- [ ] **Settings Page**
  - [ ] Affirmation Frequency dropdown
  - [ ] Smart Snooze toggle
  - [ ] Weekly Digest toggle + day selector
  - [ ] All settings save

- [ ] **Popups**
  - [ ] Popups appear bottom-right
  - [ ] Different colors for different types
  - [ ] Buttons work
  - [ ] Can dismiss

- [ ] **Snooze**
  - [ ] Snooze works normally
  - [ ] Smart snooze can be enabled

---

## 🐛 Common Issues & Quick Fixes

### Issue: Affirmation bar not showing
- **Check:** Are you on the dashboard page?
- **Fix:** Refresh page, check browser console for errors

### Issue: Popups not appearing
- **Check:** Is popup system component loaded?
- **Fix:** Check browser console, verify no JavaScript errors

### Issue: Settings not saving
- **Check:** Are you logged in?
- **Fix:** Log out and log back in, try again

### Issue: "Simple" tone not showing
- **Check:** Did you run the affirmation migration?
- **Fix:** Run `20241201000002_phase2_affirmations.sql` migration

### Issue: Smart Snooze not working
- **Check:** Is it enabled in settings?
- **Fix:** Enable it, save, then try snoozing a reminder

---

## 📱 Mobile Testing

**Test on mobile device or resize browser:**

1. **Dashboard**
   - Affirmation bar should be readable
   - Stats cards stack vertically
   - Reminders table scrolls

2. **Popups**
   - Should appear and be readable
   - Buttons should be tappable
   - Should not cover important content

3. **Settings**
   - All toggles and dropdowns work
   - Forms are easy to fill
   - Save button is accessible

---

## 🎯 Success Criteria

You've successfully tested Phase 2 if:

✅ Affirmation bar appears and refreshes  
✅ Can create reminders with "Simple" tone  
✅ Can toggle affirmation per reminder  
✅ Affirmation frequency setting works  
✅ Popups appear and are interactive  
✅ Smart snooze can be enabled  
✅ Weekly digest can be configured  
✅ All settings save correctly  
✅ No console errors  
✅ UI looks good on desktop and mobile  

---

## 💡 Pro Tips

1. **Use Browser DevTools**
   - Press F12 to open
   - Check Console tab for errors
   - Check Network tab to see API calls

2. **Test with Multiple Reminders**
   - Create 5-10 reminders
   - Mix of completed, snoozed, dismissed
   - This gives you data to see patterns

3. **Check Database**
   - Supabase dashboard shows all your data
   - Verify events, popups, snooze history are being created

4. **Test Different Scenarios**
   - New user (no data)
   - Active user (lots of reminders)
   - User with patterns (many snoozes)

---

## 🚀 Next Steps After Testing

Once everything works:

1. ✅ Test in production environment
2. ✅ Set up Vercel cron for weekly digests
3. ✅ Configure email (Resend) for digests
4. ✅ Monitor for any errors
5. ✅ Gather user feedback

Happy testing! 🎉

