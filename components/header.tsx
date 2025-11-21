'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notification-bell';

export function DashboardHeader() {
  const pathname = usePathname();

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
            <div className='text-right leading-tight'>
              <p className='text-sm font-semibold'>User Name</p>
              <p className='text-xs text-muted-foreground'>Admin</p>
            </div>
            <Avatar className='size-10'>
              <AvatarImage src='/avatar-placeholder.png' alt='User avatar' />
              <AvatarFallback>UN</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
