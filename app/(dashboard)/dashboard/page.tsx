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
import { Badge } from '@/components/ui/badge';
import { Plus, Clock } from 'lucide-react';
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

  return (
    <div className='flex flex-col gap-6 p-6'>
      {/* Header Section */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Dashboard</h1>
          <p className='text-muted-foreground mt-1'>
            Manage your reminders and affirmations
          </p>
        </div>
        <Link href='/reminders/create'>
          <Button className='gap-2 bg-primary hover:bg-primary/90'>
            <Plus className='w-4 h-4' />
            New Reminder
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>
              Upcoming Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-end gap-2'>
              <div className='text-3xl font-bold'>{upcomingCount}</div>
              <Clock className='w-4 h-4 text-muted-foreground mb-1' />
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              Scheduled for this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Total Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{reminders.length}</div>
            <p className='text-xs text-muted-foreground mt-2'>All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>
              Preferred Tone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className='bg-primary text-primary-foreground capitalize'>
              {tonePreference || 'Not set'}
            </Badge>
            <p className='text-xs text-muted-foreground mt-2'>
              Your affirmation style
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reminders Table Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Reminders</CardTitle>
          <CardDescription>
            All your upcoming and past reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RemindersTable reminders={reminders} />
        </CardContent>
      </Card>
    </div>
  );
}
