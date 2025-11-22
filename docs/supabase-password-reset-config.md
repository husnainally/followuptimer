# Supabase Password Reset Configuration

This guide explains what needs to be configured in Supabase for the password reset functionality to work correctly.

## Required Supabase Settings

### 1. Site URL Configuration

**Location:** Supabase Dashboard → Authentication → URL Configuration

Set the **Site URL** to your application's base URL:

- **Local Development:**
  ```
  http://localhost:3000
  ```

- **Production:**
  ```
  https://your-app.vercel.app
  ```
  or
  ```
  https://yourdomain.com
  ```

### 2. Redirect URLs (Allowlist)

**Location:** Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

Add these URLs to the **Redirect URLs** list:

- **Local Development:**
  ```
  http://localhost:3000/auth/callback
  http://localhost:3000/auth/callback?next=/auth/update-password
  ```

- **Production:**
  ```
  https://your-app.vercel.app/auth/callback
  https://your-app.vercel.app/auth/callback?next=/auth/update-password
  https://yourdomain.com/auth/callback
  https://yourdomain.com/auth/callback?next=/auth/update-password
  ```

> **Important:** Add wildcard patterns if needed:
> ```
> http://localhost:3000/auth/callback*
> https://*.vercel.app/auth/callback*
> ```

### 3. Email Template Configuration

**Location:** Supabase Dashboard → Authentication → Email Templates → Reset Password

The default password reset email template will be used. You can customize it:

**Default Email Content:**
- Subject: `Reset Your Password`
- Contains a link with the redirect URL

**Customization Options:**
- Update the email subject
- Customize the email body
- Use variables like `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`

**Example Custom Template:**
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
```

### 4. Email Provider Configuration

**Location:** Supabase Dashboard → Authentication → Email Auth

Ensure that:
- ✅ **Enable Email Auth** is turned ON
- ✅ **Confirm email** is configured (can be disabled for testing)
- ✅ **Email provider** is set up (Supabase SMTP or custom SMTP)

**For Production:**
- Use custom SMTP (recommended)
- Configure SPF, DKIM, and DMARC records
- Set up email domain verification

### 5. Password Reset Settings

**Location:** Supabase Dashboard → Authentication → Email Auth → Password Reset

Configure:
- **Reset token expiry:** Default is 1 hour (3600 seconds)
- **Require email confirmation:** Can be disabled for development

## Testing the Password Reset Flow

### 1. Test Locally

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/forgot-password`

3. Enter an email address that exists in your Supabase Auth users

4. Check your email (or Supabase logs if using test emails)

5. Click the reset link in the email

6. Should redirect to `http://localhost:3000/auth/update-password`

7. Enter a new password and submit

### 2. Verify Configuration

If password reset emails aren't working, check:

1. **Site URL** matches your application URL exactly
2. **Redirect URLs** include your callback URL
3. **Email provider** is properly configured
4. **Check Supabase logs** (Dashboard → Logs → Auth) for errors
5. **Check spam folder** for the reset email

## Common Issues

### Issue: "Invalid redirect URL" error

**Solution:**
- Ensure the callback URL is in the Redirect URLs allowlist
- Check that the Site URL matches your application URL
- Verify the redirect URL format in the code matches exactly

### Issue: Reset email not received

**Solution:**
- Check Supabase Auth logs for errors
- Verify email provider is configured
- Check spam/junk folder
- Ensure the email exists in Supabase Auth users
- For development, check Supabase Dashboard → Authentication → Users

### Issue: Session expired on update-password page

**Solution:**
- The reset token expires after 1 hour (default)
- Request a new password reset link
- Check that the callback route is processing the code correctly
- Verify the session is being created after code exchange

### Issue: Redirect loop

**Solution:**
- Check middleware isn't redirecting authenticated users incorrectly
- Verify the callback route is handling the `next` parameter correctly
- Ensure the update-password page allows authenticated users

## Quick Configuration Checklist

- [ ] Site URL is set correctly
- [ ] Redirect URLs include callback URL
- [ ] Email provider is configured
- [ ] Password reset email template is set up
- [ ] Test password reset flow locally
- [ ] Verify emails are being sent
- [ ] Test complete flow: forgot → email → reset → login

## Environment Variables

No additional environment variables are needed beyond the standard Supabase setup:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Additional Notes

- The password reset flow uses Supabase's built-in `resetPasswordForEmail()` method
- The redirect URL is dynamically generated using `window.location.origin`
- The callback route handles the OAuth code exchange
- After successful password update, users are redirected to the login page
- Session verification ensures users can only update password with a valid reset token
