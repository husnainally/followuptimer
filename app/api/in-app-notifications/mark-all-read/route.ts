import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Route segment config
export const dynamic = "force-dynamic";
export const runtime = "nodejs";


// POST to mark all notifications as read
export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to mark all notifications as read:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to mark all notifications as read';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
