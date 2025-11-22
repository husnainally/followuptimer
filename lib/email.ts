import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendReminderEmailOptions {
  to: string;
  subject: string;
  message: string;
  affirmation: string;
}

export async function sendReminderEmail({
  to,
  subject,
  message,
  affirmation,
}: SendReminderEmailOptions) {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error("[Email] RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const from =
      process.env.RESEND_FROM || 'FollowUpTimer <no-reply@followuptimer.app>';

    console.log("[Email] Sending reminder email:", {
      to,
      from,
      subject,
      hasApiKey: !!process.env.RESEND_API_KEY,
    });

    const result = await resend.emails.send({
      from,
      to,
      subject,
      text: `${affirmation}\n\nReminder: ${message}`,
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">\n  <p style="font-size:16px;margin:0 0 12px">${affirmation}</p>\n  <p style="margin:0 0 8px"><strong>Reminder:</strong> ${escapeHtml(
        message
      )}</p>\n  <p style="font-size:12px;color:#666">Sent by FollowUpTimer</p>\n</div>`,
    });

    if (result.error) {
      console.error("[Email] Resend API error:", result.error);
      throw new Error(result.error.message || "Failed to send email");
    }

    console.log("[Email] Email sent successfully:", {
      id: result.data?.id,
      to,
    });

    return result;
  } catch (error) {
    console.error("[Email] Error sending email:", {
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
