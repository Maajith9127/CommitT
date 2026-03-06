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
import kotlin.math.max

/**
 * AlarmActivity (The Visual Wakelock Interrupter)
 * 
 * This file constructs the UI completely in Native Java code instead of React Native.
 * Doing this ensures two incredible benefits:
 * 1. Immediate Execution. (It loads visually instantly without waiting for JS evaluation).
 * 2. Complete authority to tear through Android's lock screen entirely using custom Window Flags.
 */
class AlarmActivity : Activity() {
    
    // Media logic targets kept intentionally separated
    private var alertRingtone: Ringtone? = null
    private var deviceVibrator: Vibrator? = null
    
    // Safety flag to guarantee the scheduling chain NEVER breaks
    private var hasScheduledNext: Boolean = false

    companion object {
        private const val TAG = "AlarmActivity"
        
        // Variables matching intents passed from AlarmReceiver exclusively
        private const val EXTRA_INSTANCE_ID = "instance_id"
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_IS_PRE_ALARM = "is_pre_alarm"
        private const val EXTRA_MAIN_TIME_MS = "main_time_ms"
        private const val EXTRA_SOUND_KEY = "sound_key"
        private const val EXTRA_ALARM_TYPE = "alarm_type"
        private const val EXTRA_IS_STAY_THROUGHOUT = "is_stay_throughout"
    }

    /**
     * onCreate()
     * Fired the literal moment the UI object spawns.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        Log.i(TAG, "==== [WAKE ACTIVITY INITIALIZED] ====")
        Log.d(TAG, "[WAKE API] Evaluating Activity State lifecycle...")

        // Phase 1: Give our window ultimate screen bypass authority
        elevateWindowPermissions()

        // Phase 2: Digest intent variables configured originally by AlarmScheduler
        val taskInstanceId = intent.getStringExtra(EXTRA_INSTANCE_ID) ?: ""
        val taskTitle = intent.getStringExtra(EXTRA_TITLE) ?: "Unknown Task"
        val isPreAlarm = intent.getBooleanExtra(EXTRA_IS_PRE_ALARM, false)
        val mainTimeMs = intent.getLongExtra(EXTRA_MAIN_TIME_MS, 0L)
        val soundKey = intent.getStringExtra(EXTRA_SOUND_KEY) ?: "Default"
        val alarmType = intent.getStringExtra(EXTRA_ALARM_TYPE) ?: if (isPreAlarm) "PRE_ALARM" else "MAIN_ALARM"
        val isStayThroughout = intent.getBooleanExtra(EXTRA_IS_STAY_THROUGHOUT, false)

        val taskTypeText = alarmType.replace("_", " ")
        Log.i(TAG, "[WAKE LOGIC] UI Parameters -> Type: [$taskTypeText], Title: [$taskTitle], ID: [$taskInstanceId], Sound: [$soundKey]")

        if (taskInstanceId.isEmpty()) {
            Log.w(TAG, "[WAKE WARNING] Activity started with NULL Instance ID. Database mutations will fail.")
        }

        // Phase 3: Unleash sounds and vibrations so the phone physically demands attention
        initiateHardwareAlerts(soundKey)
        
        // Phase 4: Construct and bind the view structures
        constructVisualHierarchy(taskTitle, taskInstanceId, isPreAlarm, mainTimeMs, alarmType, isStayThroughout)
        
        Log.i(TAG, "==== [WAKE DISPLAY RENDER COMPLETE] ====")
    }

    /**
     * elevateWindowPermissions()
     * 
     * Injects the critical WindowManager attributes required to instruct the OS to
     * bypass native Keyguards (password screens) and forcibly toggle the display panel to ON.
     */
    private fun elevateWindowPermissions() {
        Log.d(TAG, "[OS MANIPULATION] Modifying underlying OS Window structures for lock bypass...")
        
        // Android 8.1 (Oreo MR1) deprecated flags and introduced clean explicit methodologies.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true) // Blows directly through Keyguard (Requires explicit Manifest XML configs we already added) 
            setTurnScreenOn(true)   // Flips screen completely
        } else {
            // Deprecated flag pathing universally executed for extremely old phone backward compatibility 
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        
        // KEEP_SCREEN_ON absolutely refuses to let the phone go idle immediately while this UI specifically is open
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        Log.v(TAG, "[OS MANIPULATION] Window Flags Applied. Power parameter: ALWAYS_ON.")
    }

    /**
     * constructVisualHierarchy()
     * 
     * Dynamically builds a simple Layout using Kotlin code so we bypass React Native bloat. 
     */
    private fun constructVisualHierarchy(
        taskTitle: String, 
        instanceId: String, 
        isPreAlarm: Boolean, 
        mainTimeMs: Long,
        alarmType: String,
        isStayThroughout: Boolean
    ) {
        Log.v(TAG, "[UI CONSTRUCTION] Building Native visual tree...")
        // Base layout spanning full dimensions of phone screen 
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0A0A0A")) // Sleek pure black styling background 
            setPadding(48, 48, 48, 48)
        }

        // Title text formatting dynamically changing output text mapping.
        val headerText = TextView(this).apply {
            when (alarmType) {
                "PRE_ALARM" -> {
                    // Determine a countdown offset explicitly rounded cleanly mathematically 
                    val minutesRemaining = max(1, (mainTimeMs - System.currentTimeMillis()) / 60000)
                    val timeLabel = if (minutesRemaining == 1L) "in 1 minute" else "in $minutesRemaining minutes"
                    text = "$taskTitle\n$timeLabel"
                    Log.d(TAG, "[UI CONSTRUCTION] Render -> PRE_ALARM countdown: $minutesRemaining mins")
                }
                "CHECKPOINT_ALARM" -> {
                    // Specific phrasing request by the user for stay_throughout check-ins!
                    text = "Check in for\n$taskTitle"
                    Log.d(TAG, "[UI CONSTRUCTION] Render -> CHECKPOINT_ALARM")
                }
                else -> {
                    // MAIN_ALARM or default fallback
                    text = "Time for:\n$taskTitle"
                    Log.d(TAG, "[UI CONSTRUCTION] Render -> MAIN_ALARM")
                }
            }

            setTextSize(TypedValue.COMPLEX_UNIT_SP, 32f)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 16, 0, 48)
        }
        rootLayout.addView(headerText)

        // The interactable "DISMISS" button sequence
        val dismissalButton = Button(this).apply {
            text = "DISMISS"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#4FA0FF")) // Attractive light-bluish interaction cue
            
            // Interaction logic routing exclusively back to AlarmScheduler
            setOnClickListener {
                Log.i(TAG, "==== [USER DISMISSAL DETECTED] ====")
                Log.d(TAG, "[WAKE API] Terminating audio and vibration oscillations.")
                
                // Immediately stop the noise/vibration
                terminateHardwareAlerts()

                // Logic bifurcation separating actual data manipulation consequences 
                if (alarmType == "MAIN_ALARM" && instanceId.isNotEmpty()) {
                    Log.i(TAG, "[MUTATION] Triggering 'proceeded' status update for ID: $instanceId")
                    if (!isStayThroughout) {
                         AlarmScheduler.markInstanceProceeded(applicationContext, instanceId)
                    } else {
                         Log.d(TAG, "[MUTATION] Skipping 'proceeded' status for 'stay_throughout' main alarm.")
                    }
                } else if (alarmType == "CHECKPOINT_ALARM") {
                    Log.d(TAG, "[MUTATION] Checkpoint dismissed. No local DB mutation required.")
                } else if (alarmType == "PRE_ALARM") {
                    Log.d(TAG, "[MUTATION] Pre-alarm dismissed.")
                }

                // Explicitly demand the routing framework completely rewrite Android AlarmManager configuration to the *next* trigger.
                Log.i(TAG, "[CHAIN PROPAGATION] Propagating schedule chain upon dismissal.")
                hasScheduledNext = true
                AlarmScheduler.scheduleNextAlarm(applicationContext)

                Log.d(TAG, "[WAKE API] Finishing activity.")
                // Disintegrate this activity from user focus natively
                finish()
            }
        }
        rootLayout.addView(dismissalButton)
        // Bind the hierarchy to screen
        setContentView(rootLayout)
    }

    /**
     * initiateHardwareAlerts()
     * 
     * Hooks natively directly into media controllers bypassing permissions for explicit noises.
     */
    private fun initiateHardwareAlerts(soundKey: String) {
        Log.d(TAG, "[SYSTEM ALERTS] Initializing alerts for sound: $soundKey")
        try {
            var finalAlertUri: android.net.Uri? = null
            
            // Try to resolve custom raw sound
            if (soundKey.isNotEmpty() && soundKey.lowercase() != "default") {
                val resId = resources.getIdentifier(soundKey.lowercase(), "raw", packageName)
                if (resId != 0) {
                    finalAlertUri = android.net.Uri.parse("android.resource://$packageName/$resId")
                    Log.i(TAG, "[SYSTEM ALERTS] Resolved custom resource: $finalAlertUri")
                } else {
                    Log.w(TAG, "[SYSTEM ALERTS] Custom sound '$soundKey' not found in /res/raw. Falling back.")
                }
            }

            // Fallback natively to device standard settings
            if (finalAlertUri == null) {
                finalAlertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                if (finalAlertUri == null) {
                    Log.w(TAG, "[SYSTEM ALERTS] No Alarm URI found. Defaulting to Notification URI.")
                    finalAlertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                }
            }
            
            Log.v(TAG, "[SYSTEM ALERTS] Final Audio URI: $finalAlertUri")
            alertRingtone = RingtoneManager.getRingtone(applicationContext, finalAlertUri)
            
            // 🚨 CRITICAL AUDIO FIX 🚨
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                alertRingtone?.audioAttributes = android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            } else {
                @Suppress("DEPRECATION")
                alertRingtone?.streamType = android.media.AudioManager.STREAM_ALARM
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                alertRingtone?.isLooping = true
            }
            
            Log.d(TAG, "[SYSTEM ALERTS] Starting Audio playback.")
            alertRingtone?.play()

            // Initialize hardware vibration component strictly matching array parameters
            deviceVibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            val vibrationPattern = longArrayOf(0, 500, 500)
            
            Log.d(TAG, "[SYSTEM ALERTS] Starting Vibration pattern.")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val vibrationAttributes = android.os.VibrationAttributes.Builder()
                    .setUsage(android.os.VibrationAttributes.USAGE_ALARM)
                    .build()
                deviceVibrator?.vibrate(VibrationEffect.createWaveform(vibrationPattern, 0), vibrationAttributes)
            } else {
                @Suppress("DEPRECATION")
                deviceVibrator?.vibrate(vibrationPattern, 0)
            }
        } catch (hardwareException: Exception) {
            Log.e(TAG, "[CRITICAL HARDWARE FAILURE] Alert initialization failed: ${hardwareException.message}", hardwareException)
        }
    }

    /**
     * terminateHardwareAlerts()
     */
    private fun terminateHardwareAlerts() {
        Log.i(TAG, "[SYSTEM ALERTS] Terminating audio and vibration.")
        alertRingtone?.takeIf { it.isPlaying }?.stop()
        deviceVibrator?.cancel()
    }

    /**
     * onDestroy()
     * Final lifecycle event implicitly guaranteeing nothing loops if user forces App closure natively. 
     */
    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "==== [WAKE ACTIVITY DESTROYED] ====")
        terminateHardwareAlerts()
        
        // EDGE CASE FIX: If the user "swiped away" the UI without clicking Dismiss,
        if (!hasScheduledNext) {
            Log.w(TAG, "[RECOVERY] UI closed without dismissal. Propagating schedule chain for resilience.")
            AlarmScheduler.scheduleNextAlarm(applicationContext)
        }
    }
}
