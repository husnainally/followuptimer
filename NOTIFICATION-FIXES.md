# Email and Push Notification Fixes

## Changes Made

### 1. Enhanced Email Error Handling (`lib/email.ts`)
- ✅ Added comprehensive error logging
- ✅ Checks for `RESEND_API_KEY` configuration
- ✅ Logs email send attempts and results
- ✅ Better error messages for debugging

### 2. Enhanced Push Notification Logging (`lib/push-notification.ts`)
- ✅ Added detailed logging for subscription fetching
- ✅ Logs each push notification attempt
- ✅ Better error messages with subscription details
- ✅ Automatic cleanup of invalid subscriptions

### 3. Improved Webhook Logging (`app/api/reminders/send/route.ts`)
- ✅ Logs user notification preferences
- ✅ Better error tracking for each notification type

### 4. New Test Endpoint (`app/api/notifications/test/route.ts`)
- ✅ Test email notifications independently
- ✅ Test push notifications independently
- ✅ Test both together
- ✅ Returns configuration status

## How to Debug

### Step 1: Test Notifications

**In Browser Console (while logged in):**
```javascript
fetch('/api/notifications/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'both' })
})
.then(r => r.json())
.then(data => {
  console.log('Config:', data.config);
  console.log('Results:', data.results);
});
```

### Step 2: Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → Functions
2. Look for logs with these prefixes:
   - `[Email]` - Email sending attempts
   - `[Push]` - Push notification attempts
   - `[Webhook]` - Reminder webhook processing

### Step 3: Verify Environment Variables

**Required for Email:**
- `RESEND_API_KEY` - Must be set in Vercel
- `RESEND_FROM` - Must be a verified domain in Resend

**Required for Push:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Must be set in Vercel
- `VAPID_PRIVATE_KEY` - Must be set in Vercel
- `VAPID_EMAIL` - Optional (defaults to `mailto:noreply@followuptimer.app`)

### Step 4: Check User Settings

1. **Email Notifications:**
   - User must have `email_notifications = true` in `profiles` table
   - User must have an email address in their profile

2. **Push Notifications:**
   - User must have `push_notifications = true` in `profiles` table
   - User must have enabled push in Settings → Notifications
   - Browser must have granted notification permission
   - Subscription must exist in `push_subscriptions` table

## Common Issues and Solutions

### Email Not Working

**Issue:** No emails received

**Check:**
1. ✅ `RESEND_API_KEY` is set in Vercel
2. ✅ `RESEND_FROM` domain is verified in Resend dashboard
3. ✅ User has `email_notifications = true` in profile
4. ✅ User has email address in profile
5. ✅ Check Vercel logs for `[Email]` errors
6. ✅ Check Resend dashboard for sent emails

**Solution:**
- Verify Resend domain in Resend dashboard
- Ensure environment variables are set for Production
- Redeploy after updating environment variables

### Push Not Working

**Issue:** No push notifications received

**Check:**
1. ✅ VAPID keys are configured in Vercel
2. ✅ User has `push_notifications = true` in profile
3. ✅ User has enabled push in Settings
4. ✅ Browser has granted notification permission
5. ✅ Subscription exists in `push_subscriptions` table
6. ✅ Service worker is registered (`/sw.js` accessible)
7. ✅ Check Vercel logs for `[Push]` errors

**Solution:**
1. Go to Settings → Notifications
2. Toggle "Browser Push Notifications" OFF then ON
3. Grant permission when browser prompts
4. Check browser console for errors
5. Verify subscription in database:
   ```sql
   SELECT * FROM push_subscriptions WHERE user_id = 'your-user-id';
   ```

## Testing Checklist

- [ ] Test endpoint returns success for email
- [ ] Test endpoint returns success for push
- [ ] Environment variables are set in Vercel
- [ ] Resend domain is verified
- [ ] User preferences are enabled
- [ ] Push subscription exists in database
- [ ] Service worker is accessible
- [ ] Browser permission is granted
- [ ] Vercel logs show no errors

## Next Steps

1. **Deploy the fixes:**
   ```bash
   git add .
   git commit -m "Fix email and push notification error handling"
   git push
   ```

2. **Test in production:**
   - Use the test endpoint to verify configuration
   - Create a test reminder
   - Monitor Vercel logs

3. **Check logs:**
   - Look for `[Email]` and `[Push]` messages
   - Verify no errors are occurring
   - Check `sent_logs` table for delivery status

## Support

If issues persist:
1. Check Vercel logs for specific error messages
2. Use the test endpoint to isolate the issue
3. Verify all environment variables are set
4. Check the `sent_logs` table for error messages
5. Review `docs/notification-debugging.md` for detailed debugging steps

