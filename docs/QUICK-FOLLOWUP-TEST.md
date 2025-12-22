# Quick Follow-Up Testing Guide

## 🚀 Fastest Way to Test

### 1. Enable the Feature
```
Settings → Behaviour → Auto-Create Follow-up Prompt: ON
Settings → Behaviour → Default Follow-up Interval: 3 days
```

### 2. Create Test Data
1. Create a contact (e.g., "Test Contact")
2. Create a reminder:
   - Link to the contact
   - Set time to 1-2 minutes from now
   - Save

### 3. Complete the Reminder
- Wait for popup OR go to reminder detail page
- Click "Mark Done" / "Complete"

### 4. Verify Follow-Up Prompt
- ✅ A popup should appear: "Create Next Follow-up?"
- ✅ Suggested date should be ~3 days from now
- ✅ Popup should have action buttons

### 5. Create Follow-Up (Manual API Test)

If the UI button doesn't work yet, test via API:

```javascript
// In browser console
const response = await fetch('/api/reminders/create-followup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    original_reminder_id: 'YOUR_REMINDER_ID',
    message: 'Follow up message'
  })
});
const result = await response.json();
console.log(result);
```

## ✅ What Should Work

- [x] Follow-up prompt appears after completing reminder with contact
- [x] Follow-up prompt does NOT appear for reminders without contact
- [x] Follow-up prompt does NOT appear when auto-create is disabled
- [x] API endpoint `/api/reminders/create-followup` creates follow-up reminder
- [x] Follow-up reminder respects default interval setting
- [x] Follow-up reminder respects working hours, quiet hours, weekends

## 🔍 Verify in Database

```sql
-- Check user preferences
SELECT auto_create_followup, default_followup_interval_days 
FROM user_preferences 
WHERE user_id = 'YOUR_USER_ID';

-- Check follow-up prompt popups
SELECT * FROM popups 
WHERE template_type = 'follow_up_required' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check created follow-up reminders
SELECT id, message, remind_at, contact_id, status 
FROM reminders 
WHERE contact_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
```

## 🐛 Troubleshooting

**No prompt appears?**
- Check: Settings → Behaviour → Auto-Create Follow-up is ON
- Check: Reminder has a `contact_id` (linked to contact)
- Check: Reminder was actually completed (status = 'sent')

**Wrong date?**
- Check: Default Follow-up Interval setting
- Check: User timezone in profiles table
- Check: Working hours / quiet hours settings

**API error?**
- Check: You're authenticated (have valid session)
- Check: Reminder ID exists and belongs to you
- Check: Browser console for error details

## 📝 Full Testing Guide

See `docs/milestone8-followup-testing-guide.md` for comprehensive testing scenarios.

