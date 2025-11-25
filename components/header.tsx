'use client';

import { useMemo, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notification-bell';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  full_name: string | null;
  email: string | null;
}

export function DashboardHeader() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          setProfile(data || { full_name: null, email: user.email });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const { title, description } = useMemo(() => {
    if (!pathname)
      return {
        title: 'Dashboard',
        description: 'Manage your reminders and affirmations',
      };

    if (pathname.startsWith('/reminders')) {
      if (pathname.includes('/create')) {
        return {
          title: 'Create Reminder',
          description: 'Set up a new reminder with your preferred tone',
        };
      }
      if (pathname.match(/\/reminders\/[^/]+/)) {
        return {
          title: 'Reminder Details',
          description: 'Update the information for this reminder',
        };
      }
      return {
        title: 'Reminders',
        description: 'View and manage your reminders',
      };
    }

    if (pathname.startsWith('/settings')) {
      return {
        title: 'Settings',
        description: 'Customize your preferences and notifications',
      };
    }

    return {
      title: 'Dashboard',
      description: 'Manage your reminders and affirmations',
    };
  }, [pathname]);

  return (
    <header className=''>
      <div className='flex flex-col gap-4 px-4 py-1 md:flex-row md:items-center md:justify-between md:px-6'>
        <div className='flex justify-center items-center gap-3'>
          <SidebarTrigger />
          <div>
            <h1 className='text-3xl font-semibold tracking-tight'>{title}</h1>
            <p className='text-sm text-muted-foreground mt-1'>{description}</p>
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <NotificationBell />

          <div className='flex items-center gap-3'>
            {!loading && profile && (
              <>
                <div className='text-right leading-tight'>
                  <p className='text-sm font-semibold'>
                    {profile.full_name || 'User'}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {profile.email || ''}
                  </p>
                </div>
                <Avatar className='size-10'>
                  <AvatarImage
                    src={'/avatar-placeholder.png'}
                    alt='User avatar'
                  />
                  <AvatarFallback>
                    {profile.full_name
                      ? profile.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
