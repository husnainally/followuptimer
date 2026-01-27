# FollowUpTimer – Internal / Dev Support Cheatsheet

## System Architecture (1 Pager)
- Next.js App Router for UI + API routes (auth, reminders, contacts, settings, admin)
- Supabase Postgres: profiles, reminders, contacts, user_snooze_preferences, events (reminder_snoozed/completed), weekly_digests, billing_events
- Services: Upstash QStash (schedule + deliver via webhooks), Resend (email send + opens), Stripe (billing), Supabase Auth
- Flow: Create reminder → schedule via QStash → `/api/webhooks/qstash/remind` fires → Resend sends email → delivery/open logged → user snoozes/completes → timelines and analytics update

## Architecture Notes
- Boundaries: UI (app/*) → API routes (app/api/*) → domain logic (lib/*) → data layer (Supabase) → external services (QStash/Resend/Stripe)
- Scheduling: QStash holds time-based jobs; reminders carry qstash_message_id for correlation and replay
- Suppression: Snooze/quiet-hours/DND evaluated in lib/snooze-rules.ts and lib/reminder-suppression.ts before sending
- Idempotency: Digest and reminder handlers log events (weekly_digests, events) to avoid duplicates; webhook signing keys are enforced
- Auth: Supabase Auth (JWT) on client; server uses service role for privileged operations; admin endpoints gated separately
- Deployment: Vercel (app + API). Webhook endpoints must be reachable publicly; set NEXT_PUBLIC_APP_URL accordingly

## Environment Variables (Core)
- Supabase: NEXT_PUBLIC_SUPABASE_URL (client), NEXT_PUBLIC_SUPABASE_ANON_KEY (client), SUPABASE_SERVICE_ROLE_KEY (server)
- App URL: NEXT_PUBLIC_APP_URL (used in email links, webhooks, QStash callback base)
- QStash: QSTASH_TOKEN (API auth), QSTASH_CURRENT_SIGNING_KEY + QSTASH_NEXT_SIGNING_KEY (webhook verify/rotation), QSTASH_URL (override endpoint)
- Resend: RESEND_API_KEY (send), RESEND_FROM (verified sender), RESEND_WEBHOOK_SECRET (event verification)
- Stripe: STRIPE_SECRET_KEY (API), STRIPE_WEBHOOK_SECRET (verify), STRIPE_PRICE_ID_PRO (billing plan)
- Cron/Auth: CRON_SECRET, DIGEST_CRON_SECRET (gate cron/digest endpoints)
- Push (opt): NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL

## Job Scheduler Overview
- Daily cron `/api/cron/daily`: cleans inactive users/events, expires trials, enqueues weekly digest generation per profile
- Reminder delivery `/api/webhooks/qstash/remind`: fetch reminder by QStash message id → send via Resend → log `reminder_sent` event → apply suppression rules (quiet hours/DND) before rescheduling
- Weekly digest: user-configurable window; default Monday 08:00 user TZ; skips if no reminder activity; uses weekly_digests log for idempotency

## Webhook Event Mapping
- Stripe `/api/webhooks/stripe`: subscription create/update/delete; invoice success/fail → updates `subscription_status` + writes billing_events for audit
- Resend `/api/webhooks/resend`: delivered/opened/failed/bounced → update send logs + trust/audit; bounce/failed can mark email invalid
- App events `/api/events`: reminder_created/snoozed/completed, contact_created, contact_email_opened → drive affirmations, analytics, and UI timelines

## Feature Flags / Entitlements
- Plan fields: is_premium, is_trial, subscription_status (`free`, `trialing`, `active`, `past_due`, `canceled`)
- Toggles: Smart Suggestions (snooze engine), Weekly Digest, Auto follow-up prompts, Tone variants, Reminder volume limits; guarded via `lib/entitlements` and `hooks/use-plan`

## Data Model Quick Reference (Supabase)
- profiles: id, email, timezone, plan_type, subscription_status, trial_ends_at
- reminders: id, user_id, contact_id, scheduled_at, status (pending/sent/snoozed/completed), qstash_message_id
- contacts: id, user_id, name, email, relationship, last_contacted_at
- user_snooze_preferences: working_hours_start/end, quiet_hours_start/end, working_days, allow_weekends, follow_up_cadence, smart_suggestions_enabled
- events: id, user_id, type (reminder_created/snoozed/completed, contact_created, contact_email_opened), metadata jsonb, created_at
- weekly_digests: id, user_id, sent_at, stats jsonb, delivery_status
- billing_events: id, user_id, stripe_event, status, payload

## Code Pointers (where to look)
- Snooze + quiet hours logic: lib/snooze-rules.ts, lib/smart-snooze-engine.ts
- Reminder scheduling + suppression: lib/reminder-suppression.ts, lib/followup-creation.ts
- QStash client and verification: lib/qstash.ts; webhook handler: app/api/webhooks/qstash/remind/route.ts
- Digest generation: lib/digest-scheduler.ts, lib/digest-stats.ts; endpoint app/api/cron/daily/route.ts
- Email templates + send: lib/email.ts, lib/notification/ (if present), Resend webhook handler app/api/webhooks/resend/route.ts
- Entitlements/limits: lib/entitlements.ts, lib/usage-metering.ts, hooks/use-plan.ts
- Stripe billing: app/api/webhooks/stripe/route.ts, lib/billing/*
- UI entry points: components/dashboard/*, components/settings/*, components/reminder/*

## Runbooks (common ops)
- Replay a reminder: find reminder by qstash_message_id → POST to `/api/webhooks/qstash/remind` with same payload; ensure suppression rules allow send
- Force-send a digest: call digest generator for a user (see lib/digest-scheduler.ts helper) or hit `/api/cron/daily` with CRON_SECRET in a controlled env
- Rotate QStash signing keys: add new key to QSTASH_NEXT_SIGNING_KEY, keep current in QSTASH_CURRENT_SIGNING_KEY, deploy, then promote next to current after Upstash rotation
- Mark email invalid after bounce: handled in Resend webhook; to force, update contact email flags and clear pending reminders for that contact if needed
- Promote plan manually: use admin endpoint /api/admin/plans (see lib/entitlements) with target_user_id and desired plan_type/subscription_status

## Testing & Local Dev Notes
- Local webhooks: use ngrok; set NEXT_PUBLIC_APP_URL to tunnel URL so QStash/Resend/Stripe callbacks resolve
- Seeds/fixtures: use Supabase SQL editor; create test users and set profiles.plan_type/subscription_status for FREE/PRO/trial scenarios
- Quiet hours/working hours: adjust user_snooze_preferences to cover overnight spans to validate suppression
- Timezone checks: set profiles.timezone to non-UTC (e.g., "America/New_York") and verify digest/reminder scheduling
- Rate/volume limits: use canUseFeature in lib/usage-metering.ts to confirm blocking behavior under load tests

## Monitoring & Debugging
- Logs: check Vercel function logs for cron/webhooks; confirm QStash delivery logs when reminders are missing
- Email health: Resend dashboard for bounce/fail rates; verify RESEND_WEBHOOK_SECRET matches
- Billing: Stripe dashboard → webhook logs; ensure STRIPE_WEBHOOK_SECRET matches deployed value
- Metrics to watch: reminder_sent vs reminder_failed, digest_sent, bounce rate, duplicate cron hits, timezone-related reschedules

## Request / Data Flows (quick)
- Reminder creation: UI posts to /api/reminders → stores reminder → schedules QStash message (qstash_message_id saved)
- Reminder delivery: QStash → /api/webhooks/qstash/remind → suppression check → send via Resend → record events + update reminder status
- Snooze action: UI/API updates reminder; engine recalculates next slot respecting working hours, quiet hours, weekends
- Digest: /api/cron/daily enqueues/executes digest per user → writes weekly_digests; email via Resend; idempotent by log
- Billing: Stripe → /api/webhooks/stripe → update profiles.subscription_status + billing_events; entitlements reflect on next request

## Known Issues + Workarounds
- QStash cannot reach localhost → tunnel (ngrok) and set NEXT_PUBLIC_APP_URL to the tunnel origin
- Emails fail in dev → use Resend test sender `onboarding@resend.dev`; confirm RESEND_API_KEY set
- Cron double-run → ensure single QStash schedule and set DIGEST_CRON_SECRET; check logs for duplicate hits
- Timezone mismatches → make sure profiles.timezone is captured in onboarding; fall back to UTC only as last resort
- Push not working → generate VAPID keys; requires HTTPS (or localhost); ensure browser supports Web Push

## Release Notes Template
```
# Version X.Y.Z - YYYY-MM-DD

## New
- (features and user-facing changes)

## Fixes
- (bugs and regressions)

## Performance/Tech
- (perf, infra, refactors, dependency bumps)

## Breaking
- (required migrations, API changes, env var changes)
```

## Practical Notes (distilled from other guides)
- Local setup: copy .env.example → .env.local; fill Supabase/Resend/QStash/Stripe; run `npm run dev`; ensure NEXT_PUBLIC_APP_URL points to your running host (or tunnel) so webhooks work.
- Cron/QStash: daily cron expects CRON_SECRET; qstash webhook must be public. If jobs double-fire, verify single schedule and signing keys; replay by POSTing to `/api/webhooks/qstash/remind` with original payload and signature if testing.
- Email/Resend: verify sending domain and RESEND_FROM; use Resend test sender in dev. Open tracking uses Resend webhooks; ensure RESEND_WEBHOOK_SECRET matches. Email preview lives in docs/email-preview.html if you need to eyeball rendering.
- Push/web push: generate VAPID keys, set NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_EMAIL; requires HTTPS (or localhost). Service worker registration handled in components/service-worker-register.tsx; check push-subscription fixes if subs stall.
- Testing focus: run manual regression on reminders (create/snooze/complete), digest send, webhook paths (Resend/Stripe/QStash), quiet-hours suppression, timezones (non-UTC), and plan gating (FREE vs PRO/trial). Production checklist includes domain/email DNS, env parity, and webhook secrets.
- Notifications/popups: popups obey cooldowns; if missing, check notification-debugging and popup-cooldown fixes. Ensure bundle/window settings in user_snooze_preferences match expectations when multiple reminders cluster.
- Deploy: Vercel hobby limits cold starts and cron frequency; keep cron endpoints cheap. Set envs in Vercel dashboard; update NEXT_PUBLIC_APP_URL to production URL; confirm webhook secrets after deploy.
