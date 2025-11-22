# Resend Domain Setup Guide

## Problem

Resend doesn't allow free public domains like `followuptimer.vercel.app`. You need to use a **custom domain you own**.

## Solution: Use Your Own Domain

### Option 1: Use an Existing Domain

If you already own a domain (e.g., `yourdomain.com`):

1. **Add Domain in Resend:**
   - Go to [Resend Domains](https://resend.com/domains)
   - Click "Add Domain"
   - Enter your domain (e.g., `yourdomain.com`)
   - Select your region
   - Click "Add Domain"

2. **Verify Domain:**
   - Resend will provide DNS records (SPF, DKIM, DMARC)
   - Add these records to your domain's DNS settings
   - Wait for verification (usually 5-10 minutes)

3. **Update Environment Variable:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Update `RESEND_FROM` to: `FollowUpTimer <noreply@yourdomain.com>`
   - Make sure it's set for **Production** environment
   - Redeploy your application

### Option 2: Buy a Domain

If you don't own a domain yet:

1. **Buy a Domain:**
   - Use a registrar like:
     - [Namecheap](https://www.namecheap.com) (~$10-15/year)
     - [Google Domains](https://domains.google) (~$12/year)
     - [Cloudflare](https://www.cloudflare.com/products/registrar) (~$8-10/year)
   - Choose a domain like: `followuptimer.com` or `followuptimer.app`

2. **Add Domain in Resend:**
   - Go to [Resend Domains](https://resend.com/domains)
   - Click "Add Domain"
   - Enter your new domain
   - Select your region
   - Click "Add Domain"

3. **Configure DNS:**
   - Go to your domain registrar's DNS settings
   - Add the DNS records provided by Resend:
     - **SPF Record** (TXT)
     - **DKIM Records** (TXT)
     - **DMARC Record** (TXT) - Optional but recommended
   - Save and wait for verification (5-10 minutes)

4. **Update Environment Variable:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add/Update `RESEND_FROM`: `FollowUpTimer <noreply@yourdomain.com>`
   - Make sure it's set for **Production** environment
   - Redeploy your application

### Option 3: Use Resend's Test Domain (Development Only)

For **testing only** (not production):

1. **Use Resend's Test Domain:**
   - Resend provides `onboarding@resend.dev` for testing
   - This only works for sending to **verified test emails**

2. **Add Test Email:**
   - Go to Resend Dashboard → Settings → Test Emails
   - Add your email address
   - Verify it

3. **Update Environment Variable:**
   ```env
   RESEND_FROM=onboarding@resend.dev
   ```

⚠️ **Note:** Test domain only works for verified test emails. For production, you **must** use your own domain.

## Quick Setup Steps

1. ✅ Own a domain (or buy one)
2. ✅ Add domain in Resend Dashboard
3. ✅ Add DNS records to your domain
4. ✅ Wait for domain verification
5. ✅ Set `RESEND_FROM` in Vercel: `FollowUpTimer <noreply@yourdomain.com>`
6. ✅ Redeploy application
7. ✅ Test with `/api/notifications/test` endpoint

## DNS Records Example

When you add a domain in Resend, you'll get records like:

```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all

Type: TXT
Name: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

Add these to your domain's DNS settings (usually in your registrar's dashboard).

## Verification Checklist

- [ ] Domain added in Resend Dashboard
- [ ] DNS records added to domain registrar
- [ ] Domain verified in Resend (green checkmark)
- [ ] `RESEND_FROM` environment variable set in Vercel
- [ ] Environment variable set for **Production** environment
- [ ] Application redeployed
- [ ] Test endpoint returns success: `/api/notifications/test`

## Troubleshooting

### Domain Not Verifying

- **Check DNS propagation:** Use [dnschecker.org](https://dnschecker.org) to verify records are propagated
- **Wait longer:** DNS changes can take up to 48 hours (usually 5-10 minutes)
- **Check record format:** Ensure TXT records are exactly as provided by Resend
- **Check for typos:** Verify domain name and record values

### Emails Still Not Sending

- **Verify domain status:** Check Resend Dashboard → Domains → Your domain shows "Verified"
- **Check environment variable:** Ensure `RESEND_FROM` matches your verified domain
- **Check Vercel logs:** Look for `[Email]` error messages
- **Test endpoint:** Use `/api/notifications/test` to see specific errors

## Cost

- **Domain:** ~$8-15/year (one-time purchase)
- **Resend:** Free tier includes 3,000 emails/month
- **Total:** ~$8-15/year for domain + free email service

