'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from './sidebar';
import { DashboardHeader } from '@/components/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkUserType();
  }, []);

  async function checkUserType() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin - if so, redirect to admin dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profile?.is_admin) {
        router.push('/admin');
        return;
      }

      // Normal user - allow access
      setChecking(false);
    } catch (error) {
      console.error('Error checking user type:', error);
      setChecking(false);
    }
  }

  if (checking) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-muted-foreground'>Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider className='bg-white min-h-svh'>
      <DashboardSidebar />
      <SidebarInset className='flex flex-col gap-4 bg-white'>
        <DashboardHeader />
        <div className='flex-1 overflow-auto px-3 sm:px-4 md:px-6 min-h-[calc(100vh-4rem)]'>
          <main className='w-full'>{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
