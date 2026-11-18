import {
  cancel,
  createChannel,
  Importance,
  pending,
  Schedule,
  sendNotification,
  Visibility,          // ← added
} from "@tauri-apps/plugin-notification";

const CHANNEL_ID = "cookplans-reminders";
const CHANNEL_NAME = "Cooking reminders";
const CHANNEL_DESCRIPTION = "Step-by-step cooking alerts";

let channelReady = false;

/**
 * Ensure the high-importance Android notification channel exists.
 * Importance.High gives us the system default sound + heads-up banner.
 * Visibility.Public shows content on the lock screen.
 * Safe to call multiple times; it is a no-op after the first success.
 */
export async function ensureCookingChannel(): Promise<void> {
  if (channelReady) return;
  try {
    await createChannel({
      id: CHANNEL_ID,
      name: CHANNEL_NAME,
      description: CHANNEL_DESCRIPTION,
      importance: Importance.High,
      visibility: Visibility.Public,   // ← fixed: Visibility, not Importance
      vibration: true,
    });
    channelReady = true;
  } catch (e) {
    console.warn("[notifications] createChannel failed", e);
  }
}

function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0);
}

export interface StepReminderParams {
  fireAt: Date;
  key: string;
  title: string;
  body: string;
  largeBody: string;
}

/**
 * Schedule an OS-level notification via Android's AlarmManager.
 * Fires even if the app is closed or the screen is locked.
 * allowWhileIdle so Doze mode doesn't defer it by hours.
 */
export async function scheduleStepReminder(p: StepReminderParams): Promise<void> {
  await ensureCookingChannel();
  const id = hashId(p.key);
  try {
    await sendNotification({
      id,
      title: p.title,
      body: p.body,
      largeBody: p.largeBody,
      channelId: CHANNEL_ID,
      schedule: Schedule.at(p.fireAt, false, true),
    });
  } catch (e) {
    console.warn("[notifications] schedule failed", e);
  }
}

/**
 * Remove every pending (not-yet-fired) scheduled notification.
 * Called before rescheduling so the OS queue matches the DB.
 */
export async function cancelAllReminders(): Promise<void> {
  try {
    const armed = await pending();
    if (armed.length) {
      // ← fixed: cancel() expects number[] — map to IDs
      await cancel(armed.map((n) => n.id));
    }
  } catch (e) {
    console.warn("[notifications] cancelAll failed", e);
  }
}

/**
 * Return the next Date at the given weekday (0=Sun..6=Sat) and time
 * (minutes from midnight). Skips to next week if it has already passed.
 */
export function nextWeekdayOccurrence(
  targetDow: number,
  minutesFromMidnight: number
): Date {
  const now = new Date();
  const target = new Date(now);
  target.setHours(0, 0, 0, 0);
  const diff = (targetDow - now.getDay() + 7) % 7;
  target.setDate(now.getDate() + diff);
  target.setHours(
    Math.floor(minutesFromMidnight / 60),
    minutesFromMidnight % 60,
    0,
    0
  );
  if (target <= now) target.setDate(target.getDate() + 7);
  return target;
}