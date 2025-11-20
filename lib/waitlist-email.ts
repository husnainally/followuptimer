import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendWelcomeEmailOptions {
  to: string;
}

export async function sendWelcomeEmail({ to }: SendWelcomeEmailOptions) {
  const from =
    process.env.RESEND_FROM || 'FollowUpTimer <no-reply@followuptimer.app>';

  return await resend.emails.send({
    from,
    to,
    subject: '🎉 Welcome to FollowUpTimer Waitlist!',
    text: `Welcome to FollowUpTimer!\n\nThank you for joining our waitlist. We're excited to have you on board!\n\nYou'll be among the first to know when we launch. We're building something special – a smart reminder app with motivational affirmations to help you stay on track.\n\nStay tuned!\n\nThe FollowUpTimer Team`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 32px; font-weight: bold; margin: 0; color: #1a1a1a;">FollowUpTimer</h1>
          <p style="font-size: 14px; color: #666; margin-top: 8px;">Smart Reminders with Affirmations</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
          <h2 style="color: white; font-size: 24px; margin: 0 0 12px 0;">You're on the list!</h2>
          <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Thank you for joining our waitlist</p>
        </div>
        
        <div style="margin-bottom: 32px;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0 0 16px 0;">
            We're excited to have you on board! You'll be among the first to know when we launch.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin: 0;">
            We're building something special – a smart reminder app with motivational affirmations to help you stay on track and achieve your goals.
          </p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
          <h3 style="font-size: 18px; margin: 0 0 16px 0; color: #1a1a1a;">What to expect:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #555;">
            <li style="margin-bottom: 8px;">Early access to FollowUpTimer</li>
            <li style="margin-bottom: 8px;">Exclusive launch updates</li>
            <li style="margin-bottom: 8px;">Special perks for early supporters</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding-top: 32px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #999; margin: 0;">
            Stay tuned for updates!
          </p>
          <p style="font-size: 14px; color: #999; margin: 8px 0 0 0;">
            The FollowUpTimer Team
          </p>
        </div>
      </div>
    `,
  });
}
