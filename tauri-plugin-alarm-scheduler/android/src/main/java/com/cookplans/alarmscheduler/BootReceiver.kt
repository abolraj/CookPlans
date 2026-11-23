package com.cookplans.alarmscheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONObject

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            rescheduleAll(context)
        }
    }

    private fun rescheduleAll(context: Context) {
        val prefs = context.getSharedPreferences(
            "alarm_scheduler_prefs", Context.MODE_PRIVATE
        )
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val now = System.currentTimeMillis()
        val week = 7L * 24 * 60 * 60 * 1000

        val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            am.canScheduleExactAlarms()
        } else true

        if (!canExact) {
            Log.w("BootReceiver", "exact alarms not permitted; skipping reschedule")
            return
        }

        for ((key, raw) in prefs.all) {
            if (!key.startsWith("alarm_") || raw !is String) continue
            try {
                val json = JSONObject(raw)
                var triggerAt = json.getLong("triggerAtMillis")

                // Missed while the phone was off: roll forward by whole weeks.
                if (triggerAt <= now) {
                    while (triggerAt <= now) triggerAt += week
                    json.put("triggerAtMillis", triggerAt)
                    prefs.edit().putString(key, json.toString()).apply()
                }

                val id = json.getInt("id")
                val intent = Intent().apply {
                    setClassName(context.packageName, "com.cookplans.alarm.AlarmService")
                    putExtra("id", id)
                    putExtra("trigger", triggerAt)
                    putExtra("title", json.getString("title"))
                    putExtra("body", json.getString("body"))
                    putExtra("step", json.optString("stepName", ""))
                    putExtra("food", json.optString("foodName", ""))
                    putExtra("dismiss_label", json.optString("dismissLabel", "Dismiss"))
                }
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                val pi = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    PendingIntent.getForegroundService(context, id, intent, flags)
                } else {
                    PendingIntent.getService(context, id, intent, flags)
                }
                am.setAlarmClock(AlarmManager.AlarmClockInfo(triggerAt, null), pi)
                Log.i("BootReceiver", "rescheduled alarm $id at $triggerAt")
            } catch (e: Exception) {
                Log.e("BootReceiver", "failed to reschedule $key", e)
            }
        }
    }
}