# Waitlist Feature Guide

## Overview

The waitlist system allows you to collect emails from interested users before launch and automatically send them welcome emails.

## User Journey

1. **Visit Landing Page**
   - Home page (`/`) - Embedded form
   - Dedicated page (`/waitlist`) - Full experience

2. **Submit Email**
   - Client-side validation
   - Duplicate detection
   - Success confirmation

3. **Receive Welcome Email**
   - Automatic send via Resend
   - Beautiful HTML template
   - Brand-consistent design

## Pages

### `/` - Home Page
- Quick waitlist signup
- Minimal friction
- Social proof display

### `/waitlist` - Dedicated Waitlist Page
- Full landing experience
- Feature previews
- Detailed information
- Social proof

### `/admin/waitlist` - Admin Panel
- View all entries
- Export to CSV
- Statistics
- Requires authentication

## API Endpoints

### `POST /api/waitlist`
Add email to waitlist and send welcome email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Responses:**
- `201` - Successfully added
- `400` - Invalid email or duplicate
- `500` - Server error

### `GET /api/waitlist`
Retrieve all waitlist entries (authenticated)

**Response:**
```json
{
  "waitlist": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100
}
```

## Components

### `WaitlistForm`
Reusable form component with:
- Email validation
- Loading states
- Error handling
- Success message
- Toast notifications

**Usage:**
```tsx
import { WaitlistForm } from '@/components/waitlist-form'

<WaitlistForm />
```

## Email Template

The welcome email is defined in `lib/waitlist-email.ts`

### Customization

**Subject Line:**
```typescript
subject: '🎉 Welcome to FollowUpTimer Waitlist!',
```

**Sender:**
```typescript
from: 'FollowUpTimer <no-reply@yourdomain.com>'
```

**Content:**
- HTML template with gradient header
- Feature list
- Call-to-action
- Brand colors

### Template Variables

Currently static, but can be extended to include:
- User name
- Referral link
- Position in waitlist
- Estimated launch date

## Admin Features

### Statistics
- Total signups
- Latest signup
- Growth trends

### Export
- Download as CSV
- Includes email and signup date
- Filename with timestamp

### Management
- View all entries
- Search functionality (TODO)
- Bulk actions (TODO)

## Database Schema

```sql
create table public.waitlist (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### RLS Policy
```sql
create policy "Anyone can insert into waitlist"
  on public.waitlist for insert
  with check (true);
```

## Extending the Feature

### Add Custom Fields

1. **Update Database:**
```sql
alter table waitlist add column name text;
alter table waitlist add column company text;
```

2. **Update Schema:**
```typescript
// lib/schemas.ts
export const waitlistSchema = z.object({
  email: emailSchema,
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
});
```

3. **Update Form:**
```tsx
// components/waitlist-form.tsx
<ControlledInput name="name" label="Name" />
<ControlledInput name="company" label="Company (optional)" />
```

### Add Email Preferences

Track which features users are interested in:

```sql
alter table waitlist add column interests text[];
```

Update form with checkboxes for different features.

### Add Referral Tracking

```sql
alter table waitlist add column referrer text;
alter table waitlist add column utm_source text;
alter table waitlist add column utm_campaign text;
```

Capture URL parameters on signup.

## Testing

### Local Testing

1. Start development server:
```bash
npm run dev
```

2. Visit `http://localhost:3000/waitlist`

3. Test email flow (check Resend dashboard)

### Email Testing

For development, Resend allows sending to verified emails:
1. Go to Resend dashboard
2. Add test emails under Settings > Domains
3. Use those emails for testing

### API Testing

```bash
# Add to waitlist
curl -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Get waitlist (requires auth)
curl http://localhost:3000/api/waitlist \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

1. **Email Deliverability**
   - Verify your domain in Resend
   - Set up SPF, DKIM, DMARC records
   - Monitor bounce rates

2. **Data Privacy**
   - Add privacy policy link
   - GDPR compliance (if applicable)
   - Allow unsubscribe option

3. **User Experience**
   - Clear success message
   - Set expectations (when will launch be?)
   - Provide social proof

4. **Security**
   - Rate limit API endpoint
   - Validate email format
   - Prevent spam submissions

## Troubleshooting

### Emails Not Sending

1. Check Resend API key in `.env.local`
2. Verify sender domain
3. Check Resend dashboard for errors
4. Look at server logs

### Duplicate Signups

The database prevents duplicates with `UNIQUE` constraint on email field. The API returns a friendly error message.

### Admin Page Not Loading

1. Ensure user is authenticated
2. Check RLS policies
3. Verify API route returns data

## Future Enhancements

- [ ] Email drip campaign
- [ ] Referral program
- [ ] Position in waitlist display
- [ ] Launch notification system
- [ ] A/B testing different CTAs
- [ ] Analytics integration
- [ ] Segment by interests
- [ ] Automated follow-ups
