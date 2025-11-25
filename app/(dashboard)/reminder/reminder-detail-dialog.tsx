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
import { ScrollArea } from '@/components/ui/scroll-area'

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
      <DialogContent className="max-w-2xl border border-border/60 rounded-3xl bg-card shadow-2xl p-0 sm:p-0">
        <DialogHeader className="space-y-1 text-left px-6 pt-6 sm:px-8">
          <DialogTitle className="text-2xl font-semibold tracking-tight">Reminder Details</DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            View-only snapshot of this reminder
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6 pb-6 sm:px-8">
          <div className="space-y-6 pr-2">
            <section className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Message</p>
              <div className="max-h-48 overflow-y-auto pr-1 text-base leading-relaxed text-foreground whitespace-pre-line">
                {reminder.message}
              </div>
            </section>

            <div className="grid gap-4 rounded-2xl border border-border/70 bg-card shadow-sm p-4 sm:grid-cols-2">
              <InfoRow label="Scheduled For" value={formatDateTime(reminder.remind_at)} />
              <InfoRow label="Created" value={formatDateTime(reminder.created_at)} />
              <InfoRow label="Notification" value={reminder.notification_method?.replace('_', ' ') ?? '—'} />
              <InfoRow
                label="Status"
                value={
                  <Badge className="w-fit capitalize bg-primary/10 text-primary border-0">
                    {reminder.status ?? 'pending'}
                  </Badge>
                }
              />
            </div>

            <div className="grid gap-4 rounded-2xl border border-border/70 bg-card shadow-sm p-4 sm:grid-cols-2">
              <InfoRow
                label="Tone"
                value={<Badge className="w-fit capitalize bg-muted/60 text-foreground border-0">{reminder.tone}</Badge>}
              />
              <InfoRow label="Channel" value={reminder.notification_method ?? '—'} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-6">
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
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className={cn('text-sm text-foreground', large ? 'text-base font-medium' : 'font-medium capitalize')}>
        {value}
      </div>
    </div>
  )
}

