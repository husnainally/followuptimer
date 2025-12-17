'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Clock,
  Bell,
  ClipboardList,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { RemindersTable } from '../reminders-table';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { AffirmationBar } from '@/components/affirmation-bar';
import { QuickAddReminder } from '@/components/quick-add-reminder';

export default function DashboardPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tonePreference, setTonePreference] = useState<string>('motivational');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const supabase = createClient();

      // Fetch reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .order('remind_at', { ascending: true });

      if (remindersError) throw remindersError;
      setReminders(remindersData || []);

      // Fetch user profile for tone preference
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tone_preference')
          .eq('id', user.id)
          .single();

        if (profile?.tone_preference) {
          setTonePreference(profile.tone_preference);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }
  const upcomingCount = reminders.filter((r) => r.status === 'pending').length;

  if (loading) {
    return (
      <div className='flex flex-col gap-6 p-4 md:p-6 animate-[fadeIn_0.3s_ease-in-out_forwards]'>
        {/* Stats Cards Skeleton */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className='relative overflow-hidden rounded-3xl border border-border/80 shadow-sm bg-card'
            >
              <div className='relative flex flex-col gap-6 p-5'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <Skeleton className='size-11 rounded-2xl' />
                    <Skeleton className='h-4 w-32' />
                  </div>
                </div>
                <Skeleton className='h-10 w-20' />
              </div>
            </div>
          ))}
        </div>

        {/* Reminders Table Card Skeleton */}
        <Card className='bg-card'>
          <CardHeader className='flex items-center justify-between bg-card'>
            <div className='space-y-2'>
              <Skeleton className='h-6 w-40' />
              <Skeleton className='h-4 w-64' />
            </div>
            <Skeleton className='h-10 w-32' />
          </CardHeader>
          <CardContent className='space-y-4'>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='flex items-center gap-4'>
                <Skeleton className='h-12 w-12 rounded-lg' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-4 w-full' />
                  <Skeleton className='h-4 w-3/4' />
                </div>
                <Skeleton className='h-8 w-20' />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Upcoming Reminders',
      value: upcomingCount,
      description: 'Scheduled for this week',
      icon: Clock,
    },
    {
      title: 'Total Created',
      value: reminders.length,
      description: 'All time',
      icon: ClipboardList,
    },
    {
      title: 'Preferred Tone',
      value: tonePreference || 'Not set',
      description: 'Your affirmation style',
      icon: Bell,
    },
  ];

  return (
    <div className='flex flex-col gap-6  '>
      {/* Header Section */}

      {/* Mobile Stats Overview */}
      <div className='md:hidden'>
        <div className='rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>Snapshot</p>
              <p className='text-sm text-muted-foreground'>Today&apos;s overview</p>
            </div>
            <div className='inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs text-primary'>
              <span className='size-2 rounded-full bg-primary' />
              Live
            </div>
          </div>
          <div className='flex items-center justify-between gap-4'>
            {statCards.map((card) => (
              <div key={card.title} className='flex-1 flex flex-col gap-1'>
                <div className='inline-flex size-9 items-center justify-center rounded-2xl bg-white/70 text-primary shadow-sm mb-1'>
                  <card.icon className='h-4 w-4' />
                </div>
                <p className='text-xs text-muted-foreground'>{card.title}</p>
                <p className='text-2xl font-semibold text-foreground'>
                  {typeof card.value === "string"
                    ? card.value
                    : card.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Stats Cards */}
      <div className='hidden md:grid grid-cols-1 md:grid-cols-3 gap-4'>
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            description={card.description}
            value={card.value}
            icon={card.icon}
          />
        ))}
      </div>

      {/* Affirmation Bar */}
      <AffirmationBar />

      {/* Quick Add Reminder Bar */}
      <QuickAddReminder onReminderCreated={fetchData} />

      {/* Reminders Table Section */}
      <Card className='bg-card'>
        <CardHeader className='flex flex-col gap-3 bg-card sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>Your Reminders</CardTitle>
            <CardDescription>
              All your upcoming and past reminders
            </CardDescription>
          </div>
          <Link href='/reminder/create' className='w-full sm:w-auto'>
            <Button className='w-full gap-2 bg-primary hover:bg-primary/90 sm:w-auto'>
              <Plus className='w-4 h-4' />
              New Reminder
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <RemindersTable reminders={reminders} onReminderDeleted={fetchData} />
        </CardContent>
      </Card>
    </div>
  );
}

type StatCardProps = {
  title: string;
  description: string;
  value: number | string;
  icon: LucideIcon;
};

function StatCard({ title, description, value, icon: Icon }: StatCardProps) {
  return (
    <div className='relative overflow-hidden rounded-3xl border border-border/80 shadow-sm bg-card'>
      {/* Decorative accent blue spot, top right only */}
      <div className='pointer-events-none absolute top-0 right-0 w-32 h-20 rounded-full bg-primary blur-2xl opacity-70 -translate-y-1/3 translate-x-1/3' />
      <div className='relative flex flex-col gap-6 p-5'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <span className='inline-flex size-11 items-center justify-center rounded-2xl bg-muted/40 text-primary'>
              <Icon className='h-6 w-6' />
            </span>
            <div className='text-sm font-medium text-muted-foreground'>
              {title}
            </div>
          </div>
        </div>
        <div className='text-4xl font-semibold tracking-tight text-foreground'>
          {typeof value === 'number' ? (
            value
          ) : (
            <span className='text-2xl font-semibold capitalize text-foreground'>
              {value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
