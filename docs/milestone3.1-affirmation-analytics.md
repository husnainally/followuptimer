# Milestone 3.1 - Affirmation Analytics & Reporting

## Overview

Affirmation Analytics & Reporting provides comprehensive tracking and reporting for the affirmation engine. It logs all affirmation events (shown, suppressed, actions) and provides analytics endpoints for both users and admins.

## Features

### 1. Event Logging

**A) AFFIRMATION_SHOWN**
- Logged whenever an affirmation is included in a popup
- Enhanced fields:
  - `affirmation_id` - ID of the affirmation shown
  - `category` - Category of the affirmation
  - `context_type` - Event type that triggered the popup (e.g., `email_opened`, `reminder_due`)
  - `popup_id` / `popup_instance_id` - Popup instance ID
  - `reminder_id` - Associated reminder (if any)
  - `contact_id` - Associated contact (if any)
  - `delivery_channel` - How affirmation was delivered (default: "popup")
  - `cooldown_state` - Whether cooldown was active (default: "allowed")

**B) AFFIRMATION_SUPPRESSED**
- Logged when an affirmation could have shown but didn't
- Suppression reasons:
  - `disabled_by_user` - User has affirmations disabled
  - `cooldown_active` - Global cooldown still active
  - `daily_limit_reached` - Daily cap reached
  - `category_disabled` - All categories disabled by user
  - `no_candidates_available` - No affirmations available in selected category
  - `context_not_allowed` - Context doesn't allow any categories
  - `other` - Other reasons
- Additional data:
  - `context_type` - Event type that triggered the check
  - `popup_id` - Popup instance ID (if applicable)
  - `minutes_remaining` - For cooldown_active reason
  - `count_today` / `daily_cap` - For daily_limit_reached reason

**C) AFFIRMATION_ACTION_CLICKED** (Optional)
- Logged when user clicks action button on popup with affirmation
- Fields:
  - `popup_id` / `popup_instance_id` - Popup instance ID
  - `action` - Action type (FOLLOW_UP_NOW, SNOOZE, MARK_DONE)
  - `had_affirmation` - Boolean (always true for this event)
  - `affirmation_id` - Optional (can be extracted from popup)

### 2. Analytics Endpoints

**GET /api/analytics/affirmations/user?range=7d**
- Returns user-level analytics
- Query params:
  - `range` - Time range (e.g., "7d", "30d", "1w", "1m") - default: "7d"
- Returns:
  - `shown_count` - Number of affirmations shown in range
  - `suppressed_count` - Number of suppressions in range
  - `top_categories` - Array of {category, count} sorted by count
  - `last_shown_at` - Timestamp of last shown affirmation
  - `suppression_reasons` - Array of {reason, count} sorted by count
  - `current_daily_count` - Affirmations shown today
  - `daily_cap` - User's daily cap setting
  - `cooldown_remaining_minutes` - Minutes until cooldown expires (null if none)

**GET /api/analytics/affirmations/admin?range=30d**
- Returns admin-level platform analytics
- Requires admin authentication
- Query params:
  - `range` - Time range (e.g., "7d", "30d", "1w", "1m") - default: "30d"
- Returns:
  - `enabled_users_pct` - Percentage of users with affirmations enabled
  - `total_shown` - Total affirmations shown in range
  - `total_suppressed` - Total suppressions in range
  - `category_mix` - Array of {category, count, percentage} sorted by count
  - `suppression_reasons` - Array of {reason, count, percentage} sorted by count
  - `action_click_rate_with_affirmation` - Click rate % for popups with affirmations
  - `action_click_rate_without_affirmation` - Click rate % for popups without affirmations
  - `engagement_uplift` - Difference between with/without rates (for correlation analysis)

### 3. Database Schema

**New Event Types:**
- `affirmation_shown` - Already in Milestone 3
- `affirmation_suppressed` - New in Milestone 3.1
- `affirmation_action_clicked` - New in Milestone 3.1

**New Enum:**
- `affirmation_suppression_reason` - Enum for suppression reasons

**Indexes:**
- `events_event_type_created_at_idx` - For fast analytics queries
- `events_user_id_event_type_created_at_idx` - For user-specific queries

### 4. Implementation Details

**Suppression Logging:**
- Logged at each eligibility check point:
  1. User has affirmations disabled → `disabled_by_user`
  2. Cooldown active → `cooldown_active` (with minutes_remaining)
  3. Daily cap reached → `daily_limit_reached` (with count_today, daily_cap)
  4. No categories enabled → `category_disabled`
  5. No affirmations available → `no_candidates_available`

**Enhanced AFFIRMATION_SHOWN:**
- Now includes `context_type` (event type that triggered popup)
- Includes `cooldown_state` (always "allowed" when shown)
- Includes `delivery_channel` (default: "popup")

**Action Tracking:**
- When popup action is clicked, checks if popup had affirmation
- Logs `affirmation_action_clicked` event if affirmation was present
- Used for correlation analysis (engagement uplift)

### 5. Analytics Helper Functions

**`getUserAffirmationAnalytics(userId, rangeDays)`**
- Queries events table for user-specific analytics
- Aggregates category counts, suppression reasons
- Calculates current daily count and cooldown remaining
- Returns structured analytics object

**`getAdminAffirmationAnalytics(rangeDays)`**
- Queries events table for platform-wide analytics
- Calculates adoption percentage
- Aggregates category mix and suppression reasons
- Correlates popup actions with affirmations for engagement analysis
- Returns structured analytics object

### 6. Files Created/Modified

**New Files:**
- `supabase/migrations/20250101000002_phase2_milestone3_1_analytics.sql` - Migration for event types and indexes
- `lib/affirmation-analytics.ts` - Analytics helper functions
- `app/api/analytics/affirmations/user/route.ts` - User analytics endpoint
- `app/api/analytics/affirmations/admin/route.ts` - Admin analytics endpoint
- `docs/milestone3.1-affirmation-analytics.md` - This documentation

**Modified Files:**
- `lib/affirmation-engine.ts` - Added suppression logging with reasons
- `lib/events.ts` - Added new event types
- `app/api/events/route.ts` - Added validation for new event types
- `app/api/popups/[id]/action/route.ts` - Added optional action tracking

### 7. Usage Examples

**Get User Analytics (7 days):**
```javascript
const response = await fetch('/api/analytics/affirmations/user?range=7d');
const data = await response.json();
console.log('Shown:', data.analytics.shown_count);
console.log('Top category:', data.analytics.top_categories[0]);
```

**Get Admin Analytics (30 days):**
```javascript
const response = await fetch('/api/analytics/affirmations/admin?range=30d');
const data = await response.json();
console.log('Adoption:', data.analytics.enabled_users_pct + '%');
console.log('Engagement uplift:', data.analytics.engagement_uplift);
```

### 8. Acceptance Criteria

- ✅ Every affirmation display logs `AFFIRMATION_SHOWN` with enhanced fields
- ✅ Every suppression logs `AFFIRMATION_SUPPRESSED` with reason
- ✅ Reporting endpoints return correct counts for specified ranges
- ✅ Basic category mix and suppression breakdown works
- ✅ Action tracking allows "with vs without affirmation" comparison
- ✅ User analytics includes current daily count and cooldown remaining
- ✅ Admin analytics includes engagement uplift calculation

### 9. Future Enhancements

- Real-time dashboard UI for analytics
- Export analytics data (CSV/JSON)
- A/B testing support (track which affirmations perform best)
- User feedback on affirmations (thumbs up/down)
- Time-series charts for trends
- Category performance metrics
- Suppression rate alerts (when suppression rate is too high)

