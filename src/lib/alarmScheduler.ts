import { invoke } from "@tauri-apps/api/core";

export interface ScheduleAlarmArgs {
  id: number;
  triggerAtMillis: number;
  title: string;
  body: string;
  stepName?: string;
  foodName?: string;
  dismissLabel?: string;
}

export interface PermissionsStatus {
  notificationsGranted: boolean;
  exactAlarmGranted: boolean;
  fullScreenIntentGranted: boolean;
}

export const alarmScheduler = {
  schedule: (args: ScheduleAlarmArgs) =>
    invoke<void>("plugin:alarm-scheduler|schedule", { args }),
  cancel: (id: number) =>
    invoke<void>("plugin:alarm-scheduler|cancel", { args: { id } }),
  cancelAll: () =>
    invoke<void>("plugin:alarm-scheduler|cancel_all"),
  checkPermissions: () =>
    invoke<PermissionsStatus>("plugin:alarm-scheduler|check_permissions"),
  requestNotificationPermission: () =>
    invoke<void>("plugin:alarm-scheduler|request_notification_permission"),
};

export function hashId(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0);
}