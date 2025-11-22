# QStash Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Reminders Not Sending at Scheduled Time

#### Check 1: QStash Configuration
```bash
# Verify environment variables are set
echo $QSTASH_TOKEN
echo $NEXT_PUBLIC_APP_URL
```

**Solution:**
- Ensure `QSTASH_TOKEN` is set in your environment
- Ensure `NEXT_PUBLIC_APP_URL` is set to a publicly accessible URL
- For local development, use ngrok or similar to expose localhost

#### Check 2: Reminder Time is in the Future
Use the debug endpoint:
```bash
GET /api/reminders/debug?reminderId=your-reminder-id
```

**Solution:**
- Ensure `remind_at` is in the future
- Check timezone issues (all times should be in UTC)

#### Check 3: QStash Message Scheduled
Check QStash dashboard: https://console.upstash.com/qstash

**Solution:**
- Verify message appears in QStash dashboard
- Check message status (pending, delivered, failed)
- Review delivery logs

### Issue 2: Webhook Not Receiving Requests

#### Check 1: URL Accessibility
```bash
# Test if your webhook URL is accessible
curl https://your-app-url.com/api/reminders/send
```

**Solution:**
- URL must be publicly accessible (not localhost)
- Must use HTTPS in production
- Check firewall/security settings

#### Check 2: Signature Verification
Check server logs for signature verification errors.

**Solution:**
- Ensure `QSTASH_CURRENT_SIGNING_KEY` is set
- Ensure `QSTASH_NEXT_SIGNING_KEY` is set (for key rotation)
- Keys must match your QStash dashboard

### Issue 3: Notifications Not Sending

#### Check 1: User Preferences
Use debug endpoint to check preferences:
```bash
GET /api/reminders/debug?reminderId=your-reminder-id
```

**Solution:**
- Ensure at least one notification preference is enabled:
  - `email_notifications`
  - `push_notifications`
  - `in_app_notifications`
- If all are disabled, system falls back to reminder's `notification_method`

#### Check 2: Test Notifications Manually
Use the test endpoint:
```bash
POST /api/reminders/test-send
Body: { "reminderId": "your-reminder-id" }
```

**Solution:**
- This bypasses QStash and sends notifications immediately
- Useful for testing notification delivery
- Check response for which notifications succeeded/failed

### Issue 4: Development Mode Issues

#### Problem: QStash doesn't work with localhost

**Solution 1: Use ngrok**
```bash
# Install ngrok
npm install -g ngrok

# Expose localhost
ngrok http 3000

# Use the ngrok URL in NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
```

**Solution 2: Skip QStash in Development**
- Reminders will be created but not scheduled
- Use test endpoint to manually trigger: `/api/reminders/test-send`

### Issue 5: Reminder Scheduled in Past

#### Symptoms:
- Reminder created but never sent
- QStash error: "Cannot schedule in the past"

**Solution:**
- Check timezone settings
- Ensure `remind_at` is in UTC
- Validate time before creating reminder

## Debug Endpoints

### 1. Debug Reminder Status
```bash
GET /api/reminders/debug?reminderId=uuid
```

Returns:
- QStash configuration status
- Reminder details
- Time calculations
- User preferences

### 2. Test Send Notifications
```bash
POST /api/reminders/test-send
Content-Type: application/json

{
  "reminderId": "uuid"
}
```

Immediately sends all enabled notifications (bypasses QStash).

## Step-by-Step Debugging

### Step 1: Check Configuration
```bash
GET /api/reminders/debug
```

Verify:
- ✅ `QSTASH_TOKEN` is set
- ✅ `NEXT_PUBLIC_APP_URL` is set and accessible
- ✅ Environment is correct

### Step 2: Create Test Reminder
1. Create reminder with time 2 minutes in future
2. Check console for QStash scheduling logs
3. Verify reminder has `qstash_message_id` in database

### Step 3: Check QStash Dashboard
1. Go to https://console.upstash.com/qstash
2. Find your message
3. Check status and delivery logs

### Step 4: Test Notifications Manually
```bash
POST /api/reminders/test-send
{ "reminderId": "your-reminder-id" }
```

This verifies:
- ✅ Notification preferences are read correctly
- ✅ Email service works
- ✅ Push notifications work
- ✅ In-app notifications work

### Step 5: Check Server Logs
Look for:
- `[QStash] Scheduling reminder:` - Confirms scheduling attempt
- `[QStash] Message scheduled successfully:` - Confirms success
- `[QStash] Scheduling failed:` - Shows error details
- `[Webhook] Received request at:` - Confirms webhook received

## Common Error Messages

### "Cannot schedule reminder in the past"
**Cause:** `remind_at` time is before current time
**Fix:** Ensure reminder time is in the future

### "QStash scheduling skipped - missing: QSTASH_TOKEN"
**Cause:** Environment variable not set
**Fix:** Add `QSTASH_TOKEN` to `.env.local`

### "QStash scheduling skipped - missing: NEXT_PUBLIC_APP_URL"
**Cause:** App URL not configured
**Fix:** Set `NEXT_PUBLIC_APP_URL` to your public URL

### "invalid destination url: endpoint resolves to a loopback address"
**Cause:** Trying to use localhost with QStash
**Fix:** Use ngrok or deploy to production

### "No push subscriptions found for user"
**Cause:** User hasn't enabled push notifications
**Fix:** User needs to enable push in settings

### "No email address found for user"
**Cause:** User profile missing email
**Fix:** Ensure user has email in profile

## Production Checklist

Before deploying:
- [ ] `QSTASH_TOKEN` is set
- [ ] `NEXT_PUBLIC_APP_URL` is set to production URL
- [ ] `QSTASH_CURRENT_SIGNING_KEY` is set
- [ ] `QSTASH_NEXT_SIGNING_KEY` is set (optional, for rotation)
- [ ] Webhook URL is publicly accessible
- [ ] HTTPS is enabled
- [ ] Test reminder creation
- [ ] Verify QStash dashboard shows scheduled messages
- [ ] Test notification delivery

## Getting Help

If issues persist:
1. Check server logs for detailed error messages
2. Use debug endpoint to verify configuration
3. Test notifications manually with test endpoint
4. Check QStash dashboard for message status
5. Verify all environment variables are set correctly

