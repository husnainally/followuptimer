# VAPID Keys Setup Guide

VAPID (Voluntary Application Server Identification) keys are required for Web Push API to work. This guide will help you generate and configure them.

## Generate VAPID Keys

### Option 1: Using Node.js (Recommended)

1. Install web-push globally:
   ```bash
   npm install -g web-push
   ```

2. Generate VAPID keys:
   ```bash
   web-push generate-vapid-keys
   ```

3. This will output something like:
   ```
   Public Key: BKxQx4cG2aQv_8J3Q7xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5
   Private Key: vJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5xJ5
   ```

### Option 2: Using Online Tool

1. Visit: https://web-push-codelab.glitch.me/
2. Generate keys
3. Copy both public and private keys

### Option 3: Programmatically

Create a script `generate-vapid-keys.js`:

```javascript
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

Run: `node generate-vapid-keys.js`

## Configure Environment Variables

Add these to your `.env.local` file:

```env
# VAPID Keys for Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key-here
VAPID_PRIVATE_KEY=your-private-key-here
VAPID_EMAIL=mailto:your-email@example.com
```

**Important Notes:**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is exposed to the client (safe to expose)
- `VAPID_PRIVATE_KEY` is server-only (NEVER expose to client)
- `VAPID_EMAIL` is a contact email (format: `mailto:email@example.com`)

## Production Setup

1. Generate production keys (keep them secure)
2. Add to your hosting platform (Vercel, etc.) environment variables
3. Restart your application after adding the keys

## Testing

After setting up VAPID keys:

1. Navigate to Settings → Notifications
2. Click "Enable Browser Push Notifications"
3. Grant permission when prompted
4. Create a test reminder
5. You should receive a push notification when the reminder fires

## Troubleshooting

### Push Notifications Not Working

1. **Check VAPID keys are set:**
   - Verify environment variables are loaded
   - Check browser console for errors

2. **Check browser support:**
   - Chrome, Edge, Firefox, Safari (macOS/iOS 16.4+) support Web Push
   - Must use HTTPS (except localhost)

3. **Check service worker:**
   - Service worker must be registered at `/sw.js`
   - Check browser DevTools → Application → Service Workers

4. **Check subscription:**
   - Verify subscription is saved in database
   - Check `push_subscriptions` table

5. **Check permissions:**
   - Browser notification permission must be granted
   - Check browser settings if blocked

### Common Errors

**"VAPID public key not configured"**
- Ensure `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is set in `.env.local`
- Restart dev server after adding

**"VAPID keys not configured"**
- Ensure both public and private keys are set
- Check `VAPID_PRIVATE_KEY` is set (server-side only)

**"Push subscription failed"**
- Browser may not support Web Push
- HTTPS required (except localhost)
- Permission may be denied

## Security Notes

- Never commit VAPID keys to version control
- Keep private key secure
- Use different keys for development and production
- Rotate keys periodically in production

