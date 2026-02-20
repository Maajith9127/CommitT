package expo.modules.scheduler

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Full-screen alarm overlay.
 * Shows on lock screen, plays alarm sound, vibrates.
 * User taps "DISMISS" → stops alarm, chains the next one.
 */
class AlarmActivity : Activity() {

    companion object {
        private const val TAG = "AlarmActivity"
    }

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── Show on lock screen + turn screen on ─────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        Log.d(TAG, "═══════════════════════════════════════════════")
        Log.d(TAG, "🔔 AlarmActivity.onCreate() STARTED")
        Log.d(TAG, "🔔 Time: ${System.currentTimeMillis()} (${AlarmScheduler.formatTime(System.currentTimeMillis())})")

        // ── Extract intent data ──────────────────────────────────────────
        val convexId = intent.getStringExtra("convex_id") ?: ""
        val title = intent.getStringExtra("title") ?: "Alarm"
        val recurrenceJson = intent.getStringExtra("recurrence_json") ?: ""
        val endTimeMs = intent.getLongExtra("end_time_ms", 0L)
        val isPreAlarm = intent.getBooleanExtra("is_pre_alarm", false)
        val preAlarmOffset = intent.getIntExtra("pre_alarm_offset", 0)

        Log.d(TAG, "🔔 convexId=$convexId")
        Log.d(TAG, "🔔 title='$title'")
        Log.d(TAG, "🔔 endTimeMs=$endTimeMs")
        Log.d(TAG, "🔔 recurrenceJson=${recurrenceJson.take(100)}")

        // ── Build UI programmatically ────────────────────────────────────
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0A0A0A"))
            setPadding(48, 48, 48, 48)
        }

        // Alarm icon
        val iconText = TextView(this).apply {
            text = "⏰"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 72f)
            gravity = Gravity.CENTER
        }
        layout.addView(iconText)

        // Spacer
        layout.addView(TextView(this).apply {
            text = ""
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
        })

        // "Time for:" label
        val labelText = TextView(this).apply {
            text = if (isPreAlarm) "Upcoming in $preAlarmOffset mins" else "Time for"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setTextColor(Color.parseColor("#AAAAAA"))
            gravity = Gravity.CENTER
            typeface = Typeface.create("sans-serif-light", Typeface.NORMAL)
        }
        layout.addView(labelText)

        // Task title
        val titleText = TextView(this).apply {
            text = title
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 32f)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            setPadding(0, 16, 0, 48)
        }
        layout.addView(titleText)

        // Dismiss button
        val dismissButton = Button(this).apply {
            text = "DISMISS"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#4FA0FF"))
            setPadding(64, 32, 64, 32)
            typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)

            // Rounded corners
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(Color.parseColor("#4FA0FF"))
                cornerRadius = 48f
            }

            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            params.topMargin = 32
            layoutParams = params
        }

        dismissButton.setOnClickListener {
            Log.d(TAG, "👆 DISMISS tapped for '$title' at ${AlarmScheduler.formatTime(System.currentTimeMillis())}")

            // Stop alarm
            stopAlarm()

            if (!isPreAlarm) {
                Log.d(TAG, "👆 Alarm stopped, now chaining next...")
                // Chain the next alarm
                try {
                    AlarmScheduler.chainNextAlarm(this@AlarmActivity, convexId, recurrenceJson, endTimeMs)
                    Log.d(TAG, "✅ chainNextAlarm() completed")
                } catch (e: Exception) {
                    Log.e(TAG, "❌ chainNextAlarm() FAILED: ${e.message}")
                    Log.e(TAG, "❌ Stack trace: ${e.stackTraceToString()}")
                }
            } else {
                Log.d(TAG, "👆 Pre-alarm stopped, no chaining needed.")
            }

            finish()
            Log.d(TAG, "👆 AlarmActivity finished")
            Log.d(TAG, "═══════════════════════════════════════════════")
        }

        layout.addView(dismissButton)

        setContentView(layout)
        Log.d(TAG, "🔔 UI built and setContentView() done")

        // ── Start alarm sound + vibration ────────────────────────────────
        startAlarm()
        Log.d(TAG, "🔔 startAlarm() completed")
    }

    private fun startAlarm() {
        // Play alarm sound
        try {
            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(this@AlarmActivity, alarmUri)
                isLooping = true
                prepare()
                start()
            }
            Log.d(TAG, "🔊 Alarm sound playing")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to play alarm sound: ${e.message}")
        }

        // Vibrate
        try {
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(VIBRATOR_SERVICE) as Vibrator
            }

            val pattern = longArrayOf(0, 800, 400, 800, 400, 800)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
            Log.d(TAG, "📳 Vibration started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to vibrate: ${e.message}")
        }
    }

    private fun stopAlarm() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping media: ${e.message}")
        }

        try {
            vibrator?.cancel()
            vibrator = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping vibration: ${e.message}")
        }
    }

    override fun onDestroy() {
        Log.d(TAG, "🔔 AlarmActivity.onDestroy() called")
        stopAlarm()
        super.onDestroy()
    }

    // Prevent back button from dismissing without chaining
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        Log.d(TAG, "🔔 Back button pressed — ignoring (user must tap DISMISS)")
        // Do nothing — force user to tap DISMISS
    }
}
