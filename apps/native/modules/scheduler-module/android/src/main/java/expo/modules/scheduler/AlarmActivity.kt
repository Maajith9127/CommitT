package expo.modules.scheduler

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class AlarmActivity : Activity() {
    
    private var ringtone: Ringtone? = null
    private var vibrator: Vibrator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Ensure device wakes up and shows above keyguard
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

        val instanceId = intent.getStringExtra("instance_id") ?: ""
        val title = intent.getStringExtra("title") ?: "Unknown Task"
        Log.d("AlarmActivity", "🔔 AlarmActivity created for: $title (ID: $instanceId)")

        // --- Start Ringtone and Vibration ---
        startAlarmSoundAndVibration()

        // Build a super simple UI
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0A0A0A"))
            setPadding(48, 48, 48, 48)
        }

        val titleText = TextView(this).apply {
            text = "Time for:\n$title"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 32f)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 16, 0, 48)
        }
        layout.addView(titleText)

        val dismissButton = Button(this).apply {
            text = "DISMISS"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#4FA0FF"))
            
            setOnClickListener {
                Log.d("AlarmActivity", "👆 User tapped DISMISS for $title. Proceeding task and scheduling next...")
                
                stopAlarmSoundAndVibration()

                // 1. Mark this specific instance as completed/proceeded in SQLite
                if (instanceId.isNotEmpty()) {
                    AlarmScheduler.markInstanceProceeded(applicationContext, instanceId)
                }

                // 2. Schedule the next alarm from the database
                AlarmScheduler.scheduleNextAlarm(applicationContext)

                // 3. Close the screen
                finish()
            }
        }
        layout.addView(dismissButton)

        setContentView(layout)
    }

    private fun startAlarmSoundAndVibration() {
        try {
            // Play Default Alarm Sound
            var alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            if (alertUri == null) {
                // Fallback to notification sound if no alarm sound is set
                alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }
            ringtone = RingtoneManager.getRingtone(applicationContext, alertUri)
            ringtone?.play()

            // Vibrate exactly like an alarm (Wait 0, Vibrate 500ms, Wait 500ms... repeat)
            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            val pattern = longArrayOf(0, 500, 500)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0)) // 0 means repeat indefinitely
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        } catch (e: Exception) {
            Log.e("AlarmActivity", "❌ Failed to play ringtone/vibration: ${e.message}")
        }
    }

    private fun stopAlarmSoundAndVibration() {
        ringtone?.takeIf { it.isPlaying }?.stop()
        vibrator?.cancel()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopAlarmSoundAndVibration()
    }
}
