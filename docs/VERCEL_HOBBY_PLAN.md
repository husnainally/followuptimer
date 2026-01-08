# Vercel Hobby Plan Configuration

This document explains how the cron jobs are configured to work within Vercel Hobby plan limitations.

## Hobby Plan Limitations

- **Maximum 2 cron jobs per account**
- **Can only trigger once per day**
- **Cannot assure timely execution** (1:00 am job can trigger anywhere between 1:00 am and 1:59 am)

## Our Solution

### 1. Combined Daily Cron Job

We've combined two daily jobs into one to stay within the 2-cron limit:

**Endpoint:** `/api/cron/daily`
- **Schedule:** `0 0 * * *` (daily at midnight UTC)
- **Handles:**
  - Check inactivity (logs `inactivity_detected` events)
  - Expire trials (expires trials that have passed their end date)

### 2. Check Missed Reminders

**Endpoint:** `/api/reminders/check-missed`
- **Schedule:** `0 0 * * *` (daily at midnight UTC)
- **Handles:** Finds reminders where `remind_at < now()` and `status = 'pending'`

**Additional Detection:**
Since we can only run this once per day, we also check for missed reminders:
- When a reminder is sent (checks for other missed reminders for that user)
- When user logs in (can be added to dashboard load)
- Via the daily cron job (catch-all)

This ensures missed reminders are detected even if the cron job runs late.

## Current Cron Jobs (2 total)

```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/reminders/check-missed",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## Helper Function

We've created a helper function `checkMissedRemindersForUser()` in `lib/check-missed-reminders.ts` that can be called from:
- Reminder send endpoint (after sending a reminder, check for other missed ones)
- User dashboard (when user loads dashboard)
- Any other user-triggered action

This provides additional coverage beyond the daily cron job.

## Upgrading to Pro Plan

If you upgrade to Vercel Pro plan, you can:
- Have up to 40 cron jobs per account
- Run cron jobs more frequently (every 15 minutes, hourly, etc.)
- Get more reliable execution timing

To take advantage of this, you can:
1. Split the daily cron job back into separate endpoints
2. Run check-missed reminders more frequently (every 15-30 minutes)
3. Add more scheduled tasks as needed

## Testing

Test the cron jobs using:
```bash
npm run test:cron
```

Or manually:
```bash
curl -X POST http://localhost:3000/api/cron/daily \
  -H "x-vercel-cron: 1"

curl -X POST http://localhost:3000/api/reminders/check-missed \
  -H "x-vercel-cron: 1"
```

## Environment Variables

Set in Vercel project settings:
- `CRON_SECRET` - Vercel will automatically add this to Authorization header

Optional (for backward compatibility):
- `MISSED_REMINDERS_CRON_SECRET`
- `INACTIVITY_CRON_SECRET`
- `DIGEST_CRON_SECRET`

## Notes

- Both cron jobs run at midnight UTC (may vary by ±59 minutes on Hobby plan)
- Missed reminders are also checked when reminders are sent, providing additional coverage
- The daily cron job combines inactivity and trial expiration to save on cron job quota

