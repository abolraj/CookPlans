package com.cookplans.alarm

import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class RingArgs {
    lateinit var title: String
    lateinit var body: String
    var stepName: String = ""
    var foodName: String = ""
    var dismissLabel: String = "Dismiss"
}

@InvokeArg
class EmptyArgs

@TauriPlugin
class AlarmPlugin(private val activity: Activity) : Plugin(activity) {

    @Command
    fun ring(invoke: Invoke) {
        val args = invoke.parseArgs(RingArgs::class.java)

        val intent = Intent(activity, AlarmService::class.java).apply {
            putExtra(AlarmService.EXTRA_TITLE, args.title)
            putExtra(AlarmService.EXTRA_BODY, args.body)
            putExtra(AlarmService.EXTRA_STEP, args.stepName)
            putExtra(AlarmService.EXTRA_FOOD, args.foodName)
            putExtra(AlarmService.EXTRA_DISMISS_LABEL, args.dismissLabel)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            activity.startForegroundService(intent)
        } else {
            activity.startService(intent)
        }
        invoke.resolve()
    }

    @Command
    fun dismiss(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        val stopIntent = Intent(activity, AlarmService::class.java)
        activity.stopService(stopIntent)
        val nm = activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(AlarmService.NOTIFICATION_ID)
        invoke.resolve()
    }

    @Command
    fun isAlarmRinging(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        val result = JSObject()
        result.put("ringing", AlarmService.isRunning)
        invoke.resolve(result)
    }

    @Command
    fun openExactAlarmSettings(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                    data = Uri.parse("package:${activity.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                activity.startActivity(intent)
            } catch (_: Exception) {
                activity.startActivity(
                    Intent(Settings.ACTION_SETTINGS).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                )
            }
        }
        invoke.resolve()
    }

    @Command
    fun openFullScreenIntentSettings(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                    data = Uri.parse("package:${activity.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                activity.startActivity(intent)
            } catch (_: Exception) {
                activity.startActivity(
                    Intent(Settings.ACTION_SETTINGS).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                )
            }
        }
        invoke.resolve()
    }
}