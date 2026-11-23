package com.cookplans.alarm

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toBitmap
import org.json.JSONObject

class AlarmService : Service() {

    companion object {
        @Volatile
        var isRunning: Boolean = false

        const val CHANNEL_ID = "cookplans-alarm"
        const val NOTIFICATION_ID = 9101
        const val EXTRA_TITLE = "title"
        const val EXTRA_BODY = "body"
        const val EXTRA_STEP = "step"
        const val EXTRA_FOOD = "food"
        const val EXTRA_DISMISS_LABEL = "dismiss_label"
        const val EXTRA_ID = "id"
        const val EXTRA_TRIGGER = "trigger"

        private const val TAG = "AlarmService"
        private const val WEEK_MS = 7L * 24 * 60 * 60 * 1000
        private const val AUTO_STOP_MS = 60_000L
        private const val PREFS = "alarm_scheduler_prefs"
    }

    private var mediaPlayer: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private val autoStop = Runnable {
        Log.i(TAG, "auto-stopping alarm after timeout")
        stopSelf()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Guard against a null-intent restart (ghost alarm).
        if (intent == null || intent.getStringExtra(EXTRA_TITLE) == null) {
            Log.w(TAG, "null intent on start — stopping to avoid ghost alarm")
            stopSelf()
            return START_NOT_STICKY
        }

        // Re-arm the same alarm for next week so the plan keeps working
        // even if the user never opens the app again.
        rearmNextWeek(intent)

        isRunning = true
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "CookPlans Alarm"
        val body = intent.getStringExtra(EXTRA_BODY) ?: "Your cooking step is starting"
        val stepName = intent.getStringExtra(EXTRA_STEP) ?: ""
        val foodName = intent.getStringExtra(EXTRA_FOOD) ?: ""
        val dismissLabel = intent.getStringExtra(EXTRA_DISMISS_LABEL) ?: "Dismiss"

        ensureChannel()
        val notification = buildNotification(title, body, stepName, foodName, dismissLabel)

        // startForeground FIRST (must happen within seconds), sound after.
        try {
            startForeground(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.e(TAG, "startForeground failed", e)
            try {
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.notify(NOTIFICATION_ID, notification)
            } catch (e2: Exception) {
                Log.e(TAG, "notify also failed", e2)
            }
            stopSelf()
            return START_NOT_STICKY
        }

        startAlarmSound()

        // Don't ring forever.
        handler.removeCallbacks(autoStop)
        handler.postDelayed(autoStop, AUTO_STOP_MS)

        return START_NOT_STICKY
    }

    private fun rearmNextWeek(src: Intent) {
        val id = src.getIntExtra(EXTRA_ID, -1)
        val trigger = src.getLongExtra(EXTRA_TRIGGER, 0L)
        if (id == -1 || trigger == 0L) return
        try {
            var next = trigger + WEEK_MS
            val now = System.currentTimeMillis()
            while (next <= now) next += WEEK_MS

            val am = getSystemService(Context.ALARM_SERVICE) as AlarmManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
                Log.w(TAG, "exact alarms not permitted; cannot re-arm")
                return
            }

            // Same component + same request code => same PendingIntent identity,
            // so the app's cancelAll() also cancels these re-armed alarms.
            val i = Intent(this, AlarmService::class.java).apply {
                src.extras?.let { putExtras(it) }
                putExtra(EXTRA_TRIGGER, next)
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            val pi = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                PendingIntent.getForegroundService(this, id, i, flags)
            } else {
                PendingIntent.getService(this, id, i, flags)
            }
            am.setAlarmClock(AlarmManager.AlarmClockInfo(next, null), pi)

            // Keep the boot-restore copy in sync.
            val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            prefs.getString("alarm_$id", null)?.let {
                val j = JSONObject(it)
                j.put("triggerAtMillis", next)
                prefs.edit().putString("alarm_$id", j.toString()).apply()
            }
            Log.i(TAG, "re-armed alarm $id for $next")
        } catch (e: Exception) {
            Log.e(TAG, "rearm failed", e)
        }
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Cooking alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Full-screen cooking alarms with looping sound"
                setBypassDnd(true)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                setSound(null, null) // we play our own sound via MediaPlayer
                enableVibration(true)
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }

    private fun stopAlarmSound() {
        try { mediaPlayer?.stop() } catch (_: Exception) {}
        try { mediaPlayer?.release() } catch (_: Exception) {}
        mediaPlayer = null
    }

    private fun startAlarmSound() {
        stopAlarmSound() // avoid leaking a player if a second alarm fires
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@AlarmService, uri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "alarm sound failed", e)
        }
    }

    private fun buildNotification(
        title: String,
        body: String,
        stepName: String,
        foodName: String,
        dismissLabel: String,
    ): Notification {
        val launchIntent = (packageManager.getLaunchIntentForPackage(packageName) ?: Intent()).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("alarm_ringing", true)
        }
        val fullScreenPending = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val dismissPending = PendingIntent.getBroadcast(
            this, 1, Intent(this, AlarmDismissReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val meta = listOf(foodName, stepName)
            .filter { it.isNotBlank() }
            .joinToString(" · ")

        val largeIcon = try {
            ContextCompat.getDrawable(this, R.drawable.pot)?.toBitmap(128, 128)
        } catch (_: Exception) {
            null
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_alarm)          // white monochrome silhouette
            .setLargeIcon(largeIcon)                    // colored pot
            .setColor(0xFFFFDC58.toInt())
            .setColorized(true)                         // whole row becomes yellow
            .setContentTitle(title)
            .setContentText(body)
            .setSubText(meta.ifBlank { "CookPlans" })
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(fullScreenPending)
            .setFullScreenIntent(fullScreenPending, true)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                dismissLabel,
                dismissPending
            )
            .build()
    }

    override fun onDestroy() {
        isRunning = false
        handler.removeCallbacks(autoStop)
        stopAlarmSound()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        super.onDestroy()
    }
}