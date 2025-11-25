# Production Deployment Guide

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Supabase Project** - Database with tables and migrations applied
3. **Upstash QStash Account** - For scheduled reminders
4. **Resend Account** - For email notifications

---

## Environment Variables

Configure these in Vercel Dashboard → Settings → Environment Variables:

### Supabase (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Settings → API
- Copy `URL`, `anon public`, and `service_role` keys

⚠️ **CRITICAL:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security - never expose to client!

### QStash (Required for Scheduled Notifications)
```bash
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=eyJVc2VySUQiOiI...
QSTASH_CURRENT_SIGNING_KEY=sig_...
QSTASH_NEXT_SIGNING_KEY=sig_...
```

**Where to find:**
- Go to [Upstash Console](https://console.upstash.com)
- Navigate to QStash
- Copy all credentials from the dashboard

### Resend (Required for Email Notifications)
```bash
RESEND_API_KEY=re_...
```

**Where to find:**
- Go to [Resend Dashboard](https://resend.com/api-keys)
- Create new API key
- Copy the key

### App URL (Required)
```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Set after first deployment:**
- Deploy your app first
- Get the Vercel URL (e.g., `https://followuptimer-rpvd.vercel.app`)
- Add this variable
- Redeploy to apply

---

## Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Production ready"
git push origin main
```

### 2. Import to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will detect Next.js automatically

### 3. Add Environment Variables
1. In Vercel dashboard → Settings → Environment Variables
2. Add all variables from the list above
3. Set for **Production**, **Preview**, and **Development** environments

### 4. Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Copy your deployment URL

### 5. Update App URL
1. Go back to Environment Variables
2. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL
3. Trigger a redeploy (Deployments → ⋯ → Redeploy)

---

## Database Migrations

Run these SQL migrations in Supabase SQL Editor:

### 1. Add Missing Fields
```sql
-- Run: supabase/migrations/20241121000001_add_missing_fields.sql
```

### 2. Create In-App Notifications Table
```sql
-- Run: supabase/migrations/20241121000002_add_in_app_notifications.sql
```

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy contents from migration file
4. Click "Run"
5. Repeat for second migration

---

## Testing Production

### 1. Create a Test Reminder
```bash
# Login to your production app
# Create a reminder with time 2 minutes in the future
```

### 2. Verify QStash Scheduling
```bash
# Check QStash console for scheduled message
# URL: https://console.upstash.com/qstash
```

### 3. Wait for Notification
- At scheduled time, webhook should trigger
- Check email inbox or in-app notifications
- Verify in Supabase `sent_logs` table

### 4. Check Logs
```bash
# View Vercel function logs
vercel logs --follow

# Or in Vercel dashboard:
# Your Project → Deployments → [latest] → Functions
```

---

## Troubleshooting

### Webhook 403 Error
**Issue:** QStash signature verification failing

**Solution:**
1. Verify `QSTASH_CURRENT_SIGNING_KEY` is set in Vercel
2. Ensure it matches your Upstash dashboard
3. Redeploy after setting variables

### Reminder Not Found
**Issue:** `SUPABASE_SERVICE_ROLE_KEY` not set

**Solution:**
1. Add service role key from Supabase Dashboard → API
2. Redeploy

### QStash Not Triggering
**Issue:** `NEXT_PUBLIC_APP_URL` is wrong

**Solution:**
1. Update to match your Vercel deployment URL
2. Must be `https://` (not `http://`)
3. Redeploy

### Email Not Sending
**Issue:** Resend API key invalid

**Solution:**
1. Verify `RESEND_API_KEY` in Vercel
2. Check Resend dashboard for errors
3. Ensure sending domain is verified

---

## Monitoring

### View Logs
```bash
# Real-time logs
vercel logs --follow

# Last 100 logs
vercel logs
```

### Check QStash Delivery
- Go to [Upstash Console](https://console.upstash.com/qstash)
- View message history and delivery status

### Check Email Delivery
- Go to [Resend Dashboard](https://resend.com/emails)
- View sent emails and delivery status

---

## Security Checklist

- ✅ QStash signature verification enabled
- ✅ Service role key never exposed to client
- ✅ All API routes protected with authentication
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ HTTPS enforced (automatic on Vercel)
- ✅ Environment variables secured in Vercel

---

## Local Development vs Production

| Feature                | Local Dev                    | Production    |
| ---------------------- | ---------------------------- | ------------- |
| QStash                 | Local CLI (`127.0.0.1:8080`) | Upstash Cloud |
| Signature Verification | Enabled                      | Enabled       |
| Logging                | Verbose                      | Errors only   |
| Service Role           | Required                     | Required      |
| App URL                | `localhost:3000`             | Vercel URL    |

---

## Support

If you encounter issues:

1. Check Vercel function logs
2. Verify all environment variables are set
3. Test webhook manually: `curl -X POST https://your-app.vercel.app/api/reminders/send -H "Content-Type: application/json" -d '{"reminderId":"test-id"}'`
4. Check Supabase logs for database errors
5. Verify QStash dashboard for delivery failures

---

## Quick Reference

**Vercel Dashboard:** `https://vercel.com/dashboard`
**Supabase Dashboard:** `https://supabase.com/dashboard`
**Upstash Console:** `https://console.upstash.com`
**Resend Dashboard:** `https://resend.com/dashboard`

**Redeploy Command:**
```bash
vercel --prod
```

**View Production Logs:**
```bash
vercel logs --follow
```
