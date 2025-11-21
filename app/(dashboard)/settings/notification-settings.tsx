'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { ControlledSwitch } from '@/components/controlled-switch';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  reminderAlerts: z.boolean().default(true),
  weeklyDigest: z.boolean().default(false),
});

export function NotificationSettings() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      reminderAlerts: true,
      weeklyDigest: false,
    },
  });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  async function loadNotificationSettings() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_notifications, push_enabled, reminder_before_minutes')
          .eq('id', user.id)
          .single();

        if (profile) {
          form.reset({
            emailNotifications: profile.email_notifications ?? true,
            pushNotifications: profile.push_enabled ?? true,
            reminderAlerts: true,
            weeklyDigest: false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: z.infer<typeof notificationSettingsSchema>) => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          email_notifications: data.emailNotifications,
          push_enabled: data.pushNotifications,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      toast.success('Notification settings updated');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='text-center text-muted-foreground'>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className=''>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <ControlledSwitch
              control={form.control}
              name='emailNotifications'
              label='Email Notifications'
              description='Receive affirmation reminders via email'
            />
            <ControlledSwitch
              control={form.control}
              name='pushNotifications'
              label='Push Notifications'
              description='Receive push notifications on your devices'
            />
            <ControlledSwitch
              control={form.control}
              name='reminderAlerts'
              label='Reminder Alerts'
              description='Get alerted when a reminder is due'
            />
            <ControlledSwitch
              control={form.control}
              name='weeklyDigest'
              label='Weekly Digest'
              description='Receive a weekly summary of your activity'
            />
            <div className='flex justify-end pt-4'>
              {saveSuccess && (
                <div className='flex items-center gap-2 text-sm text-primary mr-4'>
                  <Check className='w-4 h-4' />
                  <span>Saved successfully</span>
                </div>
              )}
              <Button type='submit' className='bg-primary hover:bg-primary/90'>
                Save Preferences
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
