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

const privacySettingsSchema = z.object({
  dataCollection: z.boolean().default(false),
  marketingEmails: z.boolean().default(false),
});

export function PrivacySettings() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: {
      dataCollection: false,
      marketingEmails: false,
    },
  });

  useEffect(() => {
    loadPrivacySettings();
  }, []);

  async function loadPrivacySettings() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('data_collection, marketing_emails')
          .eq('id', user.id)
          .single();

        if (profile) {
          form.reset({
            dataCollection: profile.data_collection ?? false,
            marketingEmails: profile.marketing_emails ?? false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: z.infer<typeof privacySettingsSchema>) => {
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
          data_collection: data.dataCollection,
          marketing_emails: data.marketingEmails,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      toast.success('Privacy settings updated');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
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
              name='dataCollection'
              label='Data Collection'
              description='Allow us to collect usage analytics to improve the app'
            />
            <ControlledSwitch
              control={form.control}
              name='marketingEmails'
              label='Marketing Communications'
              description='Receive updates about new features and improvements'
            />
            <div className='flex justify-end pt-4'>
              {saveSuccess && (
                <div className='flex items-center gap-2 text-sm text-primary mr-4'>
                  <Check className='w-4 h-4' />
                  <span>Saved successfully</span>
                </div>
              )}
              <Button type='submit' className='bg-primary hover:bg-primary/90'>
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
