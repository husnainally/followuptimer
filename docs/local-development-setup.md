# Local Development Setup with QStash

Complete guide for running FollowUpTimer locally with QStash for reminder scheduling.

## Prerequisites

1. Node.js 18+ installed
2. Supabase project set up
3. All environment variables configured

## Step 1: Install QStash CLI (if not already installed)

```bash
npm install -g @upstash/qstash-cli
```

## Step 2: Start Local QStash Server

```bash
npx @upstash/qstash-cli@latest dev
```

This will:
- Start QStash server at `http://127.0.0.1:8080`
- Generate local QStash credentials
- Display the tokens you need (save these!)

**Output example:**
```
QSTASH_TOKEN=eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=
QSTASH_CURRENT_SIGNING_KEY=sig_7kYjw48mhY7kAjqNGcy6cr29RJ6r
QSTASH_NEXT_SIGNING_KEY=sig_5ZB6DVzB1wjE8S6rZ7eenA8Pdnhs
```

## Step 3: Configure Environment Variables

Add to your `.env.local` file:

```env
# QStash Local Development
QSTASH_URL=http://127.0.0.1:8080
QSTASH_TOKEN=eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=
QSTASH_CURRENT_SIGNING_KEY=sig_7kYjw48mhY7kAjqNGcy6cr29RJ6r
QSTASH_NEXT_SIGNING_KEY=sig_5ZB6DVzB1wjE8S6rZ7eenA8Pdnhs

# App URL for local development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Other required variables...
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-key
RESEND_FROM=FollowUpTimer <no-reply@yourdomain.com>
```

**Important:** Replace the QStash tokens with the ones from your local QStash server output.

## Step 4: Start Development Server

```bash
npm run dev
```

Your app should now be running at `http://localhost:3000`

## Step 5: Test QStash Scheduling

### 5.1 Create a Test Reminder

1. Go to `http://localhost:3000/dashboard`
2. Create a new reminder
3. Set time to 1-2 minutes in the future
4. Check terminal logs for:
   ```
   [QStash] Scheduling reminder: {...}
   [QStash] Successfully scheduled: {...}
   ```

### 5.2 Check QStash Local Dashboard

The local QStash server provides a dashboard at:
- **Note:** Local QStash doesn't have a web dashboard, but you can check logs in the terminal where you started QStash

### 5.3 Wait for Reminder Time

1. Wait for the scheduled time
2. Check terminal for:
   ```
   [Webhook] Received request at: ...
   [Webhook] Processing reminder: ...
   ```
3. Verify notifications are sent

### 5.4 Test Manually (Bypass Scheduling)

Use the test endpoint to trigger immediately:

```bash
# Get a reminder ID first (from database or UI)
curl -X POST http://localhost:3000/api/reminders/test-send \
  -H "Content-Type: application/json" \
  -d '{"reminderId": "your-reminder-id"}'
```

## How It Works Locally

### Flow Diagram

```
1. Create Reminder → app/api/reminders/route.ts
   ↓
2. Schedule with QStash → lib/qstash.ts
   ↓
3. QStash Local Server (127.0.0.1:8080) receives schedule
   ↓
4. At scheduled time, QStash calls → http://localhost:3000/api/reminders/send
   ↓
5. Handler processes → app/api/reminders/send/route.ts
   ↓
6. Send notifications (email, push, in-app)
```

### Key Differences from Production

1. **No Signature Verification**: Local QStash doesn't require signature verification (disabled automatically)
2. **Localhost URLs**: Uses `http://localhost:3000` instead of production URL
3. **Faster Testing**: No need to wait for cloud QStash, everything is local
4. **Direct Webhooks**: QStash can call localhost directly (no ngrok needed)

## Troubleshooting

### Issue: "Cannot schedule reminder in the past"

**Cause:** Trying to schedule with a time that's already passed
**Fix:** Set reminder time to at least 1 second in the future

### Issue: "QStash scheduling skipped - missing: QSTASH_TOKEN"

**Cause:** QSTASH_TOKEN not set in `.env.local`
**Fix:** Add QSTASH_TOKEN from local QStash server output

### Issue: "QStash scheduling skipped - missing: NEXT_PUBLIC_APP_URL"

**Cause:** NEXT_PUBLIC_APP_URL not set
**Fix:** Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local`

### Issue: Webhook not being called

**Checklist:**
1. ✅ QStash server is running (`npx @upstash/qstash-cli@latest dev`)
2. ✅ QSTASH_URL is set to `http://127.0.0.1:8080`
3. ✅ Reminder was successfully scheduled (check logs)
4. ✅ Reminder time has passed
5. ✅ Next.js dev server is running

**Debug:**
```bash
# Check if webhook endpoint is accessible
curl -X POST http://localhost:3000/api/reminders/send \
  -H "Content-Type: application/json" \
  -d '{"reminderId": "test"}'
```

Should return 404 (reminder not found) - this means endpoint is accessible.

### Issue: Signature verification errors

**Cause:** Signature verification is enabled but shouldn't be for local QStash
**Fix:** Code automatically disables signature verification when QSTASH_URL contains localhost/127.0.0.1

## Testing Notification Types

### Email Notifications
1. Enable `email_notifications` in user settings
2. Create reminder
3. Wait for scheduled time
4. Check email inbox (or Resend dashboard)

### Push Notifications
1. Enable `push_notifications` in user settings
2. Click "Enable Browser Push Notifications" in settings
3. Grant browser permission
4. Create reminder
5. Wait for scheduled time
6. Verify push notification appears

### In-App Notifications
1. Enable `in_app_notifications` in user settings
2. Create reminder
3. Wait for scheduled time
4. Check notification bell icon for new notification

## Quick Test Script

Create a test reminder and trigger it immediately:

```bash
# 1. Create reminder (via UI or API)
# 2. Get reminder ID from response or database

# 3. Test immediately (bypasses QStash)
curl -X POST http://localhost:3000/api/reminders/test-send \
  -H "Content-Type: application/json" \
  -d '{"reminderId": "YOUR_REMINDER_ID"}'
```

## Environment Variable Reference

### Required for Local Development:

```env
# QStash (Local)
QSTASH_URL=http://127.0.0.1:8080
QSTASH_TOKEN=<from local qstash dev server>
QSTASH_CURRENT_SIGNING_KEY=<from local qstash dev server>
QSTASH_NEXT_SIGNING_KEY=<from local qstash dev server>

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Optional for testing)
RESEND_API_KEY=your-resend-key
RESEND_FROM=FollowUpTimer <no-reply@yourdomain.com>

# Push Notifications (Optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:your-email@example.com
```

## Production vs Local

| Feature | Local Development | Production |
|---------|------------------|------------|
| QStash URL | `http://127.0.0.1:8080` | `https://qstash.upstash.io` |
| App URL | `http://localhost:3000` | `https://yourdomain.com` |
| Signature Verification | Disabled | Enabled |
| Webhook URL | `http://localhost:3000/api/reminders/send` | `https://yourdomain.com/api/reminders/send` |
| Testing | Fast, instant | Real-time delays |

## Next Steps

After setting up local QStash:

1. ✅ Create test reminders
2. ✅ Verify scheduling works (check logs)
3. ✅ Test notification delivery
4. ✅ Verify all three notification types work
5. ✅ Test reminder editing and deletion
6. ✅ Test snooze and dismiss

Now you can develop and test reminders locally without deploying to production! 🎉

