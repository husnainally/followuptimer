# FollowUp Timer – Popup Engine
## QA Test Plan Report

**Phase 2 · Milestone 2**

---

## 1. Event → Popup Triggering

### 1.1 Email Open Trigger
**What to Test:**
- When an email is opened, a popup should appear within 2-3 seconds
- Popup shows the contact name and "opened X minutes ago"
- System logs that the popup was shown

### 1.2 Reminder Due Trigger
**What to Test:**
- When a scheduled reminder time arrives, popup appears
- Shows correct contact information
- Popup status updates correctly

### 1.3 No Reply After X Days Trigger
**What to Test:**
- Popup appears when no reply received after set time (e.g., 3 days)
- Only shows once per contact for that rule
- Doesn't show if follow-up already completed

---

## 2. Eligibility & Safeguards

### 2.1 User Preference Disabled
**What to Test:**
- If user has popups disabled in settings, no popup appears
- System still tracks events for analytics

### 2.2 Cooldown Enforcement
**What to Test:**
- Same popup rule won't trigger twice within cooldown period
- Second popup is blocked if too soon

### 2.3 Duplicate Event Protection
**What to Test:**
- If same event is sent twice, only one popup appears
- No duplicate popups shown

### 2.4 Multiple Events at Once (Priority)
**What to Test:**
- If two events arrive at same time, only highest priority popup shows
- Lower priority popup is queued or handled appropriately

---

## 3. Popup Display & UI

### 3.1 Animation – Normal Mode
**What to Test:**
- Popup appears with smooth animation (200-300ms)
- Smooth exit animation
- No flickering or layout issues

### 3.2 Reduced Motion Enabled
**What to Test:**
- If user has "reduce motion" enabled, popup appears instantly
- No animations applied

### 3.3 Offline → Online Recovery
**What to Test:**
- If event occurs while offline, popup appears when user comes back online
- Expired popups (past TTL) are not shown

---

## 4. Button Actions

### 4.1 "Follow Up Now"
**What to Test:**
- Clicking opens correct destination (email thread or entity page)
- Popup closes immediately
- Action is logged correctly

### 4.2 "Snooze / Remind Me Later"
**What to Test:**
- Selecting "Tomorrow" closes popup
- Reminder is created for correct time
- Popup doesn't reappear before snooze time
- Events logged correctly

### 4.3 "Mark Done"
**What to Test:**
- Follow-up task marked as completed
- No further popups for that contact/rule
- Long cooldown applied
- Events logged correctly

### 4.4 "Dismiss"
**What to Test:**
- Popup closes when dismissed
- Short cooldown applied
- Popup doesn't immediately reappear
- Dismissal is logged

---

## 5. Affirmation Layer (Optional Feature)

### 5.1 Affirmations Enabled
**What to Test:**
- Popup includes motivational message when enabled
- Affirmations rotate (no immediate repetition)

### 5.2 Affirmations Disabled
**What to Test:**
- Popup displays without affirmation text
- No broken or empty UI elements

---

## 6. Logging & Data Integrity

### 6.1 Lifecycle Event Logging
**What to Test:**
- All popup events logged in correct order
- Correct timestamps stored
- Linked to correct user, contact, and rule

### 6.2 Error Handling
**What to Test:**
- If popup system fails temporarily, app doesn't crash
- Error is logged for debugging
- User experience remains stable

---

## 7. Performance & UX

### 7.1 Latency






**What to Test:**
- Popup appears within 3 seconds under normal conditions
- UI remains responsive

### 7.2 Spam Prevention Stress Test
**What to Test:**
- If 10+ events fire quickly, popups are limited by cooldown rules
- User never sees too many popups at once
- No "popup storm" occurs

---

## 8. Acceptance Criteria

**Milestone passes QA when:**
- ✅ All trigger types work correctly
- ✅ No duplicate or spam popups
- ✅ All buttons behave as designed
- ✅ Lifecycle events are logged correctly
- ✅ UX feels calm, helpful, and non-intrusive

---

*Report prepared for client review*

