# Milestone 3 - Affirmation Engine

## Overview

The Affirmation Engine provides intelligent, category-based affirmation selection with frequency control, cooldown management, and context-aware category matching. It integrates seamlessly with the Popup Engine from Milestone 2.

## Features

### 1. Category-Based Affirmations

Affirmations are organized into 6 categories:
- **Sales Momentum** (10 affirmations)
- **Calm Productivity** (8 affirmations)
- **Consistency & Habits** (8 affirmations)
- **Resilience & Confidence** (8 affirmations)
- **Focus & Execution** (8 affirmations)
- **General Positive** (8 affirmations)

Total: 50 affirmations seeded in database

### 2. Frequency Control

**Global Cooldown**: Minimum minutes between showing any affirmation (default: 30 minutes)
- Configurable per user via `user_affirmation_preferences.global_cooldown_minutes`

**Daily Cap**: Maximum affirmations per day (default: 10)
- Configurable per user via `user_affirmation_preferences.daily_cap`

**User Preferences**: Users can enable/disable specific categories
- Stored in `user_affirmation_preferences` table
- All categories enabled by default

### 3. Context-Aware Selection

The engine selects categories based on popup/event context:

- **Email Opened / Reminder Due**: Sales Momentum, Focus
- **Reminder Completed**: Consistency, General Positive
- **Reminder Missed / Inactivity**: Resilience, Calm Productivity
- **Default**: All enabled categories (fallback)

### 4. No-Repetition Logic

- Tracks last 10 shown affirmations per user
- Avoids showing same affirmation twice in a row
- If all affirmations in category were recently shown, allows repetition (after cycling through all)

### 5. Event Logging

Every affirmation shown logs:
- Event type: `affirmation_shown`
- Event data: `affirmation_id`, `category`, `popup_id`, `reminder_id`, `contact_id`
- Source: `app`

## Database Schema

### Tables

**`affirmations`**
- `id` (UUID, primary key)
- `text` (text) - The affirmation message
- `category` (affirmation_category enum)
- `enabled` (boolean) - Can disable individual affirmations
- `created_at`, `updated_at` (timestamps)

**`affirmation_usage`**
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to profiles)
- `affirmation_id` (UUID, foreign key to affirmations)
- `popup_id` (UUID, foreign key to popups, nullable)
- `shown_at` (timestamp)
- `category` (affirmation_category enum)

**`user_affirmation_preferences`**
- `user_id` (UUID, primary key, foreign key to profiles)
- `sales_momentum_enabled` (boolean, default: true)
- `calm_productivity_enabled` (boolean, default: true)
- `consistency_enabled` (boolean, default: true)
- `resilience_enabled` (boolean, default: true)
- `focus_enabled` (boolean, default: true)
- `general_positive_enabled` (boolean, default: true)
- `global_cooldown_minutes` (integer, default: 30)
- `daily_cap` (integer, default: 10)
- `updated_at` (timestamp)

### Enums

**`affirmation_category`**
- `sales_momentum`
- `calm_productivity`
- `consistency`
- `resilience`
- `focus`
- `general_positive`

## API

### Core Function

```typescript
import { getAffirmationForUser } from "@/lib/affirmation-engine";

const affirmation = await getAffirmationForUser(
  userId: string,
  context?: {
    popupType?: string;
    eventType?: string;
    reminderId?: string;
    contactId?: string;
  },
  popupId?: string
);

// Returns:
// {
//   text: string;
//   category: AffirmationCategory;
//   affirmation_id: string;
// }
// OR null if affirmations should not be shown
```

## Integration with Popup Engine

The affirmation engine is automatically called when creating popups:

1. Popup is created with `affirmation: null`
2. `getAffirmationForUser()` is called with context
3. If affirmation is selected:
   - Popup is updated with affirmation text
   - Usage is recorded in `affirmation_usage`
   - `affirmation_shown` event is logged

## Eligibility Checks

Before showing an affirmation, the engine checks:

1. ✅ **User has affirmations enabled** (`profiles.affirmation_frequency` is not null)
2. ✅ **Global cooldown passed** (last shown >= `global_cooldown_minutes` ago)
3. ✅ **Daily cap not reached** (count today < `daily_cap`)
4. ✅ **At least one category enabled** (user preferences)
5. ✅ **Context allows categories** (context-aware selection)

If any check fails → no affirmation shown (returns `null`)

## Selection Flow

1. Determine allowed categories based on context + user preferences
2. Get recently shown affirmations (last 10)
3. Select random category from allowed categories
4. Get all affirmations in that category
5. Filter out recently shown affirmations
6. Select random affirmation from available pool
7. If all affirmations were recently shown, use full pool (allow repetition)

## Usage Tracking

Every affirmation shown is tracked in `affirmation_usage`:
- Used for cooldown checking
- Used for daily cap checking
- Used for no-repeat logic
- Linked to popup (if shown in popup)
- Includes category for analytics

## Event Logging

Every affirmation shown logs an `affirmation_shown` event:

```typescript
{
  event_type: "affirmation_shown",
  event_data: {
    affirmation_id: "uuid",
    category: "sales_momentum",
    popup_id: "uuid" | undefined,
    reminder_id: "uuid" | undefined,
    contact_id: "uuid" | undefined
  },
  source: "app"
}
```

## Migration Files

1. `20250101000000_phase2_milestone3_affirmation_engine.sql`
   - Creates tables, enums, indexes, RLS policies
   - Adds `affirmation_shown` to `event_type` enum

2. `20250101000001_phase2_milestone3_seed_affirmations.sql`
   - Seeds 50 affirmations across 6 categories

## Files Modified

- `lib/affirmation-engine.ts` - New file with core engine logic
- `lib/popup-engine.ts` - Integrated new affirmation engine
- `lib/events.ts` - Added `affirmation_shown` event type
- `app/api/events/route.ts` - Added `affirmation_shown` to validation

## Testing

To test the affirmation engine:

1. **Enable affirmations for user**:
   ```sql
   UPDATE profiles 
   SET affirmation_frequency = 'balanced' 
   WHERE id = 'user_id';
   ```

2. **Create a popup** (via event logging):
   ```javascript
   await fetch('/api/events', {
     method: 'POST',
     body: JSON.stringify({
       event_type: 'email_opened',
       event_data: { contact_name: 'Test' }
     })
   });
   ```

3. **Check popup has affirmation**:
   ```sql
   SELECT affirmation, id FROM popups 
   WHERE user_id = 'user_id' 
   ORDER BY queued_at DESC LIMIT 1;
   ```

4. **Check usage tracking**:
   ```sql
   SELECT * FROM affirmation_usage 
   WHERE user_id = 'user_id' 
   ORDER BY shown_at DESC;
   ```

5. **Check event logged**:
   ```sql
   SELECT * FROM events 
   WHERE event_type = 'affirmation_shown' 
   AND user_id = 'user_id' 
   ORDER BY created_at DESC;
   ```

## Future Enhancements

- Category weights (some categories shown more often)
- A/B testing support
- Analytics dashboard for affirmation performance
- User feedback on affirmations (thumbs up/down)
- Custom affirmations per user
- Time-of-day based category selection

