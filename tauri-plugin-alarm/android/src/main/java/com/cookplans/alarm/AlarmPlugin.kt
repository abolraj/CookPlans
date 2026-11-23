package com.cookplans.alarm

import android.app.Activity
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
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

    // ───────────── helpers ─────────────

    /** Try each intent in order; return true on the first that opens. */
    private fun startFirstAvailable(intents: List<Intent>): Boolean {
        for (i in intents) {
            try {
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                activity.startActivity(i)
                return true
            } catch (e: Exception) {
                Log.w("AlarmPlugin", "intent failed: ${i.component ?: i.action}", e)
            }
        }
        return false
    }

    private fun appDetailsIntent() =
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.parse("package:${activity.packageName}")
        }

    private fun appLabel(): String = try {
        activity.applicationInfo.loadLabel(activity.packageManager).toString()
    } catch (_: Exception) {
        "CookPlans"
    }

    // ───────────── alarm ─────────────

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

    // ───────────── standard permission screens ─────────────

    @Command
    fun openExactAlarmSettings(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val ok = startFirstAvailable(
                listOf(
                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                        data = Uri.parse("package:${activity.packageName}")
                    },
                    appDetailsIntent(),
                )
            )
            if (!ok) Log.e("AlarmPlugin", "no settings screen could be opened")
        }
        invoke.resolve()
    }

    @Command
    fun openFullScreenIntentSettings(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startFirstAvailable(
                listOf(
                    Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                        data = Uri.parse("package:${activity.packageName}")
                    },
                    appDetailsIntent(),
                )
            )
        }
        invoke.resolve()
    }

    // ───────────── Xiaomi / MIUI / HyperOS ─────────────

    @Command
    fun getOemInfo(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        val m = Build.MANUFACTURER.lowercase()
        val b = Build.BRAND.lowercase()
        val isXiaomi = listOf("xiaomi", "redmi", "poco", "blackshark").any {
            m.contains(it) || b.contains(it)
        }
        val r = JSObject()
        r.put("manufacturer", Build.MANUFACTURER)
        r.put("isXiaomi", isXiaomi)
        invoke.resolve(r)
    }

    /** Security app → Autostart list. */
    @Command
    fun openAutostartSettings(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        startFirstAvailable(
            listOf(
                Intent().setComponent(
                    ComponentName(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity"
                    )
                ),
                Intent("miui.intent.action.OP_AUTO_START").addCategory(Intent.CATEGORY_DEFAULT),
                appDetailsIntent(),
            )
        )
        invoke.resolve()
    }

    /** Battery saver → "No restrictions" for this app. */
    @Command
    fun openXiaomiBatterySettings(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        startFirstAvailable(
            listOf(
                Intent().setComponent(
                    ComponentName(
                        "com.miui.powerkeeper",
                        "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"
                    )
                ).apply {
                    putExtra("package_name", activity.packageName)
                    putExtra("package_label", appLabel())
                },
                appDetailsIntent(),
            )
        )
        invoke.resolve()
    }

    /** MIUI per-app permission editor: "Show on lock screen", "Display pop-up windows while running in background". */
    @Command
    fun openXiaomiPermissionsEditor(invoke: Invoke) {
        invoke.parseArgs(EmptyArgs::class.java)
        startFirstAvailable(
            listOf(
                Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                    setClassName(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.permissions.PermissionsEditorActivity"
                    )
                    putExtra("extra_pkgname", activity.packageName)
                },
                Intent("miui.intent.action.APP_PERM_EDITOR").apply {
                    setClassName(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.permissions.AppPermissionsEditorActivity"
                    )
                    putExtra("extra_pkgname", activity.packageName)
                },
                appDetailsIntent(),
            )
        )
        invoke.resolve()
    }
}