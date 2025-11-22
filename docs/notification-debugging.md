# Notification Debugging Guide

## Quick Test Endpoint

Use the test endpoint to verify email and push notifications:

```bash
# Test both email and push
curl -X POST https://followuptimer.vercel.app/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"type": "both"}'

# Test only email
curl -X POST https://followuptimer.vercel.app/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"type": "email"}'

# Test only push
curl -X POST https://followuptimer.vercel.app/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"type": "push"}'
```

Or use the browser console (while logged in):

```javascript
fetch('/api/notifications/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'both' })
}).then(r => r.json()).then(console.log)
```

## Email Notifications

### Common Issues

1. **RESEND_API_KEY not configured**
   - Check Vercel environment variables
   - Should be: `re_...` (starts with `re_`)

2. **RESEND_FROM not configured**
   - Should be: `FollowUpTimer <noreply@yourdomain.com>`
   - Domain must be verified in Resend dashboard

3. **Email notifications disabled in profile**
   - Check `profiles.email_notifications` in database
   - Enable in Settings → Notifications

4. **No email address in profile**
   - User must have an email in their Supabase auth account
   - Check `profiles.email` matches auth email

### Debugging Steps

1. Check Vercel logs for `[Email]` messages
2. Check Resend dashboard for sent emails
3. Verify environment variables in Vercel
4. Test with `/api/notifications/test` endpoint

### Logs to Look For

```
[Email] Sending reminder email: { to, from, subject }
[Email] Email sent successfully: { id, to }
[Email] Error sending email: { error, to, subject }
```

## Push Notifications

### Common Issues

1. **VAPID keys not configured**
   - Check `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel
   - Check `VAPID_PRIVATE_KEY` in Vercel
   - Check `VAPID_EMAIL` in Vercel (optional)

2. **No push subscription in database**
   - User must enable push notifications in Settings
   - Browser must support push notifications
   - User must grant notification permission

3. **Push notifications disabled in profile**
   - Check `profiles.push_notifications` in database
   - Enable in Settings → Notifications

4. **Subscription expired or invalid**
   - Browser may have revoked permission
   - Subscription endpoint may be invalid
   - System automatically removes invalid subscriptions

### Debugging Steps

1. **Check if user has subscriptions:**
   ```sql
   SELECT * FROM push_subscriptions WHERE user_id = 'user-id';
   ```

2. **Check browser console for errors:**
   - Open DevTools → Console
   - Look for service worker errors
   - Check notification permission status

3. **Verify service worker:**
   - Go to `https://followuptimer.vercel.app/sw.js`
   - Should return service worker code (not 404)

4. **Test subscription:**
   - Settings → Notifications
   - Toggle "Browser Push Notifications"
   - Check browser permission prompt

5. **Check Vercel logs for `[Push]` messages**

### Logs to Look For

```
[Push] Found subscriptions: { userId, count }
[Push] Sending notification to: { endpoint }
[Push] Notification sent successfully
[Push] Error sending to subscription: { error, statusCode }
[Push] No push subscriptions found for user
```

## Database Checks

### Check User Preferences

```sql
SELECT 
  id,
  email,
  email_notifications,
  push_notifications,
  in_app_notifications
FROM profiles
WHERE id = 'user-id';
```

### Check Push Subscriptions

```sql
SELECT 
  id,
  user_id,
  endpoint,
  created_at
FROM push_subscriptions
WHERE user_id = 'user-id';
```

### Check Sent Logs

```sql
SELECT 
  id,
  reminder_id,
  delivery_method,
  status,
  success,
  error_message,
  created_at
FROM sent_logs
WHERE user_id = 'user-id'
ORDER BY created_at DESC
LIMIT 10;
```

## Environment Variables Checklist

### Required for Email
- ✅ `RESEND_API_KEY` - Your Resend API key
- ✅ `RESEND_FROM` - Verified sender email

### Required for Push
- ✅ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - VAPID public key
- ✅ `VAPID_PRIVATE_KEY` - VAPID private key
- ✅ `VAPID_EMAIL` - Contact email (optional, defaults to `mailto:noreply@followuptimer.app`)

### Verify in Vercel
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Ensure all variables are set for **Production** environment
3. Redeploy after adding/updating variables

## Testing Checklist

- [ ] Email test endpoint returns success
- [ ] Push test endpoint returns success
- [ ] User has email in profile
- [ ] User has notification preferences enabled
- [ ] Push subscription exists in database
- [ ] Service worker is registered
- [ ] Browser notification permission is granted
- [ ] Environment variables are set in Vercel
- [ ] Resend domain is verified
- [ ] VAPID keys are generated and configured

## Production Testing

1. **Create a test reminder:**
   - Set time to 2-3 minutes in future
   - Enable all notification types

2. **Monitor Vercel logs:**
   - Look for `[Webhook]` messages
   - Check for `[Email]` and `[Push]` logs
   - Verify no errors

3. **Check sent_logs table:**
   - Verify entries are created
   - Check `status` and `success` fields
   - Review `error_message` if failed

4. **Verify delivery:**
   - Check email inbox
   - Check browser notifications
   - Check in-app notifications

