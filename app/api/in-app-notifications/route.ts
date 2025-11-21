import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET all in-app notifications for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch in-app notifications with reminder details
    const { data: notifications, error } = await supabase
      .from('in_app_notifications')
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
      .order('created_at', { ascending: false })
      .limit(50); // Limit to last 50 notifications

    if (error) throw error;

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: notifications?.filter((n) => !n.is_read).length || 0,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch in-app notifications:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch in-app notifications';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
