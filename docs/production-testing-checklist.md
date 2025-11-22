# Production Testing Checklist

## Pre-Deployment Verification

### Environment Variables
Verify these are set in Vercel:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `QSTASH_TOKEN`
- [ ] `QSTASH_CURRENT_SIGNING_KEY`
- [ ] `QSTASH_NEXT_SIGNING_KEY` (optional)
- [ ] `NEXT_PUBLIC_APP_URL=https://followuptimer.vercel.app`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM`
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (for push notifications)
- [ ] `VAPID_PRIVATE_KEY` (for push notifications)
- [ ] `VAPID_EMAIL` (for push notifications)

### Database Migrations
Ensure all migrations are applied in Supabase:
- [ ] `20241119000000_initial_schema.sql`
- [ ] `20241120000000_add_admin_role.sql`
- [ ] `20241121000000_add_privacy_settings.sql`
- [ ] `20241121000001_add_missing_fields.sql`
- [ ] `20241121000002_add_in_app_notifications.sql`
- [ ] `20241122000000_add_push_subscriptions.sql`

## Testing Checklist

### 1. Authentication Flow ✅
- [ ] Sign up new account
- [ ] Email confirmation (if enabled)
- [ ] Login with credentials
- [ ] Forgot password flow
- [ ] Reset password flow
- [ ] Logout

### 2. Admin Dashboard Redirect ✅
- [ ] Login as admin user → Should redirect to `/admin/waitlist`
- [ ] Login as regular user → Should redirect to `/dashboard`

### 3. Onboarding Flow ✅
- [ ] Step 1: Tone selection (motivational/professional/playful)
- [ ] Step 2: Notification preferences setup
- [ ] Should redirect to dashboard after completion

### 4. Reminder Management ✅
- [ ] Create new reminder
- [ ] Edit existing reminder
- [ ] Delete reminder
- [ ] View reminders list
- [ ] View reminder details

### 5. QStash Scheduling ✅
After creating a reminder scheduled for 2-3 minutes in the future:
- [ ] Check console logs for: `[QStash] Scheduling reminder:`
- [ ] Check console logs for: `[QStash] Successfully scheduled:`
- [ ] Verify `qstash_message_id` is saved in database
- [ ] Check QStash dashboard: https://console.upstash.com/qstash
- [ ] Verify message appears in QStash dashboard
- [ ] Wait for scheduled time
- [ ] Verify webhook is called: `[Webhook] Received request at:`
- [ ] Check server logs for notification sending

### 6. Notification Delivery ✅

#### Email Notifications
- [ ] Enable `email_notifications` in settings
- [ ] Create reminder with future time
- [ ] Wait for scheduled time
- [ ] Check email inbox
- [ ] Verify email contains reminder message and affirmation

#### Push Notifications
- [ ] Enable `push_notifications` in settings
- [ ] Click "Enable Browser Push Notifications"
- [ ] Grant browser permission
- [ ] Verify subscription is saved (check database `push_subscriptions` table)
- [ ] Create reminder with future time
- [ ] Wait for scheduled time
- [ ] Verify push notification appears

#### In-App Notifications
- [ ] Enable `in_app_notifications` in settings
- [ ] Create reminder with future time
- [ ] Wait for scheduled time
- [ ] Check notification bell icon
- [ ] Verify notification appears in list
- [ ] Mark notification as read
- [ ] Mark all as read

### 7. Multiple Notification Types ✅
Test with all three enabled:
- [ ] Enable email, push, and in-app notifications
- [ ] Create reminder
- [ ] Verify all three notification types are sent
- [ ] Check logs: Should see all three in `notificationResults`

### 8. Notification Preferences ✅
- [ ] Disable all notification preferences
- [ ] Create reminder
- [ ] Verify system falls back to reminder's `notification_method`
- [ ] Re-enable preferences
- [ ] Verify preferences are respected

### 9. Test Endpoints ✅

#### Debug Endpoint
```bash
GET https://followuptimer.vercel.app/api/reminders/debug?reminderId=YOUR_ID
```
Should return:
- QStash configuration status
- Reminder details
- Time calculations
- User preferences

#### Test Send Endpoint
```bash
POST https://followuptimer.vercel.app/api/reminders/test-send
Content-Type: application/json

{
  "reminderId": "YOUR_REMINDER_ID"
}
```
Should immediately send all enabled notifications (bypasses QStash).

### 10. Admin Features ✅
- [ ] Login as admin
- [ ] Access `/admin/waitlist`
- [ ] View waitlist entries
- [ ] Export waitlist to CSV

### 11. Settings ✅
- [ ] Profile settings
- [ ] Notification settings
- [ ] Account settings
- [ ] Privacy settings

### 12. Error Handling ✅
- [ ] Try accessing protected routes without auth → Should redirect to login
- [ ] Try accessing admin routes as non-admin → Should redirect to dashboard
- [ ] Create reminder with past time → Should show warning in logs

## Debugging Issues

### If Reminders Aren't Sending:

1. **Check Environment Variables**
   ```bash
   # In Vercel dashboard
   Settings → Environment Variables
   ```

2. **Check QStash Dashboard**
   - Go to: https://console.upstash.com/qstash
   - Look for scheduled messages
   - Check delivery status

3. **Check Server Logs**
   - Vercel Dashboard → Your Project → Functions
   - Look for `[QStash]` and `[Webhook]` logs

4. **Use Debug Endpoint**
   ```
   GET /api/reminders/debug?reminderId=YOUR_ID
   ```

5. **Test Manually**
   ```
   POST /api/reminders/test-send
   { "reminderId": "YOUR_ID" }
   ```

### If Notifications Aren't Working:

1. **Check User Preferences**
   - Settings → Notifications
   - Verify at least one is enabled

2. **Check Email Service**
   - Verify Resend API key is set
   - Check Resend dashboard for sent emails

3. **Check Push Notifications**
   - Verify VAPID keys are set
   - Check browser console for errors
   - Verify subscription is in database

4. **Check In-App Notifications**
   - Verify `in_app_notifications` table exists
   - Check browser console for errors

## Quick Test Script

```bash
# 1. Create a test reminder (via UI or API)
# 2. Get reminder ID from response

# 3. Check debug info
curl "https://followuptimer.vercel.app/api/reminders/debug?reminderId=YOUR_ID"

# 4. Test notifications immediately
curl -X POST "https://followuptimer.vercel.app/api/reminders/test-send" \
  -H "Content-Type: application/json" \
  -d '{"reminderId": "YOUR_ID"}'

# 5. Check QStash dashboard for scheduled messages
# 6. Wait for scheduled time and verify webhook is called
```

## Performance Checks

- [ ] Page load times are acceptable
- [ ] API responses are fast (< 500ms)
- [ ] No console errors in browser
- [ ] No 500 errors in server logs
- [ ] Database queries are optimized

## Security Checks

- [ ] HTTPS is enforced
- [ ] Environment variables are not exposed
- [ ] Authentication is required for protected routes
- [ ] RLS policies are working correctly
- [ ] Admin routes are protected

## Monitoring

Set up monitoring for:
- [ ] QStash webhook failures
- [ ] Notification delivery failures
- [ ] Database errors
- [ ] API errors
- [ ] User authentication issues

## Post-Deployment

After deployment:
1. ✅ Test authentication flow
2. ✅ Create a test reminder (2-3 min in future)
3. ✅ Verify QStash scheduling works
4. ✅ Test all notification types
5. ✅ Check Vercel function logs
6. ✅ Check QStash dashboard
7. ✅ Test admin features
8. ✅ Verify all settings work

