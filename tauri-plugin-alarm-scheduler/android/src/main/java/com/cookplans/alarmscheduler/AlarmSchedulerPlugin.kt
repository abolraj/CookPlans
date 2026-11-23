package com.cookplans.alarmscheduler

import android.Manifest
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import org.json.JSONObject

private const val TAG = "AlarmScheduler"
private const val PREFS = "alarm_scheduler_prefs"
private const val KEY_IDS = "scheduled_ids"
private const val SERVICE_CLS = "com.cookplans.alarm.AlarmService"
private const val X_TITLE = "title"
private const val X_BODY = "body"
private const val X_STEP = "step"
private const val X_FOOD = "food"
private const val X_DISMISS = "dismiss_label"
private const val X_ID = "id"
private const val X_TRIGGER = "trigger"

@InvokeArg
class ScheduleArgs {
    var id: Int = 0
    var triggerAtMillis: Long = 0L
    lateinit var title: String
    lateinit var body: String
    var stepName: String = ""
    var foodName: String = ""
    var dismissLabel: String = "Dismiss"
}

@InvokeArg
class CancelArgs {
    var id: Int = 0
}

@InvokeArg
class EmptyArgs

@TauriPlugin
class AlarmSchedulerPlugin(private val activity: Activity) : Plugin(activity) {

    private fun buildIntent(a: ScheduleArgs): Intent {
        val i = Intent()
        // Library classes are merged into the APP, so use the app's package.
        i.setClassName(activity.packageName, SERVICE_CLS)
        i.putExtra(X_TITLE, a.title)
        i.putExtra(X_BODY, a.body)
        i.putExtra(X_STEP, a.stepName)
        i.putExtra(X_FOOD, a.foodName)
        i.putExtra(X_DISMISS, a.dismissLabel)
        i.putExtra(X_ID, a.id)
        i.putExtra(X_TRIGGER, a.triggerAtMillis)
        return i
    }

    private fun piFor(id: Int, intent: Intent): PendingIntent {
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PendingIntent.getForegroundService(activity, id, intent, flags)
        } else {
            PendingIntent.getService(activity, id, intent, flags)
        }
    }

    @Command
    fun schedule(invoke: Invoke) {
        try {
            val a = invoke.parseArgs(ScheduleArgs::class.java)
            val am = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            // Require exact-alarm permission — no silent fallback, because
            // inexact alarms can't start a foreground service from background.
            val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                am.canScheduleExactAlarms()
            } else true

            if (!canExact) {
                invoke.reject(
                    "Exact alarm permission not granted. Ask the user to grant " +
                    "SCHEDULE_EXACT_ALARM via the permissions modal before scheduling."
                )
                return
            }

            val pi = piFor(a.id, buildIntent(a))
            am.setAlarmClock(AlarmManager.AlarmClockInfo(a.triggerAtMillis, null), pi)

            persistAlarm(a)
            remember(a.id)
            invoke.resolve()
        } catch (e: Exception) {
            Log.e(TAG, "schedule failed", e)
            invoke.reject(e.message ?: "schedule failed")
        }
    }

    private fun persistAlarm(a: ScheduleArgs) {
        val json = JSONObject().apply {
            put("id", a.id)
            put("triggerAtMillis", a.triggerAtMillis)
            put("title", a.title)
            put("body", a.body)
            put("stepName", a.stepName)
            put("foodName", a.foodName)
            put("dismissLabel", a.dismissLabel)
        }
        prefs().edit().putString("alarm_${a.id}", json.toString()).apply()
    }

    private fun forgetAlarm(id: Int) {
        prefs().edit().remove("alarm_$id").apply()
    }

    @Command
    fun cancel(invoke: Invoke) {
        try {
            val a = invoke.parseArgs(CancelArgs::class.java)
            cancelInternal(a.id)
            forget(a.id)
            forgetAlarm(a.id)
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject(e.message ?: "cancel failed")
        }
    }

    @Command
    fun cancelAll(invoke: Invoke) {
        try {
            for (id in ids()) {
                cancelInternal(id)
                forgetAlarm(id)
            }
            clearIds()
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject(e.message ?: "cancelAll failed")
        }
    }

    @Command
    fun checkAlarmPermissions(invoke: Invoke) {
        val r = JSObject()

        val notifOk = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
        r.put("notificationsGranted", notifOk)

        val exactOk = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.canScheduleExactAlarms()
        } else {
            true
        }
        r.put("exactAlarmGranted", exactOk)

        val fsiOk = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val nm = activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.canUseFullScreenIntent()
        } else {
            true
        }
        r.put("fullScreenIntentGranted", fsiOk)

        invoke.resolve(r)
    }

    @Command
    fun requestNotificationPermission(invoke: Invoke) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                9201
            )
        }
        invoke.resolve()
    }

    private fun cancelInternal(id: Int) {
        val am = activity.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val empty = Intent()
        empty.setClassName(activity.packageName, SERVICE_CLS)
        val pi = piFor(id, empty)
        am.cancel(pi)
        pi.cancel()
    }

    private fun prefs() =
        activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun ids(): List<Int> {
        val set: Set<String>? = prefs().getStringSet(KEY_IDS, emptySet())
        if (set == null) return emptyList()
        val out = ArrayList<Int>()
        for (s in set) {
            val v = s.toIntOrNull()
            if (v != null) out.add(v)
        }
        return out
    }

    private fun remember(id: Int) {
        val existing: Set<String> = prefs().getStringSet(KEY_IDS, emptySet()) ?: emptySet()
        val next = existing.toMutableSet()
        next.add(id.toString())
        prefs().edit().putStringSet(KEY_IDS, next).apply()
    }

    private fun forget(id: Int) {
        val existing: Set<String> = prefs().getStringSet(KEY_IDS, emptySet()) ?: emptySet()
        val next = existing.toMutableSet()
        next.remove(id.toString())
        prefs().edit().putStringSet(KEY_IDS, next).apply()
    }

    private fun clearIds() {
        prefs().edit().remove(KEY_IDS).apply()
    }
}