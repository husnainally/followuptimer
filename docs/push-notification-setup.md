# Push Notification Setup Guide

## Current Issue

Test results show: `"No push subscriptions found. Please enable push notifications in settings."`

## Solution

### Step 1: Enable Push Notifications in Settings

1. **Login to your application:**
   - Go to https://followuptimer.vercel.app/login
   - Sign in with your account

2. **Navigate to Settings:**
   - Click on your profile/settings icon
   - Go to **Settings → Notifications**

3. **Enable Push Notifications:**
   - Toggle **"Browser Push Notifications"** to **ON**
   - Your browser will prompt for notification permission
   - Click **"Allow"** when prompted

4. **Verify Subscription:**
   - After enabling, the subscription should be saved automatically
   - Check browser console for any errors

### Step 2: Verify Subscription in Database

You can verify the subscription was created:

```sql
SELECT * FROM push_subscriptions 
WHERE user_id = 'your-user-id';
```

You should see a row with:
- `endpoint` - Push service endpoint
- `p256dh` - Public key
- `auth` - Authentication secret

### Step 3: Test Push Notifications

1. **Use Test Endpoint:**
   ```javascript
   // In browser console (while logged in)
   fetch('/api/notifications/test', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ type: 'push' })
   })
   .then(r => r.json())
   .then(data => console.log(data));
   ```

2. **Create a Test Reminder:**
   - Create a reminder set to 2-3 minutes in the future
   - Ensure push notifications are enabled in your profile
   - Wait for the reminder to trigger
   - You should receive a browser notification

## Troubleshooting

### Browser Permission Denied

**Issue:** Browser shows "Notifications blocked"

**Solution:**
1. Click the lock icon in your browser's address bar
2. Find "Notifications" setting
3. Change from "Block" to "Allow"
4. Refresh the page
5. Try enabling push notifications again

### Service Worker Not Registered

**Issue:** Service worker not loading

**Check:**
1. Go to `https://followuptimer.vercel.app/sw.js`
2. Should return service worker code (not 404)
3. Check browser console for service worker errors

**Solution:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check if service worker file exists in `public/sw.js`

### Subscription Not Saving

**Issue:** Toggle doesn't save subscription

**Check:**
1. Open browser DevTools → Console
2. Look for errors when toggling push notifications
3. Check Network tab for failed requests to `/api/push-subscriptions`

**Solution:**
- Check Vercel logs for API errors
- Verify VAPID keys are configured
- Ensure user is authenticated

### Push Notifications Enabled But Not Receiving

**Check:**
1. Verify subscription exists in database
2. Check Vercel logs for `[Push]` messages
3. Verify `push_notifications = true` in profiles table
4. Check browser notification settings

**Solution:**
- Re-enable push notifications (toggle OFF then ON)
- Grant permission again if needed
- Check Vercel logs for specific error messages

## Browser Compatibility

Push notifications work in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ✅ Opera

**Note:** Push notifications require HTTPS in production (Vercel provides this automatically).

## Testing Checklist

- [ ] User is logged in
- [ ] Push notifications enabled in Settings
- [ ] Browser permission granted
- [ ] Subscription exists in database
- [ ] Service worker registered
- [ ] VAPID keys configured in Vercel
- [ ] Test endpoint returns success
- [ ] Browser notifications appear

## Quick Test

Run this in browser console (while logged in):

```javascript
// Check if push is supported
console.log('Push supported:', 'serviceWorker' in navigator && 'PushManager' in window);

// Check permission
console.log('Permission:', Notification.permission);

// Check subscription
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Has subscription:', !!sub);
    if (sub) {
      console.log('Endpoint:', sub.endpoint);
    }
  });
});
```

