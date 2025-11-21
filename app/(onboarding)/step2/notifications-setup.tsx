'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

import { Form } from '@/components/ui/form';
import { ControlledSwitch } from '@/components/controlled-switch';
import { LoadingButton } from '@/components/loading-button';
import { NotificationsFormData, notificationsSchema } from '@/lib/schemas';
import { useRouter } from 'next/navigation';

export function NotificationsSetup() {
  const form = useForm<NotificationsFormData>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      pushEnabled: false,
      emailNotifications: true,
      pushNotifications: false,
      inAppNotifications: false,
    },
  });
  const router = useRouter();

  const pushEnabled = form.watch('pushEnabled');
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: NotificationsFormData) {
    const toastId = toast.loading('Saving preferences...');
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          push_enabled: data.pushEnabled,
          email_notifications: data.emailNotifications,
          push_notifications: data.pushNotifications,
          in_app_notifications: data.inAppNotifications,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Notifications saved', { id: toastId });
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save preferences', { id: toastId });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
        <ControlledSwitch
          name='pushEnabled'
          label='Browser push notifications'
          description='Get real-time reminders right in your browser.'
          required
        />

        {pushEnabled && (
          <div className='flex gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-foreground'>
            <AlertCircle className='h-5 w-5 text-primary' />
            You&apos;ll be prompted by your browser to allow notifications.
            Choose “Allow” so we can nudge you at the right moment.
          </div>
        )}

        <div className='space-y-4 border-t border-border pt-4'>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
            Delivery channels
          </p>

          <ControlledSwitch
            name='emailNotifications'
            label='Email'
            description='A daily summary with all of your pending follow-ups.'
            disabled={!pushEnabled}
          />

          <ControlledSwitch
            name='pushNotifications'
            label='Desktop push'
            description='Instant pings when a follow-up is due.'
            disabled={!pushEnabled}
          />

          <ControlledSwitch
            name='inAppNotifications'
            label='In-app feed'
            description='See reminders in your dashboard inbox.'
            disabled={!pushEnabled}
          />
        </div>

        <LoadingButton
          type='submit'
          className='w-full'
          isLoading={isSubmitting}
          loadingText='Saving...'
        >
          Finish setup
        </LoadingButton>
      </form>
    </Form>
  );
}
