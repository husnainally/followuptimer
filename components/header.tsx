'use client';

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notification-bell';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    const path = pathname ?? '';

    if (path.startsWith('/reminder')) {
      if (path.includes('/create')) {
        return {
          title: 'Create Reminder',
          description: 'Set up a new reminder with your preferred tone',
        };
      }
      if (path.match(/\/reminder\/[^/]+/)) {
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

    if (path.startsWith('/notifications')) {
      return {
        title: 'Notifications',
        description: 'Review delivery, snoozed, and failed events',
      };
    }

    if (path.startsWith('/settings')) {
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
    <header className='w-full'>
      <div className='flex items-center justify-between px-3 py-3 border-b border-border/40 bg-card md:rounded-3xl md:px-6 md:py-5 md:border-none md:bg-transparent'>
        <div className='flex items-center gap-3'>
          <SidebarTrigger className='md:hidden' />
          <div>
            <h1 className='text-2xl md:text-3xl font-semibold tracking-tight'>{title}</h1>
            <p className='text-sm text-muted-foreground mt-1'>{description}</p>
          </div>
        </div>

        <div className='flex items-center  '>
          <div className='flex items-center justify-center rounded-full  bg-card p-2'>
            <NotificationBell />
          </div>

          {!loading && profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className='flex items-center gap-3 rounded-full  px-3 py-2 bg-card cursor-pointer'>
                  <div className='text-left leading-tight hidden md:block'>
                    <p className='text-sm text-right font-semibold'>
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
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-64 space-y-1'>
                <div className='px-3 py-2'>
                  <p className='text-sm font-semibold'>
                    {profile.full_name || 'User'}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {profile.email || ''}
                  </p>
                  
                  
                </div>
                <DropdownMenuItem asChild>
                  <Link href='/settings'>Go to Settings</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
