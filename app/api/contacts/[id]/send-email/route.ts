import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { sendContactEmail } from '@/lib/send-contact-email';

// Route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/contacts/[id]/send-email
 * Send user-written email to a contact
 * This is the only way contacts receive emails - user must explicitly send them
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, message, reminder_id } = body;

    // Validate required fields
    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // Verify user owns the contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, name, first_name, last_name')
      .eq('id', contactId)
      .eq('user_id', user.id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Verify contact has email address
    if (!contact.email) {
      return NextResponse.json(
        { error: 'Contact does not have an email address' },
        { status: 400 }
      );
    }

    // Verify reminder_id if provided (user must own the reminder)
    if (reminder_id) {
      const { data: reminder, error: reminderError } = await supabase
        .from('reminders')
        .select('id, user_id')
        .eq('id', reminder_id)
        .eq('user_id', user.id)
        .single();

      if (reminderError || !reminder) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        );
      }
    }

    // Send email to contact
    const emailResult = await sendContactEmail({
      to: contact.email,
      subject: subject.trim(),
      message: message.trim(),
      userId: user.id,
      contactId: contact.id,
      reminderId: reminder_id || undefined,
    });

    if (!emailResult.success || emailResult.error) {
      return NextResponse.json(
        { error: emailResult.error?.message || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Note: Email sending is tracked in sent_emails table for open tracking
    // Event logging can be added later if email_sent event type is added to the enum

    // Update contact's last_interaction_at
    await supabase
      .from('contacts')
      .update({
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId)
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      emailId: emailResult.data?.id,
      message: 'Email sent successfully',
    });
  } catch (error: unknown) {
    console.error('Failed to send email to contact:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
