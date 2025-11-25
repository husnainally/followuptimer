'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

type InAppNotification = {
  id: string;
  title: string;
  message: string;
  affirmation: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const response = await fetch('/api/in-app-notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }

  async function markAsRead(notificationId: string) {
    try {
      const response = await fetch(
        `/api/in-app-notifications/${notificationId}`,
        {
          method: 'PATCH',
        }
      );

      if (!response.ok) throw new Error('Failed to mark as read');

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async function markAllAsRead() {
    setLoading(true);
    try {
      const response = await fetch('/api/in-app-notifications/mark-all-read', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  }

  async function deleteNotification(notificationId: string) {
    try {
      const response = await fetch(
        `/api/in-app-notifications/${notificationId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to delete notification');

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      const wasUnread =
        notifications.find((n) => n.id === notificationId)?.is_read === false;
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='relative'>
          <Bell className='h-5 w-5' />
          {unreadCount > 0 && (
            <Badge
              variant='destructive'
              className='absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs'
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-0' align='end'>
        <div className='flex items-center justify-between border-b p-4'>
          <h3 className='font-semibold'>Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              onClick={markAllAsRead}
              disabled={loading}
              className='text-xs'
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className='h-[400px]'>
          {notifications.length === 0 ? (
            <div className='p-8 text-center text-sm text-muted-foreground'>
              <Bell className='h-12 w-12 mx-auto mb-2 opacity-50' />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className='divide-y'>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() =>
                    !notification.is_read && markAsRead(notification.id)
                  }
                >
                  <div className='flex items-start justify-between gap-2 mb-1'>
                    <h4 className='font-medium text-sm'>
                      {notification.title}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className='text-muted-foreground hover:text-destructive'
                    >
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        width='16'
                        height='16'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      >
                        <path d='M18 6 6 18' />
                        <path d='m6 6 12 12' />
                      </svg>
                    </button>
                  </div>
                  <p className='text-sm text-muted-foreground italic mb-1'>
                    "{notification.affirmation}"
                  </p>
                  <p className='text-sm'>{notification.message}</p>
                  <p className='text-xs text-muted-foreground mt-2'>
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                  {!notification.is_read && (
                    <Badge variant='secondary' className='mt-2 text-xs'>
                      New
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
