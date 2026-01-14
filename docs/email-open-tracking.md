# Email Open Tracking via Resend Webhooks

This guide explains how email open tracking works in FollowUpTimer using Resend webhooks instead of browser extensions.

## Overview

When a reminder email is sent to a contact, Resend tracks when the recipient opens the email. When they open it, Resend sends a webhook to our app, which:

1. Logs an `email_opened` event
2. Updates the contact's `last_interaction_at` timestamp
3. Triggers a popup notification: "Your email to {contact} was opened {time} ago"

## Architecture

### 1. Email Sending Flow

```typescript
// When sending a reminder email
sendReminderEmail({
  to: "contact@example.com",
  subject: "⏰ Reminder",
  message: "Follow up with project",
  affirmation: "You've got this!",
  userId: "user-uuid",
  contactId: "contact-uuid",
  reminderId: "reminder-uuid",
})
```

**What happens:**
- Email is sent via Resend API
- Resend returns an email ID (e.g., `re_abc123...`)
- We store this metadata in `sent_emails` table:
  ```sql
  INSERT INTO sent_emails (
    user_id,
    contact_id,
    reminder_id,
    resend_email_id,
    recipient_email,
    email_type,
    sent_at
  ) VALUES (...)
  ```

### 2. Email Open Detection

When the recipient opens the email:
- Resend tracks the open event
- Resend sends webhook POST to `/api/webhooks/resend`
- Webhook payload:
  ```json
  {
    "type": "email.opened",
    "data": {
      "email_id": "re_abc123...",
      "created_at": "2026-01-14T10:30:00Z"
    }
  }
  ```

### 3. Webhook Processing

The webhook handler ([app/api/webhooks/resend/route.ts](app/api/webhooks/resend/route.ts)):

1. **Verifies signature** using `RESEND_WEBHOOK_SECRET`
2. **Looks up email** by `resend_email_id` in `sent_emails` table
3. **First open only** - Ignores subsequent opens (tracks first open only)
4. **Updates database:**
   - Sets `opened_at` timestamp
   - Sets `opened_count` to 1
   - Updates contact's `last_interaction_at`
5. **Logs event:**
   ```typescript
   logEvent({
     eventType: "email_opened",
     eventData: {
       email_id: "re_abc123...",
       contact_name: "John Doe",
       opened_at: "2026-01-14T10:30:00Z"
     }
   })
   ```
6. **Creates popup** with message:
   > "Your email to John Doe was opened 5 minutes ago."

## Database Schema

### `sent_emails` Table

```sql
CREATE TABLE sent_emails (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID,
  reminder_id UUID,
  resend_email_id TEXT NOT NULL UNIQUE,  -- Resend email ID
  recipient_email TEXT NOT NULL,
  email_type TEXT DEFAULT 'reminder',    -- 'reminder', 'digest', etc.
  sent_at TIMESTAMP NOT NULL,
  opened_at TIMESTAMP,                   -- NULL if never opened
  opened_count INTEGER DEFAULT 0,        -- Always 0 or 1 (first open only)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `resend_email_id` (for webhook lookups)
- `user_id` (for user queries)
- `contact_id` (for contact analytics)
- `opened_at` (for open rate analytics)

## Setup Instructions

### 1. Apply Database Migration

Run the migration in Supabase SQL Editor:
```bash
supabase/migrations/20250114000000_email_open_tracking.sql
```

### 2. Configure Resend Webhook

1. Go to [Resend Dashboard](https://resend.com/webhooks)
2. Click **Create Webhook**
3. Configure:
   - **Endpoint URL:** `https://your-app.vercel.app/api/webhooks/resend`
   - **Events:** Select `email.opened`
   - **Status:** Active
4. Copy the **Signing Secret** (starts with `whsec_`)

### 3. Add Environment Variable

In Vercel Dashboard → Settings → Environment Variables:
```bash
RESEND_WEBHOOK_SECRET=whsec_...
```

Deploy or redeploy your app.

### 4. Test the Webhook

Send a test reminder email:
```bash
curl -X POST https://your-app.vercel.app/api/reminders/test-send \
  -H "Content-Type: application/json" \
  -d '{"reminderId": "your-reminder-uuid"}'
```

Open the email, then check:
- Vercel logs for `[Resend Webhook] Email marked as opened`
- Supabase `sent_emails` table for `opened_at` timestamp
- Dashboard for popup notification

## API Endpoints

### POST `/api/webhooks/resend`

Receives webhook events from Resend.

**Headers:**
- `svix-signature` or `resend-signature`: Webhook signature
- `Content-Type`: `application/json`

**Body:**
```json
{
  "type": "email.opened",
  "data": {
    "email_id": "re_abc123...",
    "created_at": "2026-01-14T10:30:00Z"
  }
}
```

**Response:**
```json
{
  "received": true
}
```

## Event Flow Diagram

```
1. User creates reminder → 2. Reminder triggers → 3. Email sent via Resend
                                                           ↓
                                                    Store email_id in DB
                                                           ↓
4. Recipient opens email → 5. Resend webhook fires → 6. POST /api/webhooks/resend
                                                           ↓
                                                    Verify signature
                                                           ↓
                                                    Look up email in DB
                                                           ↓
                                          Update opened_at + last_interaction_at
                                                           ↓
                                              Log email_opened event
                                                           ↓
                                          Create popup: "Email was opened"
```

## Analytics Queries

### Email Open Rate
```sql
SELECT
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) * 100.0 / COUNT(*) AS open_rate
FROM sent_emails
WHERE user_id = 'your-user-id'
  AND email_type = 'reminder'
  AND sent_at >= NOW() - INTERVAL '30 days';
```

### Contact Engagement
```sql
SELECT
  c.name,
  COUNT(se.id) AS emails_sent,
  COUNT(se.opened_at) AS emails_opened,
  MAX(se.opened_at) AS last_opened
FROM contacts c
LEFT JOIN sent_emails se ON se.contact_id = c.id
WHERE c.user_id = 'your-user-id'
GROUP BY c.id, c.name
ORDER BY emails_sent DESC;
```

### Recent Opens
```sql
SELECT
  c.name AS contact_name,
  se.sent_at,
  se.opened_at,
  EXTRACT(EPOCH FROM (se.opened_at - se.sent_at)) / 60 AS minutes_to_open
FROM sent_emails se
JOIN contacts c ON c.id = se.contact_id
WHERE se.user_id = 'your-user-id'
  AND se.opened_at IS NOT NULL
ORDER BY se.opened_at DESC
LIMIT 20;
```

## Tracking Behavior

### What We Track
- ✅ **First email open only** - Subsequent opens are ignored
- ✅ **Reminder emails only** - Digest/waitlist emails not tracked (configurable)
- ✅ **Contact interaction** - Updates `last_interaction_at`
- ✅ **Event logging** - Creates `email_opened` event
- ✅ **Popup trigger** - Shows notification to user

### What We Don't Track
- ❌ Multiple opens per email (only first)
- ❌ Email clicks (Resend limitation)
- ❌ Forward/reply actions (requires extension)

## Security

### Webhook Verification
- Uses HMAC SHA256 signature verification
- Checks timestamp to prevent replay attacks (5-minute window)
- Rejects webhooks with invalid signatures

### Database Security
- Row Level Security (RLS) enabled on `sent_emails`
- Users can only view their own sent emails
- Service role required for webhook updates

## Troubleshooting

### Webhook not receiving events
1. Check Resend Dashboard → Webhooks → Deliveries
2. Verify webhook URL is correct (includes `/api/webhooks/resend`)
3. Check webhook is active and `email.opened` event is selected
4. Check Vercel logs for webhook errors

### Email opens not tracked
1. Verify `RESEND_WEBHOOK_SECRET` is set in Vercel
2. Check `sent_emails` table has entry for email
3. Check Resend Dashboard → Emails → View email → Opens
4. Verify email was actually opened (not just sent)

### Signature verification fails
1. Verify `RESEND_WEBHOOK_SECRET` matches Resend dashboard
2. Check Vercel logs for signature details
3. Test with `NODE_ENV=development` to bypass verification

### Contact not updated
1. Check email has `contact_id` in `sent_emails` table
2. Verify contact exists and belongs to user
3. Check Vercel logs for contact update errors

## Future Enhancements

Potential improvements:
1. Track multiple opens (engagement analytics)
2. Track email clicks (requires Resend Pro)
3. Track digest/waitlist email opens
4. Email open heatmap (day/time analytics)
5. Predictive engagement scoring
6. A/B test subject lines based on open rates

## Related Documentation

- [Popup System](./milestone1-event-system.md) - How popups are triggered
- [Event System](./milestone1-event-system.md) - Event logging architecture
- [Deployment Guide](./DEPLOYMENT.md) - Environment setup
- [Notification System](./NOTIFICATION-FIXES.md) - Email sending

## Code References

- **Email sending:** [lib/email.ts](../lib/email.ts)
- **Webhook handler:** [app/api/webhooks/resend/route.ts](../app/api/webhooks/resend/route.ts)
- **Migration:** [supabase/migrations/20250114000000_email_open_tracking.sql](../supabase/migrations/20250114000000_email_open_tracking.sql)
- **Event system:** [lib/events.ts](../lib/events.ts)
- **Popup engine:** [lib/popup-engine.ts](../lib/popup-engine.ts)
