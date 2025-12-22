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
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { RemindersTable } from '../reminders-table';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { AffirmationBar } from '@/components/affirmation-bar';
import { QuickAddReminder } from '@/components/quick-add-reminder';
import {
  DashboardCard,
  TrustIndicators,
  WeeklyDigestPreview,
} from '@/components/dashboard/dashboard-cards';
import { EmptyState } from '@/components/ui/empty-state';

interface DashboardStats {
  today: { count: number; reminders: any[] };
  thisWeek: { count: number; reminders: any[] };
  overdue: { count: number; reminders: any[] };
  atRisk: { count: number; reminders: any[] };
  trust: {
    suppressedThisWeek: number;
    quietHoursSuppressions: number;
    failedReminders: number;
    allProcessedNormally: boolean;
  };
  digest: {
    nextDigestTime: string | null;
    enabled: boolean;
  };
}

export default function DashboardPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tonePreference, setTonePreference] = useState<string>('motivational');

  useEffect(() => {
    fetchData();
  }, []);

  function calculateLocalStats(reminders: any[]) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const todayReminders = reminders.filter((r) => {
      const remindAt = new Date(r.remind_at);
      return remindAt >= todayStart && remindAt <= todayEnd;
    });

    const weekReminders = reminders.filter((r) => {
      const remindAt = new Date(r.remind_at);
      return remindAt >= weekStart && remindAt <= weekEnd;
    });

    const overdueReminders = reminders.filter((r) => {
      const remindAt = new Date(r.remind_at);
      return remindAt < now && r.status === "pending";
    });

    const atRiskThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const atRiskReminders = reminders.filter((r) => {
      const remindAt = new Date(r.remind_at);
      return remindAt >= now && remindAt <= atRiskThreshold && r.status === "pending";
    });

    setStats({
      today: { count: todayReminders.length, reminders: todayReminders },
      thisWeek: { count: weekReminders.length, reminders: weekReminders },
      overdue: { count: overdueReminders.length, reminders: overdueReminders },
      atRisk: { count: atRiskReminders.length, reminders: atRiskReminders },
      trust: {
        suppressedThisWeek: 0,
        quietHoursSuppressions: 0,
        failedReminders: 0,
        allProcessedNormally: true,
      },
      digest: {
        nextDigestTime: null,
        enabled: false,
      },
    });
  }

  async function fetchData() {
    try {
      const supabase = createClient();

      // Fetch reminders
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .order('remind_at', { ascending: true });

      if (remindersError) throw remindersError;
      const remindersList = remindersData || [];
      setReminders(remindersList);

      // Fetch dashboard stats
      try {
        const statsResponse = await fetch('/api/dashboard/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        } else {
          const errorData = await statsResponse.json().catch(() => ({}));
          console.error('Failed to fetch dashboard stats:', errorData);
          // Fallback: calculate stats from local reminders
          calculateLocalStats(remindersList);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Fallback: calculate stats from local reminders
        calculateLocalStats(remindersList);
      }

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
    <div className='flex flex-col gap-6'>
      {/* Today / This Week Snapshot */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <DashboardCard
          title="Due Today"
          count={stats?.today.count ?? 0}
          description="Follow-ups due today"
          icon={Clock}
          href="/reminder"
          variant="info"
        />
        <DashboardCard
          title="This Week"
          count={stats?.thisWeek.count ?? 0}
          description="Scheduled this week"
          icon={ClipboardList}
          href="/reminder"
        />
        <DashboardCard
          title="Overdue"
          count={stats?.overdue.count ?? 0}
          description="Past due date"
          icon={AlertTriangle}
          href="/reminder"
          variant={stats?.overdue.count ? "warning" : "default"}
        />
        <DashboardCard
          title="At Risk"
          count={stats?.atRisk.count ?? 0}
          description="Due in next 24 hours"
          icon={Bell}
          href="/reminder"
          variant={stats?.atRisk.count ? "warning" : "default"}
        />
      </div>

      {/* Trust Signals & Digest Preview */}
      {(stats?.trust || stats?.digest) && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Trust & Status</CardTitle>
            <CardDescription>
              System health and upcoming digest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.trust && (
              <TrustIndicators
                suppressedThisWeek={stats.trust.suppressedThisWeek}
                quietHoursSuppressions={stats.trust.quietHoursSuppressions}
                failedReminders={stats.trust.failedReminders}
                allProcessedNormally={stats.trust.allProcessedNormally}
              />
            )}
            {stats.digest && (
              <WeeklyDigestPreview
                nextDigestTime={stats.digest.nextDigestTime}
                enabled={stats.digest.enabled}
              />
            )}
          </CardContent>
        </Card>
      )}

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
          {reminders.length === 0 && !loading ? (
            <div className="py-12">
              <EmptyState
                icon={Bell}
                title="No reminders yet"
                description="Create your first follow-up reminder to get started with FollowUp Timer."
                action={{
                  label: "Create Reminder",
                  href: "/reminder/create",
                }}
              />
            </div>
          ) : (
            <RemindersTable reminders={reminders} onReminderDeleted={fetchData} />
          )}
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
