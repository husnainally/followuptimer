'use client'

import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Reminder } from '../reminders-table'
import { cn } from '@/lib/utils'

type ReminderDetailDialogProps = {
  reminder: Reminder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReminderDetailDialog({ reminder, open, onOpenChange }: ReminderDetailDialogProps) {
  if (!reminder) {
    return <Dialog open={open} onOpenChange={onOpenChange} />
  }

  const formatDateTime = (date: Date) => {
    return format(new Date(date), 'PP • p')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-semibold">Reminder Details</DialogTitle>
          <DialogDescription>View only mode</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <InfoRow label="Message" value={reminder.message} large />
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoRow label="Scheduled For" value={formatDateTime(reminder.remind_at)} />
            <InfoRow label="Created" value={formatDateTime(reminder.created_at)} />
          </div>
          <InfoRow label="Notification" value={reminder.notification_method?.replace('_', ' ') ?? '—'} />
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoRow label="Tone" value={reminder.tone} />
            <InfoRow label="Status" value={reminder.status} />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type InfoRowProps = {
  label: string
  value: React.ReactNode
  large?: boolean
}

function InfoRow({ label, value, large }: InfoRowProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-foreground', large ? 'text-base font-medium' : 'font-medium capitalize')}>{value}</p>
    </div>
  )
}

