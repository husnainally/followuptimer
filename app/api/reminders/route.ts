import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { scheduleReminder } from '@/lib/qstash';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('remind_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ reminders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, remind_at, tone, notification_method } = body;

    // Validate required fields
    if (!message || !remind_at) {
      return NextResponse.json(
        { error: 'Message and remind_at are required' },
        { status: 400 }
      );
    }

    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        message,
        remind_at,
        tone: tone || 'motivational',
        notification_method: notification_method || 'email',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule QStash job
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const qstashMessageId = await scheduleReminder({
      reminderId: reminder.id,
      remindAt: new Date(reminder.remind_at),
      callbackUrl: `${appUrl}/api/reminders/send`,
    });

    await supabase
      .from('reminders')
      .update({ qstash_message_id: qstashMessageId })
      .eq('id', reminder.id);

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
