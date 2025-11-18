# 📄 FollowUpTimer – MVP Page Plan

Below is a clear, list of all pages/screens needed to build the FollowUpTimer MVP from start to finish.

---

## 1. **Public Pages**

### ✅ **Landing Page (Framer)**
- Already exists
- Only embeds:
  - Waitlist form → Supabase insert
- Shows confirmation message

### 🆕 **/waitlist (Optional Next.js page)**
- Simple form with email
- Inserts into `waitlist` table
- Success message

---

## 2. **Authentication Pages (Supabase Auth + Next.js)**

### 🔐 **/login**
- Email + password login
- Magic link optional

### 📝 **/signup**
- Create account
- Redirects to onboarding or dashboard

### 🔄 **/reset-password**
- Supabase reset password flow

---

## 3. **Onboarding Pages (Optional but recommended)**

### 🎛️ **/onboarding/tone**
- Choose affirmation tone (Motivational / Professional / Playful)

### 🔔 **/onboarding/notifications**
- Enable browser push
- Choose preferred notification method
  - Email
  - Push
  - In-app

---

## 4. **Authenticated App Pages**

### 🏠 **/dashboard**
Displays:
- Upcoming reminders
- Past reminders (optional)
- Quick actions: Create Reminder

Sections:
- “Next Reminder”
- “Recent Logs”
- Button → “Create Reminder”

---

## 5. **Reminder Flow**

### ➕ **/reminders/create**
Fields:
- Reminder message
- Date & time (remind_at)
- Tone (dropdown)
- Notification method
- Submit → schedules QStash job

### 📋 **/reminders**
- List of all reminders
- Pagination optional
- Status: pending / sent / snoozed / dismissed

### ✏️ **/reminders/[id]**
- Edit reminder
- Change time, tone, message
- Update QStash schedule

---

## 6. **Notifications / Actions Pages**

These are “API route pages” but included for completeness.

### 🔁 **/api/reminders/send**
- Endpoint called by QStash
- Sends affirmation + reminder

### 😴 **/reminders/[id]/snooze**
- Adds +10 minutes or user-selected snooze
- Reschedules QStash task

### ❌ **/reminders/[id]/dismiss**
- Marks reminder as dismissed

---

## 7. **Settings Pages**

### ⚙️ **/settings**
Tabs:
- Profile (email)
- Notification preferences
- Affirmation tone preference
- Delete account (optional)

---

## 8. **Admin / Internal Pages (Optional)**

### 📊 **/admin/logs**
- View `sent_logs`
- Useful during testing

---

## 9. **Documentation & Misc**

### 📘 **/docs (private for founder)**
- Developer documentation
- API endpoints
- Deployment notes

---

# ✅ Summary Table

| Area                | Page                      | Purpose                    |
| ------------------- | ------------------------- | -------------------------- |
| Public              | Landing                   | Waitlist form              |
| Public              | /waitlist                 | Optional standalone form   |
| Auth                | /login                    | Login                      |
| Auth                | /signup                   | Register                   |
| Auth                | /reset-password           | Reset password             |
| Onboarding          | /onboarding/tone          | Choose tone                |
| Onboarding          | /onboarding/notifications | Choose notification method |
| App                 | /dashboard                | Main dashboard             |
| App                 | /reminders/create         | Create reminder            |
| App                 | /reminders                | List reminders             |
| App                 | /reminders/[id]           | Edit reminder              |
| App                 | /settings                 | Manage preferences         |
| Notification System | /api/reminders/send       | QStash webhook             |
| Notification System | /reminders/[id]/snooze    | Snooze                     |
| Notification System | /reminders/[id]/dismiss   | Dismiss                    |
| Optional Admin      | /admin/logs               | View logs                  |
| Optional Docs       | /docs                     | Internal docs              |

---
