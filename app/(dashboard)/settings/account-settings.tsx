'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function AccountSettings() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete account');

      const data = await response.json();
      toast.success(data.message || 'Account deleted successfully');

      // Redirect to homepage after successful deletion
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account');
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card className=''>
        <CardHeader>
          <CardTitle className='text-destructive'>
            Account & Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between p-4 bg-destructive/5 rounded-lg border border-destructive/20'>
            <div>
              <p className='font-medium text-foreground'>Delete Account</p>
              <p className='text-sm text-muted-foreground'>
                Permanently delete your account and all data
              </p>
            </div>
            <Button
              variant='destructive'
              className='bg-destructive hover:bg-destructive/90'
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove all your data from our servers, including:
              <ul className='list-disc list-inside mt-2 space-y-1'>
                <li>All your reminders</li>
                <li>Notification history</li>
                <li>Profile information</li>
                <li>Settings and preferences</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className='bg-destructive hover:bg-destructive/90'
            >
              {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
