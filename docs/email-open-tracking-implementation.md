# Email Open Tracking Implementation Summary

## Overview

Successfully implemented email open tracking via Resend webhooks, replacing the need for browser extensions. When a reminder email is sent and opened by the recipient, the system automatically logs the open event, updates contact interaction data, and triggers a popup notification to the user.

## Implementation Details

### 1. Database Schema ✅

**File:** `supabase/migrations/20250114000000_email_open_tracking.sql`

Created `sent_emails` table to store email metadata:
- `resend_email_id` - Unique Resend email identifier
- `user_id`, `contact_id`, `reminder_id` - Relationship tracking
- `recipient_email` - Email address
- `email_type` - Type of email (reminder, digest, waitlist)
- `sent_at`, `opened_at`, `opened_count` - Timing and tracking data

**Indexes:**
- Fast webhook lookups by `resend_email_id`
- User queries by `user_id`
- Contact analytics by `contact_id`
- Open rate queries by `opened_at`

**Security:**
- Row Level Security (RLS) enabled
- Users can only view their own sent emails
- Service role policy for webhook updates

### 2. Email Sending Enhancement ✅

**File:** `lib/email.ts`

Modified `sendReminderEmail` function to:
- Accept `contactId` and `reminderId` parameters
- Store Resend email ID in database after successful send
- Non-blocking tracking (doesn't fail email if tracking fails)
- Logs success/failure for debugging

**Updated callers:**
- `app/api/reminders/send/route.ts` - Main reminder sending
- `app/api/reminders/process-overdue/route.ts` - Overdue reminders
- `app/api/reminders/test-send/route.ts` - Test endpoint

### 3. Webhook Endpoint ✅

**File:** `app/api/webhooks/resend/route.ts`

Created secure webhook handler that:
- **Verifies signatures** using HMAC SHA256
- **Prevents replay attacks** with 5-minute timestamp window
- **Looks up email metadata** from `sent_emails` table
- **Tracks first open only** - ignores subsequent opens
- **Updates contact** `last_interaction_at` timestamp
- **Logs event** via event system (`email_opened`)
- **Triggers popup** notification to user
- **Returns 200** to acknowledge receipt (prevents retries)

**Supported events:**
- `email.opened` - Fully implemented
- `email.delivered`, `email.bounced`, `email.complained` - Logged but not handled (future)

### 4. Documentation ✅

**Files:**
- `docs/email-open-tracking.md` - Comprehensive feature guide
- `docs/DEPLOYMENT.md` - Updated with webhook setup instructions
- `README.md` - Added email open tracking to features list
- `test/test-resend-webhook.js` - Test script for webhook validation

**Documentation includes:**
- Architecture overview
- Setup instructions
- Database schema reference
- Analytics queries
- Troubleshooting guide
- Security details
- Future enhancements

## Configuration Requirements

### Environment Variables

Add to Vercel (and `.env.local` for local dev):

```bash
RESEND_WEBHOOK_SECRET=whsec_...
```

### Resend Dashboard Setup

1. Go to Resend Dashboard → Webhooks
2. Create new webhook:
   - **URL:** `https://your-app.vercel.app/api/webhooks/resend`
   - **Events:** Select `email.opened`
   - **Status:** Active
3. Copy signing secret to `RESEND_WEBHOOK_SECRET`

### Database Migration

Run migration in Supabase SQL Editor:
```bash
supabase/migrations/20250114000000_email_open_tracking.sql
```

## Design Decisions

### Track Email Types: Option A - Reminder Emails Only ✅
- Currently only tracking reminder emails
- Easily extensible to digest/waitlist emails later
- Focused on core user value: contact engagement

### Handle Multiple Opens: Option A - First Open Only ✅
- Tracks timestamp of first open
- Ignores subsequent opens (prevents noise)
- Sufficient for engagement tracking
- Can be extended to track all opens if needed

### Link to Contacts: Option A - Yes, with Event Log ✅
- Updates contact `last_interaction_at` on open
- Logs `email_opened` event for audit trail
- Enables contact engagement analytics
- Triggers popup notification to user

## Testing

### Manual Testing Steps

1. **Send a test reminder:**
   ```bash
   POST /api/reminders/test-send
   Body: { "reminderId": "your-reminder-uuid" }
   ```

2. **Open the email** in your inbox

3. **Verify webhook received:**
   - Check Vercel logs for `[Resend Webhook]` messages
   - Check Resend Dashboard → Webhooks → Deliveries

4. **Verify database updates:**
   ```sql
   SELECT * FROM sent_emails WHERE resend_email_id = 're_...';
   SELECT * FROM events WHERE event_type = 'email_opened';
   SELECT * FROM contacts WHERE id = 'contact-uuid'; -- Check last_interaction_at
   ```

5. **Verify popup created:**
   ```sql
   SELECT * FROM popups WHERE source_event_type = 'email_opened';
   ```

### Test Script

```bash
node test/test-resend-webhook.js <email-id>
```

This simulates a Resend webhook for testing without sending real emails.

## Event Flow

```
1. Create Reminder
   ↓
2. Trigger Time Reached (QStash)
   ↓
3. Send Email via Resend
   ↓
4. Store email_id in sent_emails table
   ↓
5. Recipient Opens Email
   ↓
6. Resend Webhook Fires → POST /api/webhooks/resend
   ↓
7. Verify Signature ✓
   ↓
8. Look Up Email in sent_emails ✓
   ↓
9. Update opened_at timestamp ✓
   ↓
10. Update contact.last_interaction_at ✓
   ↓
11. Log email_opened event ✓
   ↓
12. Create popup notification ✓
   ↓
13. User sees: "Your email to John was opened 5 minutes ago"
```

## Analytics Capabilities

### Email Open Rate
```sql
SELECT
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) * 100.0 / COUNT(*) AS open_rate
FROM sent_emails
WHERE user_id = 'user-uuid'
  AND email_type = 'reminder'
  AND sent_at >= NOW() - INTERVAL '30 days';
```

### Contact Engagement Score
```sql
SELECT
  c.name,
  COUNT(se.id) AS emails_sent,
  COUNT(se.opened_at) AS emails_opened,
  COUNT(se.opened_at)::float / NULLIF(COUNT(se.id), 0) AS engagement_rate,
  MAX(se.opened_at) AS last_engaged
FROM contacts c
LEFT JOIN sent_emails se ON se.contact_id = c.id
WHERE c.user_id = 'user-uuid'
GROUP BY c.id, c.name
HAVING COUNT(se.id) > 0
ORDER BY engagement_rate DESC;
```

### Time to Open
```sql
SELECT
  c.name,
  se.sent_at,
  se.opened_at,
  EXTRACT(EPOCH FROM (se.opened_at - se.sent_at)) / 60 AS minutes_to_open
FROM sent_emails se
JOIN contacts c ON c.id = se.contact_id
WHERE se.user_id = 'user-uuid'
  AND se.opened_at IS NOT NULL
ORDER BY se.opened_at DESC
LIMIT 20;
```

## Security

- ✅ HMAC SHA256 signature verification
- ✅ Timestamp validation (5-minute window)
- ✅ Row Level Security on sent_emails table
- ✅ Service role required for webhook operations
- ✅ No sensitive data in webhook payload
- ✅ Returns 200 for all requests (prevents leaking info)

## Future Enhancements

Potential improvements for future milestones:
1. **Multiple open tracking** - Track all opens with timestamps
2. **Click tracking** - Track link clicks in emails (requires Resend Pro)
3. **Bounce/complaint handling** - Update contact status on bounces
4. **Email templates** - A/B test different templates based on open rates
5. **Digest email tracking** - Extend to weekly digest emails
6. **Engagement scoring** - Predictive model based on open patterns
7. **Best time to send** - Optimize send time based on open patterns

## Files Modified/Created

### Created:
- `supabase/migrations/20250114000000_email_open_tracking.sql`
- `app/api/webhooks/resend/route.ts`
- `docs/email-open-tracking.md`
- `test/test-resend-webhook.js`

### Modified:
- `lib/email.ts` - Added tracking parameters and logic
- `app/api/reminders/send/route.ts` - Pass tracking params
- `app/api/reminders/process-overdue/route.ts` - Pass tracking params
- `app/api/reminders/test-send/route.ts` - Pass tracking params
- `docs/DEPLOYMENT.md` - Added webhook setup instructions
- `README.md` - Added feature to list

## Success Criteria

All criteria met:
- ✅ Emails store metadata on send
- ✅ Webhook receives and verifies Resend events
- ✅ First open is tracked (subsequent ignored)
- ✅ Contact interaction timestamp updated
- ✅ email_opened event logged
- ✅ Popup triggered for user notification
- ✅ Secure signature verification implemented
- ✅ Documentation complete
- ✅ Test script provided

## Next Steps

1. **Deploy to production:**
   - Apply database migration
   - Add `RESEND_WEBHOOK_SECRET` to Vercel
   - Configure webhook in Resend dashboard
   - Deploy app

2. **Monitor:**
   - Check Vercel logs for webhook activity
   - Monitor Resend Dashboard → Webhooks → Deliveries
   - Track `sent_emails` table growth
   - Monitor `email_opened` events

3. **Test in production:**
   - Send test reminder
   - Open email
   - Verify popup appears
   - Check analytics queries

## Support & Troubleshooting

See detailed troubleshooting guide in [docs/email-open-tracking.md](docs/email-open-tracking.md)

Common issues:
- Webhook signature fails → Check `RESEND_WEBHOOK_SECRET`
- Email not tracked → Check `sent_emails` table has entry
- Popup not showing → Check events and popup_rules tables
- Contact not updated → Verify contact_id exists

---

**Implementation Date:** January 14, 2026
**Status:** ✅ Complete and ready for production
