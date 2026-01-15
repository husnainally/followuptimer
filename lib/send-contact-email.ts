import { Resend } from 'resend';
import { createServiceClient } from './supabase/service';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendContactEmailOptions {
  to: string; // Contact's email address
  subject: string;
  message: string;
  userId: string;
  contactId: string;
  reminderId?: string;
}

/**
 * Send user-written email to a contact
 * This is different from sendReminderEmail which sends reminder notifications to the user
 * This function sends actual emails to contacts when user explicitly clicks "Send Email"
 */
export async function sendContactEmail({
  to,
  subject,
  message,
  userId,
  contactId,
  reminderId,
}: SendContactEmailOptions): Promise<{
  success: boolean;
  data: { id: string } | null;
  error: { message: string } | null;
}> {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('[Contact Email] RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    // Use RESEND_FROM if set, otherwise fall back to Resend's test domain
    const from = process.env.RESEND_FROM || 'onboarding@resend.dev';

    console.log('[Contact Email] Sending email to contact:', {
      to,
      from,
      subject,
      contactId,
      reminderId,
      hasApiKey: !!process.env.RESEND_API_KEY,
    });

    // Send email via Resend
    const result = await resend.emails.send({
      from,
      to,
      subject,
      text: message,
      html: generateContactEmailHTML(message),
    });

    if (result.error) {
      console.warn('[Contact Email] Resend API error:', result.error);
      throw new Error(result.error.message || 'Failed to send email');
    }

    console.log('[Contact Email] Email sent successfully:', {
      id: result.data?.id,
      to,
      contactId,
    });

    // Store email metadata for open tracking (non-blocking)
    if (result.data?.id) {
      try {
        const supabase = createServiceClient();
        await supabase.from('sent_emails').insert({
          user_id: userId,
          contact_id: contactId,
          reminder_id: reminderId || null,
          resend_email_id: result.data.id,
          recipient_email: to,
          email_type: 'user_sent',
          sent_at: new Date().toISOString(),
        });
        console.log('[Contact Email] Stored email metadata for open tracking:', {
          emailId: result.data.id,
          userId,
          contactId,
        });
      } catch (trackingError) {
        // Don't fail the email send if tracking fails
        console.warn(
          '[Contact Email] Failed to store email tracking metadata:',
          trackingError
        );
      }
    }

    return { success: true, data: result.data, error: null };
  } catch (error) {
    console.error('[Contact Email] Error sending email:', {
      error,
      to,
      subject,
      contactId,
      hasApiKey: !!process.env.RESEND_API_KEY,
    });
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send email';
    return {
      success: false,
      data: null,
      error: { message: errorMessage },
    };
  }
}

/**
 * Generate HTML email template for user-sent emails to contacts
 */
function generateContactEmailHTML(message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
          <div style="font-size: 16px; line-height: 1.6; color: #333; white-space: pre-wrap;">${escapeHtml(
            message
          )}</div>
        </div>
        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            Sent via FollowUpTimer
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(str: string) {
  return str.replace(
    /[&<>"]+/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)
  );
}
