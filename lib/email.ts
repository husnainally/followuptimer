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
  const from =
    process.env.RESEND_FROM || 'FollowUpTimer <no-reply@followuptimer.app>';

  return await resend.emails.send({
    from,
    to,
    subject,
    text: `${affirmation}\n\nReminder: ${message}`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">\n  <p style="font-size:16px;margin:0 0 12px">${affirmation}</p>\n  <p style="margin:0 0 8px"><strong>Reminder:</strong> ${escapeHtml(
      message
    )}</p>\n  <p style="font-size:12px;color:#666">Sent by FollowUpTimer</p>\n</div>`,
  });
}

function escapeHtml(str: string) {
  return str.replace(
    /[&<>"]+/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)
  );
}
