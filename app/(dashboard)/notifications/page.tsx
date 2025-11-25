'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, CheckCircle2, Clock, AlertCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';

type Notification = {
  id: string;
  reminder_id: string;
  affirmation: string;
  sent_at: string;
  status: string;
  reminders?: {
    message: string;
    tone: string;
  };
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'delivered':
      return <CheckCircle2 className='w-5 h-5 text-primary' />;
    case 'snoozed':
      return <Clock className='w-5 h-5 text-muted-foreground' />;
    case 'failed':
      return <AlertCircle className='w-5 h-5 text-destructive' />;
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'delivered':
      return (
        <Badge className='bg-primary/10 text-primary border-0'>
          Delivered
        </Badge>
      );
    case 'snoozed':
      return (
        <Badge className='bg-muted/60 text-foreground border-0'>
          Snoozed
        </Badge>
      );
    case 'failed':
      return <Badge className='bg-destructive/10 text-destructive border-0'>Failed</Badge>;
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      setNotifications(notifications.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const deliveredCount = notifications.filter(
    (n) => n.status === 'delivered'
  ).length;
  const snoozedCount = notifications.filter(
    (n) => n.status === 'snoozed'
  ).length;
  const failedCount = notifications.filter((n) => n.status === 'failed').length;

  if (loading) {
    return (
      <div className='flex flex-col gap-6 p-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={`stat-skeleton-${idx}`}>
              <CardHeader className='pb-3 space-y-2'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-4 w-16' />
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex items-end gap-2'>
                  <Skeleton className='h-8 w-16' />
                  <Skeleton className='h-4 w-4' />
                </div>
                <Skeleton className='h-3 w-28' />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className='space-y-3'>
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={`notif-skeleton-${idx}`}>
              <CardContent className='pt-6 space-y-4'>
                <div className='flex items-center gap-3'>
                  <Skeleton className='h-8 w-8 rounded-full' />
                  <div className='flex-1 space-y-2'>
                    <Skeleton className='h-4 w-48' />
                    <Skeleton className='h-3 w-32' />
                  </div>
                  <Skeleton className='h-6 w-20 rounded-full' />
                </div>
                <Skeleton className='h-16 w-full rounded-md' />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 '>
      {/* Header Section */}

      {/* Stats Cards */}
      <Card className='bg-card border-border'>
        <CardContent className='flex flex-wrap items-center justify-between gap-4 py-4'>
          <div className='flex items-center gap-3 flex-1 min-w-[30%]'>
            <span className='inline-flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
              <CheckCircle2 className='w-5 h-5' />
            </span>
            <div>
              <p className='text-xs text-muted-foreground'>Delivered</p>
              <p className='text-2xl font-semibold text-foreground'>{deliveredCount}</p>
            </div>
          </div>
          <div className='flex items-center gap-3 flex-1 min-w-[30%]'>
            <span className='inline-flex size-10 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground'>
              <Clock className='w-5 h-5' />
            </span>
            <div>
              <p className='text-xs text-muted-foreground'>Snoozed</p>
              <p className='text-2xl font-semibold text-foreground'>{snoozedCount}</p>
            </div>
          </div>
          <div className='flex items-center gap-3 flex-1 min-w-[30%]'>
            <span className='inline-flex size-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'>
              <AlertCircle className='w-5 h-5' />
            </span>
            <div>
              <p className='text-xs text-muted-foreground'>Failed</p>
              <p className='text-2xl font-semibold text-foreground'>{failedCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className='space-y-3'>
        {notifications.length === 0 ? (
          <Card>
            <CardContent className='pt-12'>
              <div className='text-center'>
                <Bell className='w-12 h-12 text-muted-foreground/50 mx-auto mb-4' />
                <h3 className='font-semibold text-lg'>No notifications yet</h3>
                <p className='text-muted-foreground text-sm mt-1'>
                  Your sent reminders will appear here
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card key={notification.id} className=' border-0'>
              <CardContent className='pt-6'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1 space-y-3'>
                    {/* Notification Header */}
                    <div className='flex items-center gap-3'>
                      {getStatusIcon(notification.status)}
                      <div className='flex-1'>
                        <p className='font-semibold text-foreground'>
                          {notification.reminders?.message || 'Reminder'}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {formatDistanceToNow(new Date(notification.sent_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {getStatusBadge(notification.status)}
                    </div>

                    {/* Affirmation Text */}
                    <div className='bg-white rounded-md p-3 border border-border/50'>
                      <p className='text-sm text-foreground italic'>
                        "{notification.affirmation}"
                      </p>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => handleDelete(notification.id)}
                    className='text-muted-foreground hover:text-destructive'
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
