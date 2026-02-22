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

/**
 * A highly elevated full-screen programmatic component expressly designed for waking
 * the device entirely out of an idle, screen-off state.
 *
 * This Activity utilizes aggressive window management instructions designed to overlay
 * keyguards (passwords, PINs, biometrics) natively, ensuring that regardless of the 
 * device's current state, the user is visibly and audibly informed of their task.
 */
class AlarmActivity : Activity() {
    
    // Abstracted variables handling OS specific media logic
    private var alertRingtone: Ringtone? = null
    private var deviceVibrator: Vibrator? = null

    companion object {
        private const val TAG = "AlarmActivity"
        
        // Contextual strings matching incoming intents
        private const val EXTRA_INSTANCE_ID = "instance_id"
        private const val EXTRA_TITLE = "title"
    }

    /**
     * Executes immediately upon initialization of the Activity instance.
     * Establishes the OS permissions, hardware bypasses, and constructs the visual component.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        elevateWindowPermissions()

        val taskInstanceId = intent.getStringExtra(EXTRA_INSTANCE_ID) ?: ""
        val taskTitle = intent.getStringExtra(EXTRA_TITLE) ?: "Unknown Task"
        Log.d(TAG, "Activity instantiated. Context identifier allocated -> [$taskInstanceId]")

        initiateHardwareAlerts()
        constructVisualHierarchy(taskTitle, taskInstanceId)
    }

    /**
     * Injects the critical WindowManager attributes required to instruct the OS to
     * bypass native locking screens and forcibly toggle the display power state to ON.
     */
    private fun elevateWindowPermissions() {
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
    }

    /**
     * Dynamically constructs the user interface directly via native Android views.
     * Using native code generation guarantees the UI can load and execute instantly,
     * without inherently waiting for React Native engine evaluation.
     *
     * @param taskTitle The text description of the alarm.
     * @param instanceId The unique UUID of the triggering task for mutation correlation.
     */
    private fun constructVisualHierarchy(taskTitle: String, instanceId: String) {
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0A0A0A"))
            setPadding(48, 48, 48, 48)
        }

        val headerText = TextView(this).apply {
            text = "Time for:\n$taskTitle"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 32f)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 16, 0, 48)
        }
        rootLayout.addView(headerText)

        val dismissalButton = Button(this).apply {
            text = "DISMISS"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#4FA0FF"))
            
            setOnClickListener {
                Log.d(TAG, "User dispatched manual suppression parameter. Resolving active execution variables.")
                
                terminateHardwareAlerts()

                if (instanceId.isNotEmpty()) {
                    AlarmScheduler.markInstanceProceeded(applicationContext, instanceId)
                }

                // Chaining effect: immediately query the system for the very next event.
                AlarmScheduler.scheduleNextAlarm(applicationContext)

                finish()
            }
        }
        rootLayout.addView(dismissalButton)

        setContentView(rootLayout)
    }

    /**
     * Attempts default Android framework payload resolution for native alarms.
     * Reverts safely to basic notification signals if explicit alarms are missing,
     * simultaneously establishing a repeating bi-modal vibration interval.
     */
    private fun initiateHardwareAlerts() {
        try {
            var defaultAlertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            if (defaultAlertUri == null) {
                defaultAlertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }
            alertRingtone = RingtoneManager.getRingtone(applicationContext, defaultAlertUri)
            alertRingtone?.play()

            deviceVibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            // Vibration instruction explicit pattern: [Delay ms, Vibrate ms, Delay ms]
            val vibrationPattern = longArrayOf(0, 500, 500)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                deviceVibrator?.vibrate(VibrationEffect.createWaveform(vibrationPattern, 0)) // Index 0 denotes indefinite sequence loop
            } else {
                @Suppress("DEPRECATION")
                deviceVibrator?.vibrate(vibrationPattern, 0)
            }
        } catch (hardwareException: Exception) {
            Log.e(TAG, "Critical hardware level API rejection establishing systemic alerts: ${hardwareException.message}", hardwareException)
        }
    }

    /**
     * Gracefully forces the hardware API abstractions to conclude all output generation.
     */
    private fun terminateHardwareAlerts() {
        alertRingtone?.takeIf { it.isPlaying }?.stop()
        deviceVibrator?.cancel()
    }

    /**
     * Safely traps lifecycle destruction parameters to guarantee the media is halted.
     */
    override fun onDestroy() {
        super.onDestroy()
        terminateHardwareAlerts()
    }
}
