import { DigestStats } from "./digest-stats";
import { DigestVariant } from "./digest-variant-selector";

export interface EmailTemplate {
  html: string;
  text: string;
  subject: string;
}

export interface InAppTemplate {
  title: string;
  content: string;
  data: Record<string, unknown>;
}

/**
 * Format a number safely (no NaN, no negative)
 */
function formatNumber(value: number | null | undefined): number {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.max(0, Math.round(value));
}

/**
 * Format a percentage safely
 */
function formatPercentage(value: number | null | undefined): number {
  return formatNumber(value);
}

/**
 * Format a date range for display
 */
function formatDateRange(start: Date, end: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/**
 * Render Standard variant template
 */
export function renderStandardTemplate(
  stats: DigestStats,
  variant: DigestVariant
): { email: EmailTemplate; inApp: InAppTemplate } {
  const { overall, per_contact, forward_looking, week_start, week_end, timezone } = stats;

  const weekRange = formatDateRange(week_start, week_end, timezone);
  const completionColor =
    overall.completion_rate >= 80
      ? "#10b981"
      : overall.completion_rate >= 50
      ? "#f59e0b"
      : "#ef4444";

  // Email HTML
  const emailHtml = `
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
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Week of ${weekRange}</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <!-- Stats Grid -->
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 32px; font-weight: bold; color: #667eea; margin-bottom: 5px;">${formatNumber(overall.total_reminders_created)}</div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Created</div>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 32px; font-weight: bold; color: #10b981; margin-bottom: 5px;">${formatNumber(overall.reminders_completed)}</div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Completed</div>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 32px; font-weight: bold; color: ${completionColor}; margin-bottom: 5px;">${formatPercentage(overall.completion_rate)}%</div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Completion Rate</div>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 32px; font-weight: bold; color: #f59e0b; margin-bottom: 5px;">${formatNumber(overall.reminders_snoozed)}</div>
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Snoozed</div>
      </div>
    </div>

    ${overall.reminders_suppressed > 0 ? `
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>${formatNumber(overall.reminders_suppressed)}</strong> reminders were intentionally held back this week (quiet hours, daily caps, etc.)
      </p>
    </div>
    ` : ""}

    ${per_contact.length > 0 ? `
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #1f2937;">👥 Top Contacts</h3>
      ${per_contact.map((contact) => `
        <div style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
          <strong>${contact.contact_name}</strong><br>
          <span style="color: #6b7280; font-size: 14px;">
            ${formatNumber(contact.reminders_completed)} completed, ${formatNumber(contact.reminders_overdue)} overdue
          </span>
        </div>
      `).join("")}
    </div>
    ` : ""}

    ${forward_looking.upcoming_reminders_next_7_days > 0 ? `
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #1f2937;">📅 Coming Up Next Week</h3>
      <p style="color: #4b5563; margin: 0;">
        <strong>${formatNumber(forward_looking.upcoming_reminders_next_7_days)}</strong> reminders scheduled
      </p>
    </div>
    ` : ""}

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
  `.trim();

  // Email text
  const emailText = `
Your Weekly FollowUp Timer Summary
Week of ${weekRange}

📊 Stats:
- Reminders Created: ${formatNumber(overall.total_reminders_created)}
- Reminders Completed: ${formatNumber(overall.reminders_completed)}
- Completion Rate: ${formatPercentage(overall.completion_rate)}%
- Reminders Snoozed: ${formatNumber(overall.reminders_snoozed)}
${overall.reminders_suppressed > 0 ? `- Reminders Suppressed: ${formatNumber(overall.reminders_suppressed)}\n` : ""}

${per_contact.length > 0 ? `\n👥 Top Contacts:\n${per_contact.map((c) => `- ${c.contact_name}: ${formatNumber(c.reminders_completed)} completed, ${formatNumber(c.reminders_overdue)} overdue`).join("\n")}\n` : ""}

${forward_looking.upcoming_reminders_next_7_days > 0 ? `\n📅 Coming Up: ${formatNumber(forward_looking.upcoming_reminders_next_7_days)} reminders scheduled next week\n` : ""}

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/dashboard
Manage preferences: ${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/settings
  `.trim();

  // In-app template
  const inApp: InAppTemplate = {
    title: `Weekly Summary - ${weekRange}`,
    content: `You completed ${formatNumber(overall.reminders_completed)} of ${formatNumber(overall.total_reminders_triggered)} reminders this week.`,
    data: {
      variant: "standard",
      stats: overall,
      per_contact: per_contact,
      forward_looking: forward_looking,
      week_range: weekRange,
    },
  };

  return {
    email: {
      html: emailHtml,
      text: emailText,
      subject: `Your Weekly FollowUp Timer Summary - ${formatPercentage(overall.completion_rate)}% Completion Rate`,
    },
    inApp,
  };
}

/**
 * Render Light variant template
 */
export function renderLightTemplate(
  stats: DigestStats,
  variant: DigestVariant
): { email: EmailTemplate; inApp: InAppTemplate } {
  const { overall, week_start, week_end, timezone } = stats;
  const weekRange = formatDateRange(week_start, week_end, timezone);

  const emailHtml = `
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
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Week of ${weekRange}</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="font-size: 18px; color: #4b5563; margin: 20px 0;">
      You're staying on top of things! 🎉
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="font-size: 48px; font-weight: bold; color: #667eea; margin-bottom: 10px;">${formatNumber(overall.total_reminders_created)}</div>
      <div style="font-size: 14px; color: #6b7280;">Reminders Created</div>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/dashboard" 
         style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Dashboard →
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const emailText = `
Your Weekly FollowUp Timer Summary
Week of ${weekRange}

You're staying on top of things! 🎉

Reminders Created: ${formatNumber(overall.total_reminders_created)}

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/dashboard
  `.trim();

  const inApp: InAppTemplate = {
    title: `Weekly Summary - ${weekRange}`,
    content: `You're staying on top of things! You created ${formatNumber(overall.total_reminders_created)} reminders this week.`,
    data: {
      variant: "light",
      stats: overall,
      week_range: weekRange,
    },
  };

  return {
    email: {
      html: emailHtml,
      text: emailText,
      subject: `Your Weekly FollowUp Timer Summary`,
    },
    inApp,
  };
}

/**
 * Render Recovery variant template
 */
export function renderRecoveryTemplate(
  stats: DigestStats,
  variant: DigestVariant
): { email: EmailTemplate; inApp: InAppTemplate } {
  const { overall, forward_looking, week_start, week_end, timezone } = stats;
  const weekRange = formatDateRange(week_start, week_end, timezone);

  const emailHtml = `
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
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Week of ${weekRange}</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 16px; color: #92400e; font-weight: 600;">
        Every step forward counts. Here's how you can get back on track:
      </p>
    </div>

    ${overall.reminders_overdue > 0 ? `
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h3 style="margin-top: 0; color: #1f2937;">Next Steps</h3>
      <p style="color: #4b5563;">
        You have <strong>${formatNumber(overall.reminders_overdue)}</strong> overdue reminders. 
        Let's tackle them one at a time.
      </p>
    </div>
    ` : ""}

    ${forward_looking.upcoming_reminders_next_7_days > 0 ? `
    <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <p style="color: #4b5563; margin: 0;">
        <strong>${formatNumber(forward_looking.upcoming_reminders_next_7_days)}</strong> reminders coming up next week. 
        You've got this!
      </p>
    </div>
    ` : ""}

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/dashboard" 
         style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Dashboard →
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const emailText = `
Your Weekly FollowUp Timer Summary
Week of ${weekRange}

Every step forward counts. Here's how you can get back on track:

${overall.reminders_overdue > 0 ? `You have ${formatNumber(overall.reminders_overdue)} overdue reminders. Let's tackle them one at a time.\n` : ""}
${forward_looking.upcoming_reminders_next_7_days > 0 ? `${formatNumber(forward_looking.upcoming_reminders_next_7_days)} reminders coming up next week. You've got this!\n` : ""}

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/dashboard
  `.trim();

  const inApp: InAppTemplate = {
    title: `Weekly Summary - ${weekRange}`,
    content: `Every step forward counts. ${overall.reminders_overdue > 0 ? `You have ${formatNumber(overall.reminders_overdue)} overdue reminders.` : "Let's get back on track."}`,
    data: {
      variant: "recovery",
      stats: overall,
      forward_looking: forward_looking,
      week_range: weekRange,
    },
  };

  return {
    email: {
      html: emailHtml,
      text: emailText,
      subject: `Your Weekly FollowUp Timer Summary`,
    },
    inApp,
  };
}

/**
 * Render No-Activity variant template
 */
export function renderNoActivityTemplate(
  stats: DigestStats | null,
  variant: DigestVariant
): { email: EmailTemplate; inApp: InAppTemplate } {
  const weekRange = stats
    ? formatDateRange(stats.week_start, stats.week_end, stats.timezone)
    : "this week";

  const emailHtml = `
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
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Week of ${weekRange}</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="font-size: 18px; color: #4b5563; margin: 20px 0;">
      Quiet week! No activity to report.
    </p>
    
    <p style="color: #6b7280; margin: 20px 0;">
      Ready to get started? Review your upcoming follow-ups and create your first reminder.
    </p>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/dashboard" 
         style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View Dashboard →
      </a>
    </div>
  </div>
</body>
</html>
  `.trim();

  const emailText = `
Your Weekly FollowUp Timer Summary
Week of ${weekRange}

Quiet week! No activity to report.

Ready to get started? Review your upcoming follow-ups and create your first reminder.

View your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'https://followuptimer.com'}/dashboard
  `.trim();

  const inApp: InAppTemplate = {
    title: `Weekly Summary - ${weekRange}`,
    content: `Quiet week! No activity to report. Ready to get started?`,
    data: {
      variant: "no_activity",
      week_range: weekRange,
    },
  };

  return {
    email: {
      html: emailHtml,
      text: emailText,
      subject: `Your Weekly FollowUp Timer Summary`,
    },
    inApp,
  };
}

/**
 * Main template renderer - selects appropriate variant renderer
 */
export function renderDigestTemplate(
  stats: DigestStats | null,
  variant: DigestVariant
): { email: EmailTemplate; inApp: InAppTemplate } {
  switch (variant) {
    case "light":
      return stats ? renderLightTemplate(stats, variant) : renderNoActivityTemplate(stats, variant);
    case "recovery":
      return stats ? renderRecoveryTemplate(stats, variant) : renderNoActivityTemplate(stats, variant);
    case "no_activity":
      return renderNoActivityTemplate(stats, variant);
    case "standard":
    default:
      return stats ? renderStandardTemplate(stats, variant) : renderNoActivityTemplate(stats, variant);
  }
}

