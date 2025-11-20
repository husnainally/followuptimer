import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cancelScheduledReminder, scheduleReminder } from '@/lib/qstash';

export async function GET(
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
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ reminder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
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

    const body = await request.json();
    const { message, remind_at, tone, notification_method, status } = body;

    const updates: any = {};
    if (message !== undefined) updates.message = message;
    if (remind_at !== undefined) updates.remind_at = remind_at;
    if (tone !== undefined) updates.tone = tone;
    if (notification_method !== undefined)
      updates.notification_method = notification_method;
    if (status !== undefined) updates.status = status;

    const { data: reminder, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Update QStash job if remind_at changed
    if (remind_at !== undefined && reminder.qstash_message_id) {
      await cancelScheduledReminder(reminder.qstash_message_id);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const newQstashMessageId = await scheduleReminder({
        reminderId: reminder.id,
        remindAt: new Date(reminder.remind_at),
        callbackUrl: `${appUrl}/api/reminders/send`,
      });
      await supabase
        .from('reminders')
        .update({ qstash_message_id: newQstashMessageId })
        .eq('id', reminder.id);
    }

    return NextResponse.json({ reminder });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
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

    // Get reminder first to access qstash_message_id
    const { data: reminder } = await supabase
      .from('reminders')
      .select('qstash_message_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    // Cancel QStash job if exists
    if (reminder?.qstash_message_id) {
      await cancelScheduledReminder(reminder.qstash_message_id);
    }

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
