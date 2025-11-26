'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { BellRing, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export interface Reminder {
  id: string;
  message: string;
  remind_at: Date;
  tone: string;
  status: string;
  notification_method?: string;
  created_at: Date;
}

type RemindersTableProps = {
  reminders: Reminder[];
  onReminderClick?: (reminder: Reminder) => void;
  onReminderDeleted?: () => void;
  isLoading?: boolean;
};

const truncateMessage = (message?: string, length = 35) => {
  if (!message) return "—"
  return message.length > length ? `${message.slice(0, length)}…` : message
}

const toneBadgeClassMap: Record<string, string> = {
  motivational: "bg-primary/10 text-primary",
  professional: "bg-muted/70 text-foreground",
  playful: "bg-amber-50 text-amber-700",
}

const statusBadgeClassMap: Record<string, string> = {
  pending: "bg-primary/10 text-primary",
  sent: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted/60 text-muted-foreground",
}

export function RemindersTable({
  reminders,
  onReminderClick,
  onReminderDeleted,
  isLoading = false,
}: RemindersTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (reminder: Reminder, event: React.MouseEvent) => {
    event.stopPropagation();
    setReminderToDelete(reminder);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reminderToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reminders/${reminderToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete reminder');

      toast.success('Reminder deleted successfully');
      setDeleteDialogOpen(false);
      setReminderToDelete(null);

      // Notify parent to refresh data
      if (onReminderDeleted) {
        onReminderDeleted();
      }
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      toast.error('Failed to delete reminder');
    } finally {
      setIsDeleting(false);
    }
  };
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const mobileSkeleton = (
    <div className='flex flex-col gap-4'>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={`reminder-card-skel-${idx}`} className='rounded-3xl border border-border/60 bg-card p-4 space-y-3 shadow-sm'>
          <Skeleton className='h-4 w-40' />
          <Skeleton className='h-4 w-56' />
          <Skeleton className='h-3 w-32' />
          <Skeleton className='h-5 w-24' />
          <div className='flex justify-end gap-2 pt-2'>
            <Skeleton className='h-8 w-8 rounded-full' />
            <Skeleton className='h-8 w-8 rounded-full' />
          </div>
        </div>
      ))}
    </div>
  )

  const mobileCards = reminders.map((reminder) => (
    <div key={`reminder-card-${reminder.id}`} className='rounded-3xl border border-border/60 bg-card p-5 space-y-4 shadow-sm'>
      <div className='space-y-2'>
        <p className='text-base font-semibold text-foreground line-clamp-3'>
          {reminder.message}
        </p>
        <p className='text-sm text-muted-foreground flex items-center gap-2'>
          <span className='inline-flex size-2 rounded-full bg-primary'></span>
          {formatDate(reminder.remind_at)}
        </p>
      </div>
      <div className='flex items-center gap-3 text-sm'>
        <Badge
          className={cn(
            "capitalize border-0 px-3 py-1 text-xs font-medium",
            toneBadgeClassMap[reminder.tone] ?? "bg-muted/60 text-foreground"
          )}
        >
          {reminder.tone}
        </Badge>
        <Badge
          className={cn(
            "capitalize border-0 px-3 py-1 text-xs font-medium",
            statusBadgeClassMap[reminder.status] ?? "bg-muted/60 text-foreground"
          )}
        >
          {reminder.status}
        </Badge>
      </div>
      <div className='flex items-center justify-end gap-3 pt-2'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => onReminderClick?.(reminder)}
          className='rounded-full bg-muted/30 hover:bg-muted/50'
        >
          <Pencil className='w-4 h-4' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          onClick={(event) => handleDeleteClick(reminder, event)}
          className='rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20'
        >
          <Trash2 className='w-4 h-4' />
        </Button>
      </div>
    </div>
  ))

  const mobileEmpty = (
    <Card>
      <CardContent className='py-10 text-center space-y-3'>
        <BellRing className='w-10 h-10 text-muted-foreground mx-auto' />
        <div>
          <p className='font-semibold text-foreground'>No reminders yet</p>
          <p className='text-sm text-muted-foreground'>
            Create your first reminder to see it here.
          </p>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className='space-y-4'>
      {/* Mobile Cards */}
      <div className='md:hidden'>
        {isLoading ? mobileSkeleton : reminders.length === 0 ? mobileEmpty : (
          <div className='flex flex-col gap-4'>
            {mobileCards}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className='rounded-lg border border-border overflow-hidden hidden md:block'>
        <Table>
        <TableHeader className='bg-gray-200 hover:bg-gray-200 '>
          <TableRow className='bg-gray-200 hover:bg-gray-200'>
            <TableHead>Message</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Tone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <TableRow key={`skeleton-${idx}`}>
                <TableCell colSpan={5}>
                  <div className='flex items-center gap-4 py-4'>
                    <Skeleton className='h-4 w-1/3' />
                    <Skeleton className='h-4 w-1/4' />
                    <Skeleton className='h-6 w-20 rounded-full' />
                    <Skeleton className='h-6 w-16 rounded-full' />
                    <Skeleton className='h-6 w-6 rounded-full ml-auto' />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : reminders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className='p-0 bg-white hover:bg-white'>
                <div className='flex flex-col items-center justify-center gap-3 text-center py-12 hover:bg-white'>
                  <div className='inline-flex size-16 items-center justify-center rounded-full text-primary'>
                    <BellRing className='h-15 w-16' />
                  </div>
                  <div>
                    <p className='text-base font-semibold text-foreground'>
                      No Reminders Yet
                    </p>
                    <p className='text-sm text-muted-foreground'>
                      Create your first reminder to see it here.
                    </p>
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
                <TableCell className='font-medium'>
                  {truncateMessage(reminder.message)}
                </TableCell>
                <TableCell className='text-sm'>
                  {formatDate(reminder.remind_at)}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "capitalize border-0 px-3 py-1 text-xs font-medium",
                      toneBadgeClassMap[reminder.tone] ?? "bg-muted/60 text-foreground"
                    )}
                  >
                    {reminder.tone}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "capitalize border-0 px-3 py-1 text-xs font-medium",
                      statusBadgeClassMap[reminder.status] ?? "bg-muted/60 text-foreground"
                    )}
                  >
                    {reminder.status}
                  </Badge>
                </TableCell>
                <TableCell className='text-right'>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className='w-4 h-4' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/reminder/${reminder.id}`}
                          className='cursor-pointer'
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Pencil className='w-4 h-4 mr-2' />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-destructive cursor-pointer'
                        onClick={(event) => handleDeleteClick(reminder, event)}
                      >
                        <Trash2 className='w-4 h-4 mr-2' />
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reminder? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className='bg-destructive hover:bg-destructive/90'
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
