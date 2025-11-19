'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock } from 'lucide-react'
import { RemindersTable } from '../reminders-table'

// Mock data - replace with API call
const mockReminders = [
  {
    id: '1',
    message: 'Complete project proposal',
    remind_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
    tone: 'motivational',
    status: 'pending',
    created_at: new Date(),
  },
  {
    id: '2',
    message: 'Team standup meeting',
    remind_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    tone: 'professional',
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '3',
    message: 'Take a break and stretch',
    remind_at: new Date(Date.now() + 30 * 60 * 1000),
    tone: 'playful',
    status: 'pending',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
]

export default function DashboardPage() {
  const [reminders, setReminders] = useState(mockReminders)
  const upcomingCount = reminders.filter((r) => r.status === 'pending').length

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your reminders and affirmations
          </p>
        </div>
        <Link href="/reminders/create">
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            New Reminder
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Upcoming Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold">{upcomingCount}</div>
              <Clock className="w-4 h-4 text-muted-foreground mb-1" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Scheduled for this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reminders.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Preferred Tone</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-primary text-primary-foreground">
              Motivational
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Your affirmation style
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reminders Table Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Reminders</CardTitle>
          <CardDescription>
            All your upcoming and past reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RemindersTable reminders={reminders} />
        </CardContent>
      </Card>
    </div>
  )
}
