import { getUserPreferences } from "./user-preferences";
import { getUserSnoozePreferences } from "./snooze-rules";
import { isWithinWorkingHours, isWithinQuietHours, isWeekend, getNextWorkingDay } from "./snooze-rules";

/**
 * Get default follow-up date based on user preferences
 * Respects working hours, quiet hours, and weekends
 */
export async function getDefaultFollowupDate(
  userId: string,
  baseDate: Date,
  timezone: string = "UTC"
): Promise<Date> {
  const prefs = await getUserPreferences(userId);
  const snoozePrefs = await getUserSnoozePreferences(userId);

  // Calculate base follow-up date (baseDate + interval days)
  const followupDate = new Date(baseDate);
  followupDate.setDate(followupDate.getDate() + prefs.default_followup_interval_days);

  // Adjust to working hours if needed
  if (!isWithinWorkingHours(followupDate, snoozePrefs, timezone)) {
    const [startHour, startMin] = snoozePrefs.working_hours_start.split(":").map(Number);
    followupDate.setHours(startHour, startMin, 0, 0);
    
    // If still not within working hours, move to next working day
    if (!isWithinWorkingHours(followupDate, snoozePrefs, timezone)) {
      const nextWorking = getNextWorkingDay(followupDate, snoozePrefs, timezone);
      nextWorking.setHours(startHour, startMin, 0, 0);
      return nextWorking;
    }
  }

  // Check quiet hours
  if (isWithinQuietHours(followupDate, snoozePrefs, timezone)) {
    // Move to after quiet hours end
    if (snoozePrefs.quiet_hours_end) {
      const [endHour, endMin] = snoozePrefs.quiet_hours_end.split(":").map(Number);
      followupDate.setHours(endHour, endMin, 0, 0);
    } else {
      // If no quiet hours end, move to working hours start
      const [startHour, startMin] = snoozePrefs.working_hours_start.split(":").map(Number);
      followupDate.setHours(startHour, startMin, 0, 0);
    }
  }

  // Check weekends
  if (!snoozePrefs.allow_weekends && isWeekend(followupDate, timezone)) {
    const nextWorking = getNextWorkingDay(followupDate, snoozePrefs, timezone);
    const [startHour, startMin] = snoozePrefs.working_hours_start.split(":").map(Number);
    nextWorking.setHours(startHour, startMin, 0, 0);
    return nextWorking;
  }

  return followupDate;
}

