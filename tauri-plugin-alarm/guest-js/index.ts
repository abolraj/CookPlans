import { invoke } from '@tauri-apps/api/core';

export interface AlarmArgs {
  title: string;
  body: string;
  stepName?: string;
  foodName?: string;
  dismissLabel?: string;
}

export interface PermissionStatus {
  notificationsGranted: boolean;
  exactAlarmGranted: boolean;
  fullScreenIntentGranted: boolean;
}

export interface RingingStatus {
  ringing: boolean;
}

export async function ring(args: AlarmArgs): Promise<void> {
  return invoke('plugin:alarm|ring', { args });
}

export async function dismiss(): Promise<void> {
  return invoke('plugin:alarm|dismiss');
}

export async function isAlarmRinging(): Promise<RingingStatus> {
  return invoke('plugin:alarm|is_alarm_ringing');
}

export async function checkAndroidPermissions(): Promise<PermissionStatus> {
  return invoke('plugin:alarm|check_android_permissions');
}

export async function requestNotificationPermission(): Promise<void> {
  return invoke('plugin:alarm|request_notification_permission');
}

export async function openExactAlarmSettings(): Promise<void> {
  return invoke('plugin:alarm|open_exact_alarm_settings');
}

export async function openFullScreenIntentSettings(): Promise<void> {
  return invoke('plugin:alarm|open_full_screen_intent_settings');
}
