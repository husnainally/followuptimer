# Quick Setup: Using Resend Test Domain

## For Quick Testing (No Domain Required)

If you want to test email notifications **without buying a domain**, you can use Resend's test domain.

### Step 1: Add Your Email to Resend Test Emails

1. Go to [Resend Dashboard](https://resend.com)
2. Navigate to **Settings → Test Emails**
3. Click **"Add Test Email"**
4. Enter your email: `alyhusnaiin@gmail.com`
5. Verify the email (check your inbox for verification link)

### Step 2: Update Vercel Environment Variable (Optional)

The code now defaults to `onboarding@resend.dev` if `RESEND_FROM` is not set. However, you can explicitly set it:

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add/Update: `RESEND_FROM`
3. Value: `onboarding@resend.dev`
4. Make sure it's set for **Production** environment
5. Redeploy

### Step 3: Test

```javascript
// In browser console (while logged in)
fetch('/api/notifications/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'email' })
})
.then(r => r.json())
.then(console.log);
```

## Important Notes

⚠️ **Limitations:**
- Test domain **only works for verified test emails** in your Resend dashboard
- You can only send to emails you've added to the test emails list
- This is **not suitable for production** where users need to receive emails

✅ **For Production:**
- You **must** use your own verified domain
- See `docs/resend-domain-setup.md` for full domain setup

## Current Configuration

The code now uses `onboarding@resend.dev` as the default fallback, so:
- ✅ No need to set `RESEND_FROM` if using test domain
- ✅ Just add your email to Resend test emails
- ✅ Works immediately for testing

## Next Steps

1. ✅ Add your email to Resend test emails
2. ✅ Test email notifications
3. ✅ For production: Set up your own domain (see `docs/resend-domain-setup.md`)

