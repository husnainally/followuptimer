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

    // Cancel QStash job if exists
    if (reminder.qstash_message_id) {
      await cancelScheduledReminder(reminder.qstash_message_id);
    }

    return NextResponse.json({ reminder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
