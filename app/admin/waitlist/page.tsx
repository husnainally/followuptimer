'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Mail, Calendar } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}

export default function AdminWaitlistPage() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to access this page');
        window.location.href = '/login';
        return;
      }

      // Check if user is admin
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error || !profile?.is_admin) {
        toast.error('Access denied. Admin privileges required.');
        window.location.href = '/dashboard';
        return;
      }

      setIsAdmin(true);
      fetchWaitlist();
    } catch (error: any) {
      toast.error('Failed to verify admin access');
      window.location.href = '/dashboard';
    } finally {
      setCheckingAuth(false);
    }
  }

  async function fetchWaitlist() {
    try {
      const response = await fetch('/api/waitlist');

      if (!response.ok) {
        throw new Error('Failed to fetch waitlist');
      }

      const data = await response.json();
      setWaitlist(data.waitlist || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    const csv = [
      ['Email', 'Joined Date'].join(','),
      ...waitlist.map((entry) =>
        [entry.email, new Date(entry.created_at).toLocaleDateString()].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  }

  if (checkingAuth || loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-muted-foreground'>
          {checkingAuth ? 'Verifying access...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className='flex flex-col gap-6 p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Link href='/dashboard'>
            <Button variant='ghost' size='icon'>
              <ArrowLeft className='w-4 h-4' />
            </Button>
          </Link>
          <div>
            <h1 className='text-3xl font-bold'>Waitlist</h1>
            <p className='text-muted-foreground mt-1'>
              Manage your waitlist entries
            </p>
          </div>
        </div>
        <Button onClick={exportToCSV} className='gap-2'>
          <Download className='w-4 h-4' />
          Export CSV
        </Button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Total Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-end gap-2'>
              <div className='text-3xl font-bold'>{total}</div>
              <Mail className='w-4 h-4 text-muted-foreground mb-1' />
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              All time signups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-sm font-medium'>Latest Signup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-end gap-2'>
              <div className='text-lg font-semibold truncate'>
                {waitlist[0]?.email || 'No signups yet'}
              </div>
            </div>
            <p className='text-xs text-muted-foreground mt-2'>
              {waitlist[0]
                ? new Date(waitlist[0].created_at).toLocaleDateString()
                : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Waitlist Entries</CardTitle>
          <CardDescription>
            List of all users who joined the waitlist
          </CardDescription>
        </CardHeader>
        <CardContent>
          {waitlist.length === 0 ? (
            <div className='text-center py-12'>
              <Mail className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
              <p className='text-muted-foreground'>No waitlist entries yet</p>
            </div>
          ) : (
            <div className='space-y-2'>
              {waitlist.map((entry) => (
                <div
                  key={entry.id}
                  className='flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors'
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
                      <Mail className='w-5 h-5 text-primary' />
                    </div>
                    <div>
                      <p className='font-medium'>{entry.email}</p>
                      <div className='flex items-center gap-1 text-xs text-muted-foreground mt-1'>
                        <Calendar className='w-3 h-3' />
                        {new Date(entry.created_at).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
