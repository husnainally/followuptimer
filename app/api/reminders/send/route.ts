import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { sendReminderEmail } from '@/lib/email';
import { generateAffirmation } from '@/lib/affirmations';

async function handler(request: Request) {
  try {
    const body = await request.json();
    const { reminderId } = body;

    if (!reminderId) {
      return NextResponse.json(
        { error: 'Reminder ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch reminder and user profile
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('*, profiles:user_id(*)')
      .eq('id', reminderId)
      .single();

    if (reminderError || !reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    // Generate affirmation
    const affirmation = generateAffirmation(reminder.tone);

    let success = false;
    let errorMessage = null;

    // Send notification based on method
    if (reminder.notification_method === 'email' && reminder.profiles?.email) {
      try {
        await sendReminderEmail({
          to: reminder.profiles.email,
          subject: '⏰ Reminder from FollowUpTimer',
          message: reminder.message,
          affirmation,
        });
        success = true;
      } catch (emailError: any) {
        errorMessage = emailError.message;
        console.error('Email send failed:', emailError);
      }
    } else {
      // For push or in-app, just mark as sent (actual push/in-app logic would go here)
      success = true;
    }

    // Update reminder status
    await supabase
      .from('reminders')
      .update({ status: 'sent' })
      .eq('id', reminderId);

    // Log the send attempt
    await supabase.from('sent_logs').insert({
      reminder_id: reminderId,
      affirmation_text: affirmation,
      delivery_method: reminder.notification_method,
      success,
      error_message: errorMessage,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const POST = process.env.QSTASH_CURRENT_SIGNING_KEY
  ? verifySignatureAppRouter(handler)
  : handler;
