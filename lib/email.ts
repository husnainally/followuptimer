import { Resend } from 'resend';
import { getUserTone, getToneSubject } from './tone-system';
import { createServiceClient } from './supabase/service';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendReminderEmailOptions {
  to: string;
  subject: string;
  message: string;
  affirmation: string;
  userId?: string;
  contactId?: string;
  reminderId?: string;
}

export async function sendReminderEmail({
  to,
  subject,
  message,
  affirmation,
  userId,
  contactId,
  reminderId,
}: SendReminderEmailOptions) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('[Email] RESEND_API_KEY not configured');
      throw new Error('Email service not configured');
    }

    // Use RESEND_FROM if set, otherwise fall back to Resend's test domain
    // Note: Test domain only works for verified test emails in Resend dashboard
    const from = process.env.RESEND_FROM || 'onboarding@resend.dev';

    // Apply tone to subject if userId provided
    let finalSubject = subject;
    if (userId) {
      try {
        const tone = await getUserTone(userId);
        finalSubject = getToneSubject(subject, tone);
      } catch (error) {
        console.error('[Email] Failed to get user tone:', error);
        // Continue with original subject
      }
    }

    console.log('[Email] Sending reminder email:', {
      to,
      from,
      subject: finalSubject,
      hasApiKey: !!process.env.RESEND_API_KEY,
    });

    const result = await resend.emails.send({
      from,
      to,
      subject: finalSubject,
      text: `${affirmation}\n\nReminder: ${message}\n\nSent by FollowUpTimer`,
      html: generateReminderEmailHTML(affirmation, message),
    });

    if (result.error) {
      console.warn('[Email] Resend API error (non-blocking):', result.error);
      throw new Error(result.error.message || 'Failed to send email');
    }

    console.log('[Email] Email sent successfully:', {
      id: result.data?.id,
      to,
    });

    // Store email metadata for open tracking (non-blocking)
    if (result.data?.id && userId) {
      try {
        const supabase = createServiceClient();
        await supabase.from('sent_emails').insert({
          user_id: userId,
          contact_id: contactId || null,
          reminder_id: reminderId || null,
          resend_email_id: result.data.id,
          recipient_email: to,
          email_type: 'reminder',
          sent_at: new Date().toISOString(),
        });
        console.log('[Email] Stored email metadata for open tracking:', {
          emailId: result.data.id,
          userId,
        });
      } catch (trackingError) {
        // Don't fail the email send if tracking fails
        console.warn(
          '[Email] Failed to store email tracking metadata:',
          trackingError
        );
      }
    }

    return result;
  } catch (error) {
    console.warn('[Email] Error sending email (non-blocking):', {
      error,
      to,
      subject,
      hasApiKey: !!process.env.RESEND_API_KEY,
      hasFrom: !!process.env.RESEND_FROM,
    });
    throw error;
  }
}

function escapeHtml(str: string) {
  return str.replace(
    /[&<>"]+/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)
  );
}

/**
 * Generate beautiful HTML email template for reminders
 */
function generateReminderEmailHTML(
  affirmation: string,
  message: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reminder from FollowUpTimer</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: #1a1a1a;">⏰ FollowUpTimer</h1>
          <p style="font-size: 14px; color: #666; margin-top: 8px;">Your Smart Reminder Assistant</p>
        </div>
        
        <!-- Affirmation Card -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="font-size: 40px; margin-bottom: 16px;">✨</div>
          <p style="color: white; font-size: 18px; line-height: 1.6; margin: 0; font-weight: 500;">${escapeHtml(
            affirmation
          )}</p>
        </div>
        
        <!-- Reminder Content -->
        <div style="background: white; border-radius: 12px; padding: 32px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <div style="background: #667eea; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-right: 12px;">📌</div>
            <h2 style="font-size: 20px; margin: 0; color: #1a1a1a;">Your Reminder</h2>
          </div>
          <div style="background: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px; padding: 20px; margin-top: 16px;">
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0;">${escapeHtml(
              message
            )}</p>
          </div>
        </div>
        
        <!-- CTA Section -->
        <div style="text-align: center; margin-bottom: 32px;">
          <p style="font-size: 14px; color: #666; margin: 0 0 16px 0;">Take action on this reminder today!</p>
          <a href="${
            process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.io'
          }/dashboard" 
             style="display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);">
            View in Dashboard
          </a>
        </div>
        
        <!-- Tips Section -->
        <div style="background: #fff9e6; border-radius: 8px; padding: 20px; margin-bottom: 32px; border: 1px solid #ffe066;">
          <div style="display: flex; align-items: start;">
            <div style="font-size: 24px; margin-right: 12px;">💡</div>
            <div>
              <h3 style="font-size: 16px; margin: 0 0 8px 0; color: #1a1a1a; font-weight: 600;">Quick Tip</h3>
              <p style="font-size: 14px; line-height: 1.5; color: #666; margin: 0;">
                Mark this reminder as complete in your dashboard to track your progress and maintain your streak!
              </p>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 32px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #999; margin: 0 0 8px 0;">
            This reminder was sent by FollowUpTimer
          </p>
          <p style="font-size: 12px; color: #bbb; margin: 0;">
            Manage your reminders at <a href="${
              process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.io'
            }" style="color: #667eea; text-decoration: none;">FollowUpTimer</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
