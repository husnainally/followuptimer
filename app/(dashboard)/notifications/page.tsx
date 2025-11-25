'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      return <CheckCircle2 className='w-5 h-5 text-green-600' />;
    case 'snoozed':
      return <Clock className='w-5 h-5 text-blue-600' />;
    case 'failed':
      return <AlertCircle className='w-5 h-5 text-red-600' />;
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'delivered':
      return (
        <Badge className='bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
          Delivered
        </Badge>
      );
    case 'snoozed':
      return (
        <Badge className='bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
          Snoozed
        </Badge>
      );
    case 'failed':
      return <Badge variant='destructive'>Failed</Badge>;
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
      <div className='flex items-center justify-center min-h-[400px] p-6'>
        <div className='text-muted-foreground'>Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 p-6'>
      {/* Header Section */}

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-end gap-2'>
              <div className='text-3xl font-bold'>{deliveredCount}</div>
              <CheckCircle2 className='w-4 h-4 text-green-600 mb-1' />
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              Successfully sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Snoozed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-end gap-2'>
              <div className='text-3xl font-bold'>{snoozedCount}</div>
              <Clock className='w-4 h-4 text-blue-600 mb-1' />
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              Postponed reminders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-end gap-2'>
              <div className='text-3xl font-bold'>{failedCount}</div>
              <AlertCircle className='w-4 h-4 text-red-600 mb-1' />
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              Undelivered notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <div className='space-y-3'>
        {notifications.length === 0 ? (
          <Card>
            <CardContent className='pt-12'>
              <div className='text-center'>
                <Bell className='w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50' />
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
