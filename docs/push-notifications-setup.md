# Push Notifications Setup Guide

Complete guide for setting up Web Push notifications in FollowUpTimer.

## Overview

This implementation uses the Web Push API with VAPID (Voluntary Application Server Identification) for secure push notifications.

## Architecture

1. **Client-side (Browser):**
   - Service Worker (`public/sw.js`) handles incoming push notifications
   - `usePushSubscription` hook manages subscription state
   - Settings page UI for enabling/disabling push notifications

2. **Server-side (API):**
   - `/api/push-subscriptions` - Register/unregister subscriptions
   - `/api/push-subscriptions/vapid-public-key` - Get public key
   - `lib/push-notification.ts` - Send push notifications

3. **Database:**
   - `push_subscriptions` table stores user subscriptions
   - Migration: `supabase/migrations/20241122000000_add_push_subscriptions.sql`

## Quick Setup

### 1. Install Dependencies

Already installed:
- `web-push` - Server-side push notification library
- `@types/web-push` - TypeScript types

### 2. Generate VAPID Keys

```bash
# Install web-push globally
npm install -g web-push

# Generate keys
web-push generate-vapid-keys
```

### 3. Configure Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
VAPID_EMAIL=mailto:your-email@example.com
```

### 4. Run Database Migration

Execute in Supabase SQL Editor:

```sql
-- Run: supabase/migrations/20241122000000_add_push_subscriptions.sql
```

### 5. Test

1. Start dev server: `npm run dev`
2. Navigate to Settings → Notifications
3. Click "Enable Browser Push Notifications"
4. Grant permission when prompted
5. Create a reminder
6. Receive push notification when reminder fires

## File Structure

```
├── app/
│   └── api/
│       └── push-subscriptions/
│           ├── route.ts                    # Register/unregister subscriptions
│           └── vapid-public-key/
│               └── route.ts                # Get VAPID public key
├── hooks/
│   └── use-push-subscription.ts            # Client-side subscription hook
├── lib/
│   └── push-notification.ts                # Server-side push sending
├── public/
│   └── sw.js                               # Service worker
└── supabase/
    └── migrations/
        └── 20241122000000_add_push_subscriptions.sql
```

## How It Works

### 1. User Subscribes

1. User clicks "Enable Browser Push Notifications"
2. Browser requests notification permission
3. Service worker is registered
4. Push subscription is created
5. Subscription is sent to `/api/push-subscriptions`
6. Stored in `push_subscriptions` table

### 2. Reminder Triggers

1. QStash sends webhook to `/api/reminders/send`
2. System checks user's `push_notifications` preference
3. If enabled, calls `sendPushNotification()`
4. Fetches user's subscriptions from database
5. Sends push notification to each subscription
6. Service worker receives notification
7. Browser shows notification to user

### 3. User Clicks Notification

1. Service worker handles click event
2. Opens/closes app window
3. Navigates to reminder URL if specified

## Features

- ✅ Multiple device support (one user, multiple subscriptions)
- ✅ Automatic cleanup of invalid subscriptions
- ✅ Respects user notification preferences
- ✅ Works alongside email and in-app notifications
- ✅ Service worker handles offline notifications
- ✅ Click to open reminder

## Browser Support

- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (macOS 13+ & iOS 16.4+)
- ❌ Safari (older versions)

**Note:** HTTPS required for production (localhost is OK for development)

## Troubleshooting

See `docs/vapid-keys-setup.md` for detailed troubleshooting.

### Common Issues

1. **"Push notifications not supported"**
   - Browser doesn't support Web Push API
   - Try Chrome/Firefox/Safari latest version

2. **"VAPID keys not configured"**
   - Check `.env.local` has all VAPID variables
   - Restart dev server after adding

3. **"Permission denied"**
   - User blocked notifications
   - Enable in browser settings

4. **"Subscription failed"**
   - Service worker not registered
   - Check browser console for errors
   - Ensure `/sw.js` is accessible

## Security

- VAPID private key never exposed to client
- Row Level Security on push_subscriptions table
- Users can only manage their own subscriptions
- HTTPS required in production

## Next Steps

- [ ] Add notification actions (snooze, dismiss)
- [ ] Customize notification icons/badges
- [ ] Add notification scheduling
- [ ] Implement notification grouping
- [ ] Add analytics for notification delivery

