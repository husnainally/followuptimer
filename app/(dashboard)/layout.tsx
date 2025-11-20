'use client'

import { SidebarProvider } from '@/components/ui/sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { DashboardSidebar } from './sidebar'
import { DashboardHeader } from '@/components/header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider className="bg-white min-h-svh ">
      <DashboardSidebar />
      <SidebarInset className="p-4 md:p-0 flex flex-col gap-4 bg-white">
        <DashboardHeader />
        <div className=" mx-4  min-h-[calc(100vh-4rem)] flex-col overflow-hidden">
          <main className="flex-1 overflow-auto ">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
