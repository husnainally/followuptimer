'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Form, FormField } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { waitlistSchema, type WaitlistFormData } from '@/lib/schemas';
import { Mail, CheckCircle } from 'lucide-react';
import { ControlledInput } from './controlled-input';
import { toast } from 'sonner';
import { useRouter } from "next/navigation";

export function WaitlistForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const form = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(data: WaitlistFormData) {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join waitlist');
      }

      setSuccess(true);
      toast.success("You're on the waitlist! 🎉");
      form.reset();
      

      // Redirect to login 
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to join waitlist. Please try again.');
      toast.error(err.message || 'Failed to join waitlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className='text-center'>
        <div className='flex justify-center mb-3'>
          <CheckCircle className='w-12 h-12 text-primary' />
        </div>
        <p className='font-semibold text-lg text-foreground mb-1'>
          You're on the list!
        </p>
        <p className='text-muted-foreground'>Check your email for updates.</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 w-96 '>
        {error && (
          <div className='p-3 bg-destructive/10 text-destructive rounded-lg text-sm font-medium'>
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <ControlledInput
              {...field}
              type='email'
              placeholder='your@email.com'
              startIcon={<Mail className='w-4 h-4' />}
              required
              className='border border-primary/30 rounded-md'
            />
          )}
        />

        <div className='w-full flex justify-center items-center'>
          <Button
            type='submit'
            className='w-58 h-11 text-base font-semibold'
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className='w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin' />
                Joining...
              </>
            ) : (
              'Join Waitlist'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
