# ⏰ FollowUpTimer

A smart reminder application with motivational affirmations, built with Next.js, Supabase, Resend, and QStash.

## ✨ Features

- 🔐 **Authentication** - Secure email/password auth with Supabase
- 📅 **Smart Reminders** - Schedule reminders with custom dates and times
- 💬 **Affirmations** - Choose from motivational, professional, or playful tones
- 📧 **Email Notifications** - Beautiful emails powered by Resend
- 📬 **Email Open Tracking** - Know when recipients open your reminder emails
- ⏱️ **QStash Scheduling** - Reliable reminder delivery with Upstash QStash
- 📊 **Dashboard** - Track all your reminders in one place
- 📋 **Waitlist System** - Complete pre-launch signup flow with welcome emails
- 👨‍💼 **Admin Panel** - Manage waitlist entries and export data
- 🎨 **Modern UI** - Clean, responsive interface with Tailwind CSS
- 🌙 **Dark Mode** - Full dark mode support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Resend account (for emails)
- Upstash QStash account (for scheduling)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd followuptimer
```

1. Install dependencies:

```bash
npm install
```

1. Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

1. Set up your environment variables (see [SETUP.md](./SETUP.md) for detailed instructions)

2. Run database migrations in Supabase SQL Editor

3. Start the development server:

```bash
npm run dev
```

## 📖 Documentation

For detailed setup instructions, see [SETUP.md](./SETUP.md)

For the full project plan and roadmap, see [docs/plan.md](./docs/plan.md)

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: Resend
- **Scheduling**: Upstash QStash
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Forms**: React Hook Form + Zod
- **Language**: TypeScript

## 📁 Project Structure

```
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── (dashboard)/         # Dashboard and reminders
│   ├── (onboarding)/        # User onboarding flow
│   ├── admin/               # Admin pages (waitlist)
│   ├── api/                 # API routes
│   ├── reminders/           # Reminder management
│   └── waitlist/            # Public waitlist page
├── components/              # Reusable components
├── lib/                     # Utilities and configurations
│   ├── supabase/           # Supabase clients
│   ├── affirmations.ts     # Affirmation generator
│   ├── email.ts            # Reminder email sender
│   ├── waitlist-email.ts   # Welcome email sender
│   └── qstash.ts           # Scheduling functions
└── supabase/
    └── migrations/          # Database migrations
```

## 🔧 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 🚢 Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Or manually:

```bash
vercel
```

Remember to:

- Add environment variables in Vercel dashboard
- Update `NEXT_PUBLIC_APP_URL` to your production URL
- Run database migrations in Supabase

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database by [Supabase](https://supabase.com/)
- Emails by [Resend](https://resend.com/)
- Scheduling by [Upstash QStash](https://upstash.com/)
