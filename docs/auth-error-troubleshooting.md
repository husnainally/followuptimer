# Authentication Error Troubleshooting

## Issue: "Authentication Error" Page

When clicking the email confirmation link, you see the error page. Here's how to fix it:

## Common Causes

### 1. Supabase Redirect URL Not Configured

**Most Common Issue:** The redirect URL in Supabase doesn't match your production URL.

**Fix:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication → URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   https://followuptimer.vercel.app/auth/callback
   ```
5. Under **Site URL**, set:
   ```
   https://followuptimer.vercel.app
   ```
6. Click **Save**

### 2. Expired Confirmation Link

**Issue:** Confirmation links expire after a certain time (default: 1 hour).

**Fix:**
1. Go to **Authentication → Email Templates** in Supabase
2. Check the expiration time
3. Request a new confirmation email:
   - Go to `/forgot-password`
   - Enter your email
   - Or use the "Request New Confirmation Email" button on the error page

### 3. Code Already Used

**Issue:** Confirmation link was already used (e.g., clicked twice).

**Fix:**
- Just try logging in directly at `/login`
- If email confirmation is required, request a new confirmation email

### 4. Email Confirmation Disabled

**Quick Fix for Testing:** Disable email confirmation temporarily.

1. Go to **Authentication → Settings** in Supabase
2. Under **Email Auth**, toggle off **"Enable email confirmations"**
3. Users can now sign up without email confirmation

⚠️ **Note:** Only disable for testing. Re-enable for production.

## Verify Configuration

### Check Supabase Settings

1. **Site URL:**
   - Should be: `https://followuptimer.vercel.app`
   - Found in: Authentication → URL Configuration

2. **Redirect URLs:**
   - Should include: `https://followuptimer.vercel.app/auth/callback`
   - Found in: Authentication → URL Configuration

3. **Email Confirmation:**
   - Check if enabled/disabled
   - Found in: Authentication → Settings

### Check Your Code

The callback route expects:
- URL: `/auth/callback`
- Query parameter: `code` (from Supabase email)

## Testing

### Test Email Confirmation Flow

1. **Sign up** with a new email
2. **Check email** for confirmation link
3. **Click link** - should redirect to dashboard
4. If error, check:
   - Browser console for errors
   - Vercel logs for server errors
   - Supabase logs for auth errors

### Test Without Email Confirmation

1. Disable email confirmation in Supabase
2. Sign up
3. Should redirect directly to dashboard

## Error Messages

The improved error page now shows specific messages:

- **"This confirmation link has expired"** → Request new confirmation email
- **"This confirmation link is invalid"** → Check Supabase redirect URL configuration
- **"This confirmation link has already been used"** → Try logging in directly
- **"No confirmation code provided"** → Check email link format

## Quick Fixes

### Fix 1: Update Supabase Redirect URL

1. Supabase Dashboard → Authentication → URL Configuration
2. Add: `https://followuptimer.vercel.app/auth/callback`
3. Save
4. Try confirmation link again

### Fix 2: Disable Email Confirmation (Testing)

1. Supabase Dashboard → Authentication → Settings
2. Toggle off "Enable email confirmations"
3. Save
4. New signups won't require confirmation

### Fix 3: Request New Confirmation

1. Go to `/forgot-password`
2. Enter your email
3. Check for new confirmation email
4. Click the new link

## Production Checklist

- [ ] Site URL set to production URL in Supabase
- [ ] Redirect URL includes `/auth/callback` path
- [ ] Email confirmation enabled (for security)
- [ ] Email templates configured
- [ ] Test signup flow works
- [ ] Test confirmation link works
- [ ] Error page shows helpful messages

## Still Not Working?

1. **Check Vercel Logs:**
   - Look for `[Auth Callback]` messages
   - Check for specific error codes

2. **Check Supabase Logs:**
   - Go to Logs → Auth
   - Look for failed authentication attempts

3. **Check Browser Console:**
   - Open DevTools → Console
   - Look for JavaScript errors

4. **Verify Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` is set
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
   - Both match your Supabase project

## Next Steps

After fixing the configuration:
1. Deploy the updated error page
2. Test signup flow
3. Verify confirmation link works
4. Check error messages are helpful

