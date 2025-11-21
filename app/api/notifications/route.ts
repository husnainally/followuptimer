import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET all sent notifications for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch sent logs with reminder details
    const { data: sentLogs, error } = await supabase
      .from('sent_logs')
      .select(
        `
        *,
        reminders (
          message,
          tone
        )
      `
      )
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      notifications: sentLogs || [],
    });
  } catch (error: unknown) {
    console.error('Failed to fetch notifications:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
