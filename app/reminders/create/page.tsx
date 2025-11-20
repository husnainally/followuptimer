'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { ControlledInput } from '@/components/controlled-input';
import { LoadingButton } from '@/components/loading-button';
import { toast } from 'sonner';
import { ReminderFormData, reminderSchema } from '@/lib/schemas';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

export default function CreateReminderPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      message: '',
      remind_at: '',
      tone: 'motivational',
      notification_method: 'email',
    },
  });

  async function onSubmit(data: ReminderFormData) {
    setIsLoading(true);
    const toastId = toast.loading('Creating reminder...');

    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create reminder');
      }

      toast.success('Reminder created successfully', { id: toastId });
      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className='flex flex-col gap-6 p-6 max-w-3xl mx-auto'>
      <div className='flex items-center gap-4'>
        <Link href='/dashboard'>
          <Button variant='ghost' size='icon'>
            <ArrowLeft className='w-4 h-4' />
          </Button>
        </Link>
        <div>
          <h1 className='text-3xl font-bold'>Create Reminder</h1>
          <p className='text-muted-foreground mt-1'>
            Set up a new reminder with an affirmation
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reminder Details</CardTitle>
          <CardDescription>
            Configure when and how you want to be reminded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              <FormField
                control={form.control}
                name='message'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='What do you want to be reminded about?'
                        className='resize-none'
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <ControlledInput
                name='remind_at'
                label='Date & Time'
                type='datetime-local'
                required
              />

              <FormField
                control={form.control}
                name='tone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Affirmation Tone</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a tone' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='motivational'>
                          Motivational
                        </SelectItem>
                        <SelectItem value='professional'>
                          Professional
                        </SelectItem>
                        <SelectItem value='playful'>Playful</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='notification_method'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notification Method</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select method' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='email'>Email</SelectItem>
                        <SelectItem value='push'>Push Notification</SelectItem>
                        <SelectItem value='in_app'>In-App</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex gap-3'>
                <LoadingButton
                  type='submit'
                  className='flex-1'
                  isLoading={isLoading}
                  loadingText='Creating...'
                >
                  Create Reminder
                </LoadingButton>
                <Link href='/dashboard' className='flex-1'>
                  <Button type='button' variant='outline' className='w-full'>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
