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
import { ControlledInput } from '@/components/controlled-input';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const profileSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

export function ProfileSettings() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        if (profile) {
          form.reset({
            name: profile.full_name || '',
            email: profile.email || user.email || '',
          });
        } else {
          form.reset({
            name: '',
            email: user.email || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: z.infer<typeof profileSettingsSchema>) => {
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
          full_name: data.name,
          email: data.email,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      toast.success('Profile updated successfully');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className='space-y-4 pt-6'>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-10 w-full' />
          </div>
          <div className='space-y-2'>
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-10 w-full' />
          </div>
          <div className='flex justify-end pt-2'>
            <Skeleton className='h-10 w-32 rounded-full' />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className=''>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <ControlledInput
              control={form.control}
              name='name'
              label='Full Name'
              placeholder='Your name'
              required
            />
            <ControlledInput
              control={form.control}
              name='email'
              label='Email Address'
              type='email'
              placeholder='your@email.com'
              required
            />
            <div className='flex justify-end pt-4'>
              {saveSuccess && (
                <div className='flex items-center gap-2 text-sm text-primary mr-4'>
                  <Check className='w-4 h-4' />
                  <span>Saved successfully</span>
                </div>
              )}
              <Button type='submit' className='bg-primary hover:bg-primary/90'>
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
