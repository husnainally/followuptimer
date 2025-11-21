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

    if (error) {
      console.error('Failed to fetch reminders:', error);
      throw error;
    }

    return NextResponse.json({ reminders });
  } catch (error: unknown) {
    console.error('Failed to fetch reminders:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to fetch reminders';
    return NextResponse.json({ error: message }, { status: 500 });
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

    // Schedule QStash job (only if QSTASH_TOKEN is configured and not localhost)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const isProduction =
      appUrl && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1');

    if (process.env.QSTASH_TOKEN && isProduction) {
      try {
        const qstashMessageId = await scheduleReminder({
          reminderId: reminder.id,
          remindAt: new Date(reminder.remind_at),
          callbackUrl: `${appUrl}/api/reminders/send`,
        });

        await supabase
          .from('reminders')
          .update({ qstash_message_id: qstashMessageId })
          .eq('id', reminder.id);
      } catch (qstashError) {
        console.error('QStash scheduling failed (non-fatal):', qstashError);
        // Continue anyway - reminder is created, just not scheduled
      }
    } else {
      console.log(
        'QStash scheduling skipped (development mode or missing token)'
      );
    }

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create reminder:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create reminder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
