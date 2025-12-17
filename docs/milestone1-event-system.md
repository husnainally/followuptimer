# Milestone 1 - Event System Foundations

## Overview

The Event System is the foundation for all Phase 2 and Phase 3 intelligence features. It tracks all user behaviour and system events, enabling popups, smart snooze, suggestions, digests, and future browser extension integration.

## Event Schema

### Events Table

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_type event_type NOT NULL,
  source TEXT DEFAULT 'app' NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Event Types

**Core Reminder Events:**
- `reminder_created` - User creates a new reminder
- `reminder_completed` - Reminder is completed/sent
- `reminder_snoozed` - Reminder is snoozed
- `reminder_dismissed` - Reminder is dismissed
- `reminder_missed` - Reminder becomes overdue (detected by scheduler)

**Behaviour Events:**
- `inactivity_detected` - User has no activity for X hours
- `streak_achieved` - User achieves a streak milestone
- `streak_incremented` - User's streak count increases
- `streak_broken` - User's streak is broken

**Popup Events:**
- `popup_shown` - A popup is displayed to user
- `popup_action` - User interacts with a popup

**Follow-up Events:**
- `follow_up_required` - System detects follow-up is needed

**Extension Events (Phase 3 Ready):**
- `email_opened` - Email opened via extension
- `linkedin_profile_viewed` - LinkedIn profile viewed via extension
- `linkedin_message_sent` - LinkedIn message sent via extension

### Event Sources

- `app` - Event from web application
- `scheduler` - Event from scheduled job/cron
- `extension_gmail` - Event from Gmail browser extension
- `extension_linkedin` - Event from LinkedIn browser extension

### Event Data Structure

The `event_data` JSONB field contains flexible metadata:

```typescript
interface EventData {
  reminder_id?: string;
  popup_id?: string;
  action?: string;
  duration_minutes?: number;
  streak_count?: number;
  minutes_overdue?: number;
  hours_inactive?: number;
  // Extension-specific fields
  message_id?: string;
  thread_id?: string;
  profile_url?: string;
  email_subject?: string;
  [key: string]: unknown;
}
```

## Behaviour Triggers Table

Triggers are flags created from events that indicate when popups or suggestions should be shown.

```sql
CREATE TABLE behaviour_triggers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trigger_type TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending' or 'consumed'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE
);
```

### Trigger Types

- `show_streak_popup` - Show popup when streak increases
- `show_inactivity_popup` - Show popup when inactivity detected
- `show_snooze_coaching_popup` - Show popup for repeated snoozes
- `show_followup_popup` - Show popup when follow-up needed
- `show_missed_reminder_popup` - Show popup for missed reminders

## How to Log Events

### From Application Code

```typescript
import { logEvent } from "@/lib/events";

// Basic event
await logEvent({
  userId: user.id,
  eventType: "reminder_created",
  eventData: {
    reminder_id: reminder.id,
    tone: reminder.tone,
  },
  source: "app",
  reminderId: reminder.id,
  contactId: reminder.contact_id,
});

// Extension event
import { logExtensionEvent } from "@/lib/events";

await logExtensionEvent({
  userId: user.id,
  eventType: "email_opened",
  source: "extension_gmail",
  eventData: {
    message_id: "msg123",
    email_subject: "Follow up",
  },
  contactId: contact.id,
});
```

### From API Endpoint

```typescript
// POST /api/events
const response = await fetch("/api/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    event_type: "reminder_completed",
    event_data: {
      reminder_id: "123",
      duration_minutes: 5,
    },
    source: "app", // optional, defaults to "app"
    contact_id: "456", // optional
    reminder_id: "123", // optional
  }),
});
```

### From Scheduled Jobs

```typescript
// Use service client for scheduled jobs
await logEvent({
  userId: user.id,
  eventType: "reminder_missed",
  eventData: {
    reminder_id: reminder.id,
    minutes_overdue: 30,
  },
  source: "scheduler",
  reminderId: reminder.id,
  useServiceClient: true, // Bypasses RLS
});
```

## Automatic Event Logging

The following actions automatically log events:

1. **Reminder Created** (`app/api/reminders/route.ts`)
   - Logs: `reminder_created`
   - Source: `app`
   - Includes: reminder_id, tone, notification_method

2. **Reminder Completed** (`app/api/popups/[id]/action/route.ts`, `app/api/reminders/send/route.ts`)
   - Logs: `reminder_completed`
   - Source: `app` or `scheduler`
   - Triggers: Streak tracking update

3. **Reminder Snoozed** (`app/api/reminders/[id]/snooze/route.ts`)
   - Logs: `reminder_snoozed`
   - Source: `app`
   - Includes: duration_minutes, is_smart_suggestion
   - Triggers: Repeated snooze detection

4. **Reminder Dismissed** (`app/api/reminders/[id]/dismiss/route.ts`)
   - Logs: `reminder_dismissed`
   - Source: `app`

5. **Reminder Missed** (`app/api/reminders/check-missed/route.ts`)
   - Scheduled endpoint (cron job)
   - Logs: `reminder_missed` for overdue reminders
   - Source: `scheduler`
   - Triggers: Missed reminder popup

6. **Inactivity Detected** (`app/api/events/check-inactivity/route.ts`)
   - Scheduled endpoint (cron job)
   - Logs: `inactivity_detected` when no activity for 24+ hours
   - Source: `scheduler`
   - Triggers: Inactivity popup

7. **Streak Tracking** (`lib/streak-tracking.ts`)
   - Automatically calculates streak on reminder completion
   - Logs: `streak_incremented` or `streak_broken`
   - Source: `scheduler`
   - Triggers: Streak popup

## Trigger System

### How Triggers Are Created

Triggers are automatically created when certain events occur:

```typescript
// In lib/trigger-manager.ts
await processEventForTriggers(
  userId,
  eventType,
  eventId,
  eventData
);
```

**Trigger Creation Rules:**
- `streak_incremented` → `show_streak_popup`
- `inactivity_detected` → `show_inactivity_popup`
- `reminder_missed` → `show_missed_reminder_popup`
- `follow_up_required` → `show_followup_popup`
- `reminder_snoozed` (3+ times for same reminder) → `show_snooze_coaching_popup`

### How Milestone 2 Will Consume Triggers

Milestone 2 (Popup Engine) will:

1. Query pending triggers:
```typescript
import { getPendingTriggers } from "@/lib/trigger-manager";

const triggers = await getPendingTriggers(userId, "show_streak_popup");
```

2. Show appropriate popup based on trigger type

3. Mark trigger as consumed:
```typescript
import { consumeTrigger } from "@/lib/trigger-manager";

await consumeTrigger(triggerId);
```

## Scheduled Endpoints

### Check Missed Reminders

**Endpoint:** `POST /api/reminders/check-missed`

**Authentication:** Bearer token with `MISSED_REMINDERS_CRON_SECRET`

**Frequency:** Recommended every 15-30 minutes

**What it does:**
- Finds reminders where `remind_at < now()` and `status = 'pending'`
- Logs `reminder_missed` events
- Creates `show_missed_reminder_popup` triggers

### Check Inactivity

**Endpoint:** `POST /api/events/check-inactivity`

**Authentication:** Bearer token with `INACTIVITY_CRON_SECRET`

**Frequency:** Recommended daily

**Configuration:** `INACTIVITY_THRESHOLD_HOURS` (default: 24)

**What it does:**
- Checks last activity for all users
- If no events for threshold hours, logs `inactivity_detected`
- Creates `show_inactivity_popup` triggers
- Prevents duplicate logs (only once per 6 hours)

## Extension Integration (Phase 3 Ready)

The event system is designed to accept events from browser extensions:

### Example Extension Event

```typescript
// From browser extension
await fetch("https://followuptimer.io/api/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${userToken}`,
  },
  body: JSON.stringify({
    event_type: "email_opened",
    source: "extension_gmail",
    event_data: {
      message_id: "msg123",
      thread_id: "thread456",
      email_subject: "Follow up needed",
      contact_email: "john@example.com",
    },
    contact_id: "contact-uuid", // If contact exists
  }),
});
```

### Extension Event Types

- `email_opened` - User opens email in Gmail
- `linkedin_profile_viewed` - User views LinkedIn profile
- `linkedin_message_sent` - User sends LinkedIn message

## Querying Events

### Get User Events

```typescript
import { queryEvents } from "@/lib/events";

const result = await queryEvents({
  userId: user.id,
  eventType: "reminder_completed", // optional filter
  startDate: new Date("2024-01-01"), // optional
  endDate: new Date("2024-12-31"), // optional
  limit: 100, // default 100
});
```

### API Endpoint

```bash
GET /api/events?event_type=reminder_completed&start_date=2024-01-01&limit=50
```

## Security

- **RLS Policies:** Users can only view/insert their own events
- **API Authentication:** All endpoints require authenticated user
- **Scheduled Endpoints:** Protected by secret tokens
- **Service Client:** Scheduled jobs use service client to bypass RLS

## Indexes

For optimal performance, indexes are created on:
- `user_id`
- `event_type`
- `created_at`
- `source`
- `contact_id`
- `reminder_id`
- Composite: `(user_id, event_type, created_at)`

## Next Steps (Milestone 2)

Milestone 2 will:
1. Read pending triggers from `behaviour_triggers` table
2. Display appropriate popups based on trigger type
3. Mark triggers as consumed after showing popup
4. Use trigger metadata to customize popup content

## Testing

### Manual Testing

1. Create a reminder → Check for `reminder_created` event
2. Complete a reminder → Check for `reminder_completed` event and streak update
3. Snooze a reminder 3+ times → Check for `show_snooze_coaching_popup` trigger
4. Wait for reminder to be overdue → Check missed reminders endpoint
5. Wait 24+ hours with no activity → Check inactivity endpoint

### Test Scripts

See `scripts/test-phase2.js` for automated testing.

## Environment Variables

- `MISSED_REMINDERS_CRON_SECRET` - Secret for missed reminders endpoint
- `INACTIVITY_CRON_SECRET` - Secret for inactivity endpoint
- `INACTIVITY_THRESHOLD_HOURS` - Hours before inactivity detected (default: 24)

