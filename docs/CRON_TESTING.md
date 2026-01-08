# Cron Jobs Testing Guide

This guide explains how to test cron jobs locally before deploying to production.

## Quick Start

### Option 1: Using Node.js Script (Recommended)

```bash
npm run test:cron
```

Or directly:
```bash
node scripts/test-cron.js
```

The script will:
- Prompt you for your app URL (default: http://localhost:3000)
- Let you choose authentication method
- Test all cron endpoints
- Show detailed results

### Option 2: Using curl Script

```bash
bash scripts/test-cron-curl.sh
```

Or with custom URL:
```bash
bash scripts/test-cron-curl.sh http://localhost:3000
```

## Authentication Methods

The cron endpoints support multiple authentication methods:

### 1. Vercel Cron Header (Default)
```bash
# Uses x-vercel-cron: 1 header
curl -X POST http://localhost:3000/api/reminders/check-missed \
  -H "x-vercel-cron: 1"
```

### 2. CRON_SECRET (Vercel Production)
```bash
# Vercel automatically adds this in production
export CRON_SECRET="your-secret"
curl -X POST http://localhost:3000/api/reminders/check-missed \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 3. Custom Secrets (Per Endpoint)
```bash
# Each endpoint can have its own secret
export MISSED_REMINDERS_CRON_SECRET="your-secret"
export INACTIVITY_CRON_SECRET="your-secret"
export DIGEST_CRON_SECRET="your-secret"

curl -X POST http://localhost:3000/api/reminders/check-missed \
  -H "Authorization: Bearer $MISSED_REMINDERS_CRON_SECRET"
```

### 4. No Authentication (Development)
```bash
# If no secrets are configured, endpoints allow unauthenticated requests
curl -X POST http://localhost:3000/api/reminders/check-missed
```

## Testing Individual Endpoints

### 1. Check Missed Reminders
```bash
curl -X POST http://localhost:3000/api/reminders/check-missed \
  -H "x-vercel-cron: 1" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Missed reminders check completed",
  "total": 0,
  "processed": 0,
  "errors": 0
}
```

### 2. Check Inactivity
```bash
curl -X POST http://localhost:3000/api/events/check-inactivity \
  -H "x-vercel-cron: 1" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Inactivity check completed",
  "total": 1,
  "processed": 0,
  "errors": 0
}
```

### 3. Daily Cron (Combined: Inactivity + Expire Trials)
```bash
curl -X POST http://localhost:3000/api/cron/daily \
  -H "x-vercel-cron: 1" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Daily cron job completed",
  "results": {
    "inactivity": {
      "processed": 0,
      "errors": 0
    },
    "trials": {
      "expired": 0,
      "succeeded": 0,
      "failed": 0
    }
  }
}
```

**Note:** This is a combined endpoint for Hobby plan (only 2 cron jobs allowed). It handles both inactivity detection and trial expiration.

### 4. Generate Digests
```bash
curl -X POST http://localhost:3000/api/digests/generate \
  -H "x-vercel-cron: 1" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Digest generation completed",
  "total": 0,
  "sent": 0,
  "errors": 0,
  "skipped": 0
}
```

## Environment Variables

Set these in your `.env.local` file for testing:

```env
# Vercel-style authentication (used in production)
CRON_SECRET=your-vercel-cron-secret

# Optional: Custom secrets per endpoint
MISSED_REMINDERS_CRON_SECRET=your-missed-reminders-secret
INACTIVITY_CRON_SECRET=your-inactivity-secret
DIGEST_CRON_SECRET=your-digest-secret
```

## Prerequisites

Before testing, make sure:

1. ✅ Development server is running:
   ```bash
   npm run dev
   ```

2. ✅ Database migrations are applied:
   ```bash
   # Check Supabase migrations are up to date
   ```

3. ✅ Environment variables are set (optional):
   ```bash
   # Copy .env.example to .env.local and fill in values
   ```

## Troubleshooting

### Error: "Unauthorized"
- Check that you're using the correct authentication method
- Verify environment variables are set correctly
- In development, you can use `x-vercel-cron: 1` header without secrets

### Error: "Connection refused"
- Make sure your development server is running
- Check the URL is correct (default: http://localhost:3000)

### Error: "No missed reminders found"
- This is normal if there are no overdue reminders
- Create a test reminder with `remind_at` in the past to test

### Error: "No users found"
- This is normal if there are no users in the database
- Create a test user to test inactivity detection

## Production Testing

In production (Vercel), cron jobs are automatically configured via `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/reminders/check-missed",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/events/check-inactivity",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/expire-trials",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Vercel will:
1. Automatically call these endpoints at scheduled times
2. Add `CRON_SECRET` to the `Authorization` header
3. Log execution in Vercel dashboard

## Monitoring

Check cron job execution in:
- **Vercel Dashboard**: Settings → Cron Jobs
- **Function Logs**: Vercel Dashboard → Functions → Logs
- **Application Logs**: Check your logging service

## Schedule Reference

- `*/15 * * * *` - Every 15 minutes
- `0 0 * * *` - Daily at midnight (UTC)
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight

For more cron schedule examples, see: https://crontab.guru/

