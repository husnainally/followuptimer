'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BellRing, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface Reminder {
  id: string
  message: string
  remind_at: Date
  tone: string
  status: string
  notification_method?: string
  created_at: Date
}

type RemindersTableProps = {
  reminders: Reminder[]
  onReminderClick?: (reminder: Reminder) => void
}

export function RemindersTable({ reminders, onReminderClick }: RemindersTableProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const getToneBadgeColor = (tone: string) => {
    switch (tone) {
      case 'motivational':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'professional':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'playful':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-200 hover:bg-gray-200 ">
          <TableRow className='bg-gray-200 hover:bg-gray-200'>
            <TableHead>Message</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Tone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reminders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="p-0 bg-white hover:bg-white">
                <div className="flex flex-col items-center justify-center gap-3 text-center py-12 hover:bg-white">
                  <div className="inline-flex size-16 items-center justify-center rounded-full text-primary">
                    <BellRing  className="h-15 w-16" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">No Reminders Yet</p>
                    <p className="text-sm text-muted-foreground">Create your first reminder to see it here.</p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            reminders.map((reminder) => (
              <TableRow
                key={reminder.id}
                className={cn(
                  'hover:bg-muted/50',
                  onReminderClick && 'cursor-pointer'
                )}
                onClick={() => onReminderClick?.(reminder)}
              >
                <TableCell className="font-medium">{reminder.message}</TableCell>
                <TableCell className="text-sm">
                  {formatDate(reminder.remind_at)}
                </TableCell>
                <TableCell>
                  <Badge className={`capitalize ${getToneBadgeColor(reminder.tone)}`}>
                    {reminder.tone}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={reminder.status === 'pending' ? 'bg-yellow-50' : ''}
                  >
                    {reminder.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/reminder/${reminder.id}`} className="cursor-pointer">
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive cursor-pointer">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
