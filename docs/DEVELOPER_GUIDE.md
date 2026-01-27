# FollowUpTimer - Developer Guide

## System Architecture (1 Pager)

```
┌─────────────────────────────────────────────────────────────┐
│                      FOLLOWUPTIMER                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Next.js)                                          │
│  ├─ Dashboard: Create/manage reminders & contacts          │
│  ├─ Settings: Snooze prefs, tone, notifications            │
│  └─ Weekly Digest: Performance stats & insights            │
│                                                              │
│  API Layer (Next.js Routes)                                 │
│  ├─ /api/reminders - CRUD operations                       │
│  ├─ /api/snooze - Smart suggestions & scheduling           │
│  ├─ /api/events - Behavior tracking                        │
│  ├─ /api/digests/generate - Weekly summaries              │
│  ├─ /api/webhooks/stripe - Billing events                 │
│  └─ /api/webhooks/resend - Email tracking                │
│                                                              │
│  Background Jobs (Cron)                                     │
│  ├─ Daily: Check inactivity, expire trials, digest gen    │
│  └─ QStash Webhooks: Fire reminders at scheduled time     │
│                                                              │
│  Database (Supabase PostgreSQL)                             │
│  ├─ profiles: User settings & subscription                │
│  ├─ reminders: Scheduled follow-ups                        │
│  ├─ contacts: People being tracked                         │
│  ├─ user_snooze_preferences: Smart snooze config          │
│  ├─ weekly_digests: Sent summaries & stats               │
│  ├─ events: Behavior log (completed, snoozed, etc)       │
│  └─ billing_events: Stripe webhook log                    │
│                                                              │
│  Services (External)                                        │
│  ├─ QStash (Upstash): Schedule reminders                  │
│  ├─ Resend: Send emails & track opens                     │
│  ├─ Stripe: Payments & subscriptions                      │
│  └─ Auth: Supabase Auth (email/password)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Flow: User creates reminder → QStash schedules → Webhook fires →
Reminder email sent → User snoozes → Smart suggestions → Reschedule
```

---

## Environment Variables

### Core Setup
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key for client
- `SUPABASE_SERVICE_ROLE_KEY` - Service key for server (SECRET)
- `NEXT_PUBLIC_APP_URL` - Your app's public URL (production)

### Scheduling (QStash)
- `QSTASH_TOKEN` - QStash API token
- `QSTASH_CURRENT_SIGNING_KEY` - Current webhook signing key
- `QSTASH_NEXT_SIGNING_KEY` - Next signing key (rotation)
- `QSTASH_URL` - QStash endpoint (defaults to production)

### Email (Resend)
- `RESEND_API_KEY` - Resend API key
- `RESEND_FROM` - Sender email (must be verified)
- `RESEND_WEBHOOK_SECRET` - Email event webhook secret

### Payments (Stripe)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `STRIPE_PRICE_ID_PRO` - Pro plan price ID

### Cron Jobs
- `CRON_SECRET` - Vercel cron auth secret (optional)
- `DIGEST_CRON_SECRET` - Digest job secret (optional)

### Push Notifications (Optional)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Web push public key
- `VAPID_PRIVATE_KEY` - Web push private key
- `VAPID_EMAIL` - Contact email for web push

---

## Job Scheduler Overview

### Daily Cron Job (`/api/cron/daily`)

Runs once per day (midnight UTC), handles:

1. **Check Inactivity** - Mark inactive users, clean old data
2. **Expire Trials** - Set `subscription_status = 'expired'` for trial users
3. **Generate Digests** - Send weekly summaries to eligible users

### QStash Webhooks

When a reminder's scheduled time arrives:

1. QStash calls `/api/webhooks/qstash/remind`
2. System finds the reminder by QStash message ID
3. Sends email via Resend
4. Logs delivery status
5. Creates "reminder_sent" event

### Digest Scheduling

Weekly digest sent to user at their preference:
- Default: Monday 8:00 AM (user's timezone)
- Customizable in Settings
- Only sent if user has >= 1 reminder that week
- Idempotent (won't duplicate if cron runs twice)

---

## Webhook Event Mapping Table

### Stripe Webhooks (`/api/webhooks/stripe`)

| Event | Triggers | Action |
|-------|----------|--------|
| `customer.subscription.created` | New subscription | Set `subscription_status='active'`, store subscription ID |
| `customer.subscription.updated` | Plan/status change | Update subscription, adjust entitlements |
| `customer.subscription.deleted` | Cancellation | Set `subscription_status='canceled'` |
| `invoice.payment_succeeded` | Payment success | Log event, confirm subscription active |
| `invoice.payment_failed` | Payment failure | Set `subscription_status='past_due'` |

### Resend Webhooks (`/api/webhooks/resend`)

| Event | Triggers | Action |
|-------|----------|--------|
| `email.opened` | User opens email | Log open event, update send_log `opened_at` |
| `email.delivered` | Email arrives | Log delivery, update send_log `delivered_at` |
| `email.failed` | Delivery failure | Log failure, update send_log `failed_at` |
| `email.bounced` | Hard bounce | Log bounce, mark email as invalid |

### App Events (`/api/events`)

| Event Type | Logged When | Triggers |
|------------|------------|----------|
| `reminder_created` | User creates reminder | Popups via rules |
| `reminder_snoozed` | User snoozes reminder | Affirmation popup |
| `reminder_completed` | User marks complete | Affirmation popup |
| `contact_created` | User adds contact | Popups via rules |
| `contact_email_opened` | Digest email opened | Trust increase |

---

## Feature Flags & Definitions

| Flag | Default | Purpose |
|------|---------|---------|
| `is_premium` | false | Unlock PRO features (smart snooze, digests, etc.) |
| `is_trial` | false | Free trial user (auto-expires after 7 days) |
| `subscription_status` | 'free' | 'free', 'trialing', 'active', 'past_due', 'canceled' |
| Smart Suggestions | enabled | Toggle AI-powered snooze options (PRO) |
| Weekly Digest | enabled | Send weekly performance summary (PRO) |
| Auto Follow-up | enabled | Prompt to create next reminder (behavioral) |

---

## Known Issues & Workarounds

### 1. QStash Webhook Not Firing Locally
**Issue:** QStash can't reach localhost
**Workaround:** Use ngrok for local tunneling:
```bash
ngrok http 3000
# Set NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
```

### 2. Email Not Sending in Development
**Issue:** Resend API key not set
**Workaround:** Use test mode with `onboarding@resend.dev` sender

### 3. Cron Jobs Running Twice
**Issue:** Multiple requests hitting cron endpoint
**Workaround:** Check QStash logs, verify `DIGEST_CRON_SECRET` is set

### 4. Timezone Issues in Digests
**Issue:** User timezone not stored or incorrect
**Workaround:** Verify `profiles.timezone` is set via user signup flow

### 5. Push Notifications Not Working
**Issue:** VAPID keys missing or browser doesn't support Web Push
**Workaround:** HTTPS required (except localhost). Set VAPID keys in env.

---

## Release Notes Template

```markdown
# Version X.X.X - [Date]

## ✨ New Features
- Smart Snooze: AI suggests optimal follow-up times
- Weekly Digest: Performance summaries delivered Monday morning
- Contacts: Organize reminders by person

## 🐛 Bug Fixes
- Fixed quiet hours not respected on weekends
- Fixed double-counting reminders in digest stats
- Fixed timezone conversion for international users

## 🚀 Performance
- Reduced cron job execution time by 40%
- Optimized database queries for faster snooze suggestions
- Improved email delivery reliability

## 📚 Documentation
- Added API reference for developers
- Created video tutorial for onboarding

## 🔧 Technical
- Upgraded Supabase to v2
- Migrated to QStash v3 API
- Refactored event system for better reliability

## ⚠️ Breaking Changes
- Deprecated `/api/v1/reminders` endpoint (use `/api/reminders`)
- Changed snooze preference schema format

## 🙏 Thanks
Thanks to all beta testers for feedback!
```

---

## Quick Start for Developers

### 1. Clone & Install
```bash
git clone https://github.com/husnainally/followuptimer
cd followuptimer
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env.local
# Fill in Supabase, QStash, Resend, Stripe credentials
```

### 3. Run Database Migrations
```bash
npx supabase migration up
```

### 4. Start Dev Server
```bash
npm run dev
# Open http://localhost:3000
```

### 5. Test Cron Jobs
```bash
node scripts/test-cron.js
# Or use curl scripts in scripts/ folder
```

---

## Useful Commands

```bash
# Test cron jobs
npm run test:cron

# Test digest generation
node scripts/test-digest-generation.js

# View database in Supabase Studio
npm run db:studio

# Run full production test
node scripts/test-production-full.js

# Check Stripe webhook logs
# Visit /admin/webhooks
```

---

## Where to Find Code

- **Snooze Logic:** `lib/snooze-rules.ts`
- **Smart Suggestions:** `lib/snooze-suggestions.ts`
- **Digest Generation:** `lib/digest-scheduler.ts`, `lib/digest-stats.ts`
- **Webhook Handlers:** `app/api/webhooks/`
- **Cron Endpoints:** `app/api/cron/`
- **UI Components:** `components/dashboard/`, `components/settings/`

---

Need help? Check `docs/` folder for detailed guides on setup, deployment, and troubleshooting.
