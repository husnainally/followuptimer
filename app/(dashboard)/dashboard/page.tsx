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
import { Plus, Clock, Bell, ClipboardList, ChevronRight, type LucideIcon } from 'lucide-react';
import { RemindersTable } from '../reminders-table';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-muted-foreground'>Loading...</div>
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
    <div className='flex flex-col gap-6 p-6'>
      {/* Header Section */}


      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
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

      {/* Reminders Table Section */}
      <Card className='bg-[#FAFAFA]'>
        <CardHeader className='flex items-center justify-between bg-[#FAFAFA]'>
          <div>
            <CardTitle>Your Reminders</CardTitle>
            <CardDescription>
              All your upcoming and past reminders
            </CardDescription>
          </div>
          <div className='flex items-center justify-between'>

            <Link href='/reminder/create'>
              <Button className='gap-2 bg-primary hover:bg-primary/90'>
                <Plus className='w-4 h-4' />
                New Reminder
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <RemindersTable reminders={reminders} />
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
    <div className='relative overflow-hidden rounded-3xl border border-border/80 shadow-sm bg-[#FAFAFA]'>
      {/* Decorative orange spot, top right only */}
      <div className="pointer-events-none absolute top-0 right-0 w-32 h-20 rounded-full bg-[rgba(213,184,255,1)] blur-2xl opacity-70 -translate-y-1/3 translate-x-1/3" />
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
