import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cancelScheduledReminder } from '@/lib/qstash';

// Dismiss a reminder
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: reminder, error } = await supabase
      .from('reminders')
      .update({ status: 'dismissed' })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Cancel QStash job if exists (only in production)
    if (reminder.qstash_message_id && process.env.QSTASH_TOKEN) {
      try {
        await cancelScheduledReminder(reminder.qstash_message_id);
      } catch (qstashError) {
        console.error('QStash cancellation failed (non-fatal):', qstashError);
      }
    }

    return NextResponse.json({ reminder });
  } catch (error: unknown) {
    console.error('Failed to dismiss reminder:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to dismiss reminder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
