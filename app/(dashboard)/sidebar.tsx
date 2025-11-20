'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Bell, Settings, LogOut, History } from 'lucide-react';
import { logout } from '@/lib/supabase/logout';
import Image from 'next/image';

export function DashboardSidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Reminders',
      href: '/reminder',
      icon: Bell,
    },
    {
      title: "Notifications",
      href: "/notifications",
      icon: History,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <Sidebar
      variant='floating'
      className='bg-white'
    >
      <SidebarHeader className='border-none rounded-2xl px-4 pt-6 pb-4 bg-[#FAFAFA]'>
        <Link
          href='/dashboard'
          className='font-bold text-lg text-primary flex justify-center items-center gap-2'
        >
          <Image
            src='/logo1.png'
            alt='FollowUpTimer Logo'
            
            width={240}
            height={240}
          />
          
        </Link>
      </SidebarHeader>

      <SidebarContent className='px-2 pb-6 bg-[#FAFAFA]'>
        <SidebarMenu className='space-y-1'>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href} >
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className='flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-medium'
                >
                  <Link href={item.href}>
                    <Icon className='w-4 h-4' />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className='border-t rounded-2xl bg-[#FAFAFA] px-4 pb-6'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                onClick={() => logout('/')}
                className='flex items-center gap-2 w-full text-left'
              >
                <LogOut className='w-4 h-4' />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
