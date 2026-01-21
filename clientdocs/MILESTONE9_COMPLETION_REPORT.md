# Milestone 9: Monetisation Groundwork - Completion Report

**Date:** January 2025  
**Status:** ✅ **100% Complete**

---

## What We Built

Milestone 9 prepares FollowUp Timer to take payment safely and flexibly without forcing monetisation UX yet. This milestone introduces a comprehensive commercial enablement layer including plan management, feature gating, Stripe-ready architecture, trial logic, and usage metering—all without requiring any paywalls or payment flows.

---

## Key Features

### ✅ Plan Model

**Plan Types (Enum-Based):**
- **FREE** - Default plan for all users with essential features
- **PRO** - Premium plan with full feature access and higher limits
- **TEAM** - Future-ready plan for team features (not fully enabled yet)

**User Plan Object:**
Every user has a complete plan context stored in their profile:
- `plan_type` - Current plan (FREE/PRO/TEAM)
- `plan_started_at` - When the current plan started
- `trial_ends_at` - Trial end date (null if not in trial)
- `subscription_status` - Current subscription state

**Subscription Status Values:**
- `none` - No active subscription
- `trialing` - Currently in trial period
- `active` - Active paid subscription
- `past_due` - Payment failed, needs attention
- `canceled` - Subscription canceled
- `paused` - Subscription paused

**Plan Utilities:**
- `isInTrial()` - Check if user is currently trialing
- `hasProAccess()` - Check if user has PRO-level access (trial or paid)
- `isSubscriptionDegraded()` - Check if subscription needs attention
- `normalizePlanType()` - Safe fallback to FREE if invalid

### ✅ Feature Flags & Entitlements

**Feature Flag System:**
Each feature controlled by:
- Boolean enable flag
- Optional numeric limit (null = unlimited)
- Current usage tracking

**Feature Matrix:**

| Feature | FREE Plan | PRO Plan |
|---------|-----------|----------|
| Smart Snooze | ✅ Enabled | ✅ Enabled |
| Contacts | ✅ Enabled | ✅ Enabled |
| Weekly Digest | ✅ Limited (light detail) | ✅ Full (standard detail) |
| Trust & Audit UI | ✅ Limited (7 days) | ✅ Unlimited history |
| Advanced Settings | ❌ Disabled | ✅ Enabled |
| Tone Variants | ✅ Limited (neutral only) | ✅ All tones |
| Reminder Volume | ✅ Capped (50 active) | ✅ Higher cap (500) |

**Enforcement Layer:**
- **Server-side (Authoritative)** - All feature checks happen on the server
- **UI-side (UX Feedback)** - Clear messaging for locked features
- No feature fails silently—users always know why

### ✅ Trial Logic

**Trial Rules:**
- Default trial duration: 14 days (configurable)
- Trial may start on signup or upgrade attempt
- Trial grants full PRO-level access
- One trial per user (strictly enforced)

**Trial State Handling:**
- During trial: `plan_type = PRO`, `subscription_status = trialing`
- Trial end enforced via `trial_ends_at` timestamp
- On trial end: Automatic downgrade to FREE
- No data deleted on downgrade
- Feature access reduced gracefully

**Trial Safeguards:**
- One trial per user via `trial_history` table
- Trial restarts require admin override only
- Trial end events logged for analytics
- Automatic expiration via scheduled cron job

### ✅ Stripe-Ready Architecture

**Stripe Objects (Stored per User):**
- `stripe_customer_id` - Stripe customer identifier
- `stripe_subscription_id` - Stripe subscription identifier
- `stripe_price_id` - Price ID for future pricing flexibility
- `stripe_product_id` - Product identifier

**Webhook Handlers Ready:**
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription status changed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_failed` - Payment failed, mark as past_due
- `invoice.payment_succeeded` - Payment successful, restore to active

**Stripe Independence Rule:**
- App functions fully without Stripe enabled
- No UI hard dependency on Stripe responses
- Graceful fallbacks when Stripe unavailable
- Stripe fields stored but not required

**Security:**
- Webhook signature verification with signing secret
- Stripe IDs never exposed client-side
- All billing state changes logged to `billing_events` table

### ✅ Gating Strategy (Soft Gating)

**Current Implementation:**
- Features visible but limited on FREE plan
- Clear messaging when features are locked:
  - "Upgrade to unlock"
  - "Limit reached"
  - "Available on PRO plan"
- Locked settings show disabled state with explanation

**Out of Scope (Future Milestones):**
- Checkout pages
- Payment forms
- Billing portal UI
- Pricing pages

### ✅ Usage Limits & Metering

**Trackable Metrics:**
- `reminders_active` - Count of pending reminders
- `contacts_count` - Total contacts
- `digests_sent` - Digests sent in current period
- `audit_history_depth` - Audit event count

**Limit Handling Rules:**
- When limit reached: Prevent new action
- Show explanatory message to user
- Existing data never deleted or hidden
- Graceful degradation maintains usability

### ✅ Settings Integration

**Plan-Gated Settings:**
- **Tone Settings** - FREE: neutral only, PRO: all 5 tones
- **Digest Settings** - FREE: light detail, PRO: standard detail
- Unavailable controls shown as disabled/read-only
- Clear explanation of why setting is locked
- "Upgrade" prompt with trial option

---

## How It Works

### Understanding Your Plan

1. **View Current Plan:**
   - Go to Settings → Plan
   - See your current plan type (FREE/PRO/TEAM)
   - View subscription status
   - See when plan started

2. **Feature Access:**
   - View all features and their availability
   - See limits for each feature
   - Understand what's included in your plan

3. **Plan Indicators:**
   - Plan badge shows current tier
   - Status badge shows subscription state
   - Clear visual distinction between plan levels

### Starting a Trial

1. **Eligibility Check:**
   - System verifies you haven't used a trial before
   - Confirms you're not already on a paid plan
   - Shows clear eligibility status

2. **Start Trial:**
   - Click "Start Free Trial" on FREE plan
   - Immediately get PRO-level access
   - Trial lasts 14 days

3. **During Trial:**
   - Full access to all PRO features
   - All tone variants unlocked
   - Standard digest detail level
   - Higher reminder limits
   - Trial end date clearly shown

4. **Trial End:**
   - Automatic downgrade to FREE
   - No action required from user
   - All data preserved
   - Features gracefully reduced

### Feature Gating

1. **Tone Variants:**
   - FREE users: Only "Neutral" tone available
   - PRO users: All 5 tones available
   - Locked tones show lock icon
   - "Upgrade to unlock" message

2. **Digest Detail Level:**
   - FREE users: "Light" detail only
   - PRO users: "Standard" detail available
   - Clear indication of limitation
   - Upgrade prompt shown

3. **Reminder Volume:**
   - FREE: Up to 50 active reminders
   - PRO: Up to 500 active reminders
   - Warning shown when approaching limit
   - Prevented when limit reached

### Admin Management

1. **Update User Plan:**
   - Admin can change any user's plan
   - Set plan type (FREE/PRO/TEAM)
   - Update subscription status
   - Attach Stripe IDs

2. **Force Start Trial:**
   - Admin can restart trials
   - Bypasses one-trial-per-user rule
   - Useful for special cases

---

## What You Can Do

### Plan Management
- ✅ View current plan and status
- ✅ See plan start date
- ✅ View trial end date (if trialing)
- ✅ Start a free trial
- ✅ See feature entitlements

### Feature Access
- ✅ View all available features
- ✅ See feature limits
- ✅ Understand locked features
- ✅ Upgrade prompts when appropriate

### Trial Experience
- ✅ Start 14-day free trial
- ✅ Full PRO access during trial
- ✅ Clear trial countdown
- ✅ Graceful downgrade on expiry

### Settings Gating
- ✅ Tone variants respect plan
- ✅ Digest detail respects plan
- ✅ Clear locked state UI
- ✅ Upgrade messaging

---

## Benefits

✅ **Future-Ready** - Architecture supports any pricing changes without code modifications  
✅ **User-Friendly** - Clear plan context and feature visibility  
✅ **Safe Trials** - One trial per user with admin override capability  
✅ **Stripe-Ready** - Webhook handlers ready for payment integration  
✅ **Graceful Degradation** - No data loss on downgrade  
✅ **Independent** - App works fully without Stripe enabled  
✅ **Transparent** - Users always know their plan status and limits  
✅ **Secure** - Server-side enforcement, Stripe IDs protected  
✅ **Flexible** - Limits configurable without code changes  
✅ **Auditable** - All billing events logged  

---

## Technical Enhancements

### Database Schema

**Profiles Table Extensions:**
- `plan_type` - Enum: FREE, PRO, TEAM
- `subscription_status` - Enum: none, trialing, active, past_due, canceled, paused
- `plan_started_at` - Timestamp
- `trial_ends_at` - Timestamp (null if not in trial)
- `stripe_customer_id` - Text
- `stripe_subscription_id` - Text
- `stripe_price_id` - Text
- `stripe_product_id` - Text

**New Tables:**

`usage_metrics`:
- Per-user metric tracking
- Metric type (reminders_active, contacts_count, etc.)
- Metric value with period tracking
- Constraints for data integrity

`trial_history`:
- Records all trial events
- Tracks start, end, duration
- Conversion tracking for analytics
- One-trial enforcement

`billing_events`:
- Logs all Stripe webhook events
- Event type and Stripe event ID
- Full event data in JSONB
- Processing status tracking

### API Endpoints

**User-Facing:**
- `GET /api/plans` - Fetch user plan and entitlements
- `POST /api/trials/start` - Start a trial
- `GET /api/trials/check` - Check trial eligibility

**Admin-Only:**
- `PUT /api/admin/plans` - Update user plan
- `POST /api/admin/plans` - Force start trial

**Webhook:**
- `POST /api/webhooks/stripe` - Handle Stripe events

**Cron:**
- `POST /api/cron/expire-trials` - Expire ended trials
- `POST /api/cron/daily` - Combined daily job (includes trial expiration)

### Component Architecture

**Core Libraries:**
- `lib/plans.ts` - Plan types, defaults, and utilities
- `lib/entitlements.ts` - Feature matrix and enforcement
- `lib/trials.ts` - Trial logic and safeguards
- `lib/usage-metering.ts` - Usage tracking
- `lib/features.ts` - Backward compatibility layer

**React Hooks:**
- `usePlan()` - Get plan and entitlements
- `useProAccess()` - Quick PRO access check

**UI Components:**
- `PlanSettings` - Plan management UI
- `PlanBadge` - Plan type indicator
- `StatusBadge` - Subscription status indicator

### Security & Compliance

**Server-Side Enforcement:**
- All feature checks happen server-side
- API validates plan before allowing actions
- UI gating is for UX only, not security

**Stripe Security:**
- Webhook signature verification
- Stripe IDs stored server-side only
- Not exposed in client API responses

**Admin Protection:**
- Admin endpoints verify `is_admin` flag
- Prevents unauthorized plan modifications

**Audit Trail:**
- All billing events logged
- Trial history preserved
- Plan changes timestamped

---

## Edge Cases Handled

✅ **Missing Plan** - Defaults to FREE with safe fallbacks  
✅ **Invalid Plan Type** - Normalized to FREE  
✅ **Invalid Subscription Status** - Normalized to none  
✅ **Expired Trial** - Automatic downgrade via cron  
✅ **Multiple Trial Attempts** - Blocked after first trial  
✅ **Degraded Subscription** - Restricts advanced features  
✅ **Stripe Unavailable** - App functions normally  
✅ **Webhook Failures** - Logged but don't break app  
✅ **Concurrent Updates** - Handled via database constraints  
✅ **Migration** - Existing users defaulted to FREE  
✅ **Limit at Boundary** - Clear messaging, no silent failures  
✅ **Admin Override** - Force trial bypass available  

---

## Status

**All features are complete and working.**

Milestone 9 is fully functional and ready to use. The system now provides:
- Complete plan context for every user
- Feature gating without code refactors
- Predictable trial behavior with safeguards
- Stripe-ready architecture for payment integration
- Graceful degradation when downgrading
- Full functionality without Stripe enabled

---

## What's Next

Milestone 9 completes the Monetisation Groundwork, enabling:
- **Milestone 10** - Final Integration Testing & Launch Readiness
- **Future Enhancements:**
  - Checkout UI and payment forms
  - Billing portal for subscription management
  - Pricing pages with plan comparison
  - Team billing and TEAM plan features
  - Usage analytics and conversion tracking

The monetisation architecture in Milestone 9 ensures the app is ready for:
- Flexible pricing changes without schema updates
- Safe payment integration when ready
- Clear upgrade paths for users
- Revenue tracking and analytics

---

## Acceptance Criteria Verification

| Criteria | Status | Evidence |
|----------|--------|----------|
| Every user has a plan context | ✅ Complete | `profiles.plan_type` defaults to FREE |
| Features can be gated without refactors | ✅ Complete | Feature matrix in `lib/entitlements.ts` |
| Trial start/end behaves predictably | ✅ Complete | `lib/trials.ts` with safeguards |
| Stripe objects can be attached cleanly | ✅ Complete | Stripe fields in profiles table |
| No core feature breaks when downgraded | ✅ Complete | Graceful degradation in entitlements |
| App works fully without Stripe enabled | ✅ Complete | Independence rule enforced |

---

**Prepared by:** Development Team  
**Date:** January 2025  
**Version:** 1.0
