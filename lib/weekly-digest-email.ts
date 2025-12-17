import { Resend } from "resend";
import { type WeeklyStats } from "./weekly-digest";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate HTML email template for weekly digest
 */
function generateDigestHTML(stats: WeeklyStats): string {
  const completionColor =
    stats.completionRate >= 80
      ? "#10b981"
      : stats.completionRate >= 50
      ? "#f59e0b"
      : "#ef4444";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly FollowUp Timer Digest</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">📊 Your Weekly Summary</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Week of ${formatDate(stats.weekStart)} - ${formatDate(stats.weekEnd)}</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <!-- Stats Grid -->
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 32px; font-weight: bold; color: #667eea; margin-bottom: 5px;">${stats.remindersCreated}</div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Created</div>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 32px; font-weight: bold; color: #10b981; margin-bottom: 5px;">${stats.remindersCompleted}</div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Completed</div>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 32px; font-weight: bold; color: #f59e0b; margin-bottom: 5px;">${stats.currentStreak}</div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Day Streak</div>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 32px; font-weight: bold; color: ${completionColor}; margin-bottom: 5px;">${stats.completionRate}%</div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Completion Rate</div>
      </div>
    </div>

    <!-- Completion Rate Bar -->
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span style="font-weight: 600;">Completion Rate</span>
        <span style="font-weight: 600; color: ${completionColor};">${stats.completionRate}%</span>
      </div>
      <div style="background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
        <div style="background: ${completionColor}; height: 100%; width: ${stats.completionRate}%; transition: width 0.3s;"></div>
      </div>
    </div>

    <!-- Insights -->
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #1f2937;">💡 Insights</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
        <li>Your most active day: <strong>${stats.mostActiveDay}</strong></li>
        <li>Preferred affirmation tone: <strong>${capitalize(stats.topTone)}</strong></li>
        ${stats.averageSnoozeDuration > 0 ? `<li>Average snooze duration: <strong>${stats.averageSnoozeDuration} minutes</strong></li>` : ''}
      </ul>
    </div>

    <!-- Motivational Message -->
    <div style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
      <p style="margin: 0; font-style: italic; color: #4b5563;">
        ${getMotivationalMessage(stats)}
      </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/dashboard" 
         style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Dashboard →
      </a>
    </div>

    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px;">
      Sent by FollowUp Timer • <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/settings" style="color: #667eea;">Manage preferences</a>
    </p>
  </div>
</body>
</html>
  `;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getMotivationalMessage(stats: WeeklyStats): string {
  if (stats.completionRate >= 80) {
    return "Outstanding work! You're maintaining excellent follow-up consistency. Keep up the momentum!";
  } else if (stats.completionRate >= 50) {
    return "You're making good progress! Every completed reminder builds your productivity habits.";
  } else if (stats.remindersCreated > 0) {
    return "Every journey starts with a single step. You've created reminders—now let's focus on completing them!";
  } else {
    return "Ready to get started? Create your first reminder and begin building your follow-up habits!";
  }
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigestEmail(
  to: string,
  stats: WeeklyStats
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const from = process.env.RESEND_FROM || "onboarding@resend.dev";
    const subject = `Your Weekly FollowUp Timer Summary - ${stats.completionRate}% Completion Rate`;

    const html = generateDigestHTML(stats);
    const text = generateDigestText(stats);

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    if (result.error) {
      throw new Error(result.error.message || "Failed to send email");
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send weekly digest email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function generateDigestText(stats: WeeklyStats): string {
  return `
Your Weekly FollowUp Timer Summary
Week of ${formatDate(stats.weekStart)} - ${formatDate(stats.weekEnd)}

📊 Stats:
- Reminders Created: ${stats.remindersCreated}
- Reminders Completed: ${stats.remindersCompleted}
- Completion Rate: ${stats.completionRate}%
- Current Streak: ${stats.currentStreak} days
- Most Active Day: ${stats.mostActiveDay}
- Preferred Tone: ${capitalize(stats.topTone)}
${stats.averageSnoozeDuration > 0 ? `- Average Snooze: ${stats.averageSnoozeDuration} minutes` : ''}

${getMotivationalMessage(stats)}

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/dashboard
Manage preferences: ${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/settings
  `.trim();
}

