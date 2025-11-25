# Service Worker Troubleshooting

## Issue: Service Worker Not Loading

If you don't see `sw.js` in the Network tab, here's how to fix it:

## Solution 1: Automatic Registration (Implemented)

I've added a `ServiceWorkerRegister` component that automatically registers the service worker when the page loads. This ensures:

1. ✅ Service worker is registered on every page load
2. ✅ Available before push subscription attempts
3. ✅ Handles updates automatically

## Verify Service Worker is Working

### 1. Check Browser Console

Open DevTools → Console and look for:
```
[SW] Service Worker registered: https://followuptimer.vercel.app/
```

### 2. Check Application Tab

1. Open DevTools → Application (Chrome) or Storage (Firefox)
2. Go to "Service Workers" section
3. You should see:
   - Status: **activated and is running**
   - Source: `/sw.js`
   - Scope: `/`

### 3. Check Network Tab

1. Open DevTools → Network
2. Refresh the page
3. Filter by "JS" or search for "sw.js"
4. You should see a request to `/sw.js` with status 200

### 4. Test Service Worker Endpoint

```javascript
// In browser console
fetch('/api/service-worker-check')
  .then(r => r.json())
  .then(console.log);
```

Should return:
```json
{
  "exists": true,
  "size": 1234,
  "message": "Service worker file exists and is readable"
}
```

## Common Issues

### Issue 1: Service Worker Not Registering

**Symptoms:**
- No `[SW]` messages in console
- Service worker not in Application tab

**Solutions:**
1. **Check HTTPS:** Service workers require HTTPS (or localhost)
   - ✅ Production: Vercel provides HTTPS automatically
   - ✅ Local: `http://localhost:3000` works

2. **Clear Cache:**
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```
   Then refresh the page

3. **Check Browser Support:**
   ```javascript
   // In browser console
   console.log('SW supported:', 'serviceWorker' in navigator);
   ```

### Issue 2: Service Worker File Not Found (404)

**Symptoms:**
- Network tab shows `/sw.js` with status 404
- Console shows registration error

**Solutions:**
1. **Verify file exists:**
   - Check `public/sw.js` exists in your project
   - File should be in `public/` folder (not `app/` or `components/`)

2. **Check Next.js build:**
   - Files in `public/` are served from root
   - `/sw.js` should map to `public/sw.js`

3. **Verify deployment:**
   - Make sure `public/sw.js` is included in your git repository
   - Check Vercel build logs for any errors

### Issue 3: Service Worker Not Updating

**Symptoms:**
- Old service worker still running
- Changes not taking effect

**Solutions:**
1. **Unregister old service worker:**
   ```javascript
   // In browser console
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```

2. **Hard refresh:**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

3. **Clear site data:**
   - DevTools → Application → Clear storage
   - Click "Clear site data"

## Manual Registration Test

If automatic registration isn't working, test manually:

```javascript
// In browser console
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(reg => {
      console.log('✅ Service Worker registered:', reg.scope);
      console.log('Registration:', reg);
    })
    .catch(error => {
      console.error('❌ Service Worker registration failed:', error);
    });
} else {
  console.log('❌ Service Workers not supported');
}
```

## Expected Behavior

After the fix, you should see:

1. **On page load:**
   - Console: `[SW] Service Worker registered: https://...`

2. **In Network tab:**
   - Request to `/sw.js` with status 200
   - Response headers include `Content-Type: application/javascript`

3. **In Application tab:**
   - Service worker listed and active
   - Scope shows `/`

4. **When subscribing to push:**
   - No errors about service worker not being ready
   - Subscription created successfully

## Debugging Checklist

- [ ] Service worker file exists in `public/sw.js`
- [ ] File is accessible at `/sw.js` (check Network tab)
- [ ] Console shows `[SW] Service Worker registered`
- [ ] Application tab shows service worker as active
- [ ] No 404 errors for `/sw.js`
- [ ] HTTPS is enabled (or using localhost)
- [ ] Browser supports service workers
- [ ] No console errors related to service worker

## Next Steps

If service worker still isn't loading:

1. Check Vercel build logs
2. Verify `public/sw.js` is in your repository
3. Check browser console for specific errors
4. Test the `/api/service-worker-check` endpoint
5. Try manual registration (code above)

