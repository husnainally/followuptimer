# FollowUpTimer - Setup Guide Flow

A Next.js reminder app with affirmations, powered by Supabase, Resend, and QStash.      

## 🚀 Quick Start

### Prerequisites  

- Node.js 18+ installed
- A Supabase account
- A Resend account (for email notifications)
- An Upstash QStash account (for scheduled reminders)   

---

## 📋 Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
git clone [<your-repo-url>](https://github.com/husnainally/followuptimer)
cd followuptimer
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Go to **Project Settings > API** and copy:
   - Project URL
   - `anon` public key

4. Update your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

In your Supabase project dashboard:

1. Go to **SQL Editor**
2. Create a new query
3. Copy the contents of `supabase/migrations/20241119000000_initial_schema.sql`
4. Run the query


This will create:
- `profiles` table (user preferences)
- `reminders` table (scheduled reminders)
- `sent_logs` table (delivery logs)
- `waitlist` table (email waitlist)
- Row Level Security policies
- Automatic triggers for user profile creation

### 4. Set Up Resend for Email

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your domain (or use their test domain for development)
3. Create an API key
4. Add to `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM=FollowUpTimer <no-reply@yourdomain.com>
```

> **Note:** For development, you can use `onboarding@resend.dev` as the sender

### 5. Set Up QStash for Scheduling

1. Go to [upstash.com](https://upstash.com) and create an account
2. Create a new QStash instance
3. Copy your credentials from the dashboard
4. Add to `.env.local`:

```env
QSTASH_TOKEN=your-qstash-token
QSTASH_CURRENT_SIGNING_KEY=your-signing-key
QSTASH_NEXT_SIGNING_KEY=your-next-signing-key
```

### 6. Configure App URL

For local development:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, update this to your deployed URL.

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🔑 Authentication Setup

The app uses Supabase Auth with email/password authentication.

### Email Confirmation (Optional)

By default, Supabase requires email confirmation. To disable this for development:

1. Go to **Authentication > Settings** in Supabase
2. Under **Email Auth**, toggle off "Enable email confirmations"

### Email Templates

Customize auth emails in **Authentication > Email Templates**:
- Confirmation email
- Password reset email
- Magic link email

---

## 📧 Email Configuration

### Testing Emails Locally

For development, Resend allows sending to verified emails. Add test emails in your Resend dashboard under **Settings > Domains**.

### Production Email Setup

1. Verify your domain in Resend
2. Add DNS records (SPF, DKIM, DMARC)
3. Update `RESEND_FROM` with your domain

---

## ⏰ QStash Webhook Configuration

QStash needs a publicly accessible URL to send reminders. For local development:

### Option 1: Use ngrok

```bash
ngrok http 3000
```

Copy the HTTPS URL and update:

```env
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
```

### Option 2: Deploy to Vercel

Deploy to Vercel and use the production URL:

```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## 🗄️ Database Schema

### Tables

**profiles**
- User preferences (tone, notification settings)
- Auto-created when user signs up

**reminders**
- User's scheduled reminders
- Links to QStash message IDs

**sent_logs**
- Tracks delivery attempts
- Stores success/failure status

**waitlist**
- Captures pre-launch emails
- Sends welcome emails automatically

---

## 📋 Waitlist Flow

The application includes a complete waitlist system for pre-launch signups:

### Features

1. **Public Waitlist Page** (`/waitlist`)
   - Dedicated landing page for signups
   - Social proof with user avatars
   - Feature previews

2. **Home Page Integration** (`/`)
   - Embedded waitlist form on homepage
   - Clean, minimal design

3. **Welcome Emails**
   - Automatic welcome email on signup
   - Beautiful HTML template
   - Non-blocking (signup succeeds even if email fails)

4. **Admin Management** (`/admin/waitlist`)
   - View all waitlist entries
   - Export to CSV
   - Statistics dashboard
   - Protected route (requires authentication)

### Customization

**Email Template**: Edit `lib/waitlist-email.ts` to customize:
- Email subject and content
- Branding and colors
- Call-to-action links

**Waitlist Form**: Modify `components/waitlist-form.tsx` for:
- Additional fields (name, company, etc.)
- Custom validation
- Different success messages

---

## 🛠️ Development

### Project Structure

```
app/
  (auth)/          # Login, signup, password reset
  (dashboard)/     # Main dashboard and reminders table
  (onboarding)/    # Tone and notification setup
  api/             # API routes for reminders, waitlist
  auth/            # Auth callback handler
  reminders/       # Create and edit reminder pages

lib/
  supabase/        # Supabase clients (client, server, middleware)
  affirmations.ts  # Affirmation message generator
  email.ts         # Resend email sender
  qstash.ts        # QStash scheduling functions
  schemas.ts       # Zod validation schemas

supabase/
  migrations/      # Database migration SQL files
```

### Key Features

- **Authentication**: Email/password with Supabase Auth
- **Onboarding**: Tone selection and notification preferences
- **Reminders**: Create, edit, delete, snooze, dismiss
- **Scheduling**: Automatic QStash scheduling for future reminders
- **Emails**: Resend integration with affirmations
- **Real-time**: Dashboard updates from Supabase
- **Waitlist**: Email capture with welcome emails
- **Admin**: Waitlist management and export

---

## 🚢 Deployment

### Deploy to Vercel

```bash
vercel
```

Don't forget to:
1. Add all environment variables in Vercel dashboard
2. Update `NEXT_PUBLIC_APP_URL` to your production URL
3. Enable Vercel's cron jobs if needed

### Post-Deployment

1. Test authentication flow
2. Create a test reminder
3. Verify QStash webhook receives requests
4. Check email delivery in Resend dashboard

---

## 🐛 Troubleshooting

### Reminders not sending

- Check QStash logs for webhook delivery status
- Verify `NEXT_PUBLIC_APP_URL` is correct and publicly accessible
- Ensure `/api/reminders/send` endpoint is not blocked

### Emails not arriving

- Check Resend dashboard for send status
- Verify `RESEND_API_KEY` is correct
- Check spam folder
- Ensure sender domain is verified (for production)

### Authentication errors

- Verify Supabase credentials in `.env.local`
- Check Supabase Auth settings
- Ensure RLS policies are applied correctly

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [QStash Documentation](https://upstash.com/docs/qstash)

---

## 🤝 Support

For issues or questions, please open an issue on GitHub or contact support.
