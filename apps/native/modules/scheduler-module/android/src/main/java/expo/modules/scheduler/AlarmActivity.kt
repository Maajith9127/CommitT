package expo.modules.scheduler

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.media.AudioAttributes
import android.media.MediaPlayer
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
    
    /**
     * AUDIO ENGINE: MediaPlayer-based playback.
     * -----------------------------------------------------------------------
     * MediaPlayer is used instead of Ringtone for two critical production reasons:
     * 1. GUARANTEED LOOPING: MediaPlayer.isLooping works on ALL API levels,
     *    while Ringtone.isLooping only exists on API 28+ and has inconsistent
     *    OEM behavior (Samsung, Xiaomi, etc.).
     * 2. SHORT FILE SUPPORT: Even if the bundled .mp3 is only 2-3 seconds long,
     *    MediaPlayer seamlessly loops it until the user hits DISMISS.
     */
    private var alertMediaPlayer: MediaPlayer? = null
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
                "END_ALARM" -> {
                    // END_ALARM: Universal window-close notification.
                    // Fires at the exact end of every event to notify the user their
                    // habit window has closed. Backend verification handles the actual grading.
                    text = "⏰ Time's Up!\n$taskTitle"
                    setTextColor(Color.parseColor("#FF6B6B")) // Red accent for urgency
                    Log.d(TAG, "[UI CONSTRUCTION] Render -> END_ALARM")
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
                } else if (alarmType == "END_ALARM") {
                    // END_ALARM: No local mutation needed. The backend verification runner
                    // (runVerification) handles the final grading verdict and penalty logic.
                    // We simply acknowledge the end-of-window notification.
                    Log.d(TAG, "[MUTATION] END_ALARM dismissed. Backend handles verification verdict.")
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
     * -----------------------------------------------------------------------
     * Production Audio Pipeline: Resolves bundled /res/raw/ resources first,
     * falls back to system alarm/notification sounds only if the resource is
     * missing. Uses MediaPlayer for guaranteed seamless looping of any file
     * duration. Forces ALARM audio stream to bypass DND and silent mode.
     *
     * @param soundKey - The resource name to look up in /res/raw/ (without extension).
     *                   e.g., "alarm_start" resolves to /res/raw/alarm_start.mp3
     */
    private fun initiateHardwareAlerts(soundKey: String) {
        Log.d(TAG, "[SYSTEM ALERTS] Initializing alerts for sound: $soundKey")
        try {
            // PHASE 1: AUDIO RESOLUTION
            // Attempt to resolve the bundled raw resource. If it exists, we use it.
            // Otherwise, fall back to the device's default alarm tone.
            var resolvedUri: android.net.Uri? = null

            if (soundKey.isNotEmpty() && soundKey.lowercase() != "default") {
                val resId = resources.getIdentifier(soundKey.lowercase(), "raw", packageName)
                if (resId != 0) {
                    resolvedUri = android.net.Uri.parse("android.resource://$packageName/$resId")
                    Log.i(TAG, "[SYSTEM ALERTS] Resolved bundled resource: $resolvedUri")
                } else {
                    Log.w(TAG, "[SYSTEM ALERTS] Resource '$soundKey' not found in /res/raw. Falling back to system default.")
                }
            }

            // Fallback: System alarm tone -> System notification tone
            if (resolvedUri == null) {
                resolvedUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                if (resolvedUri == null) {
                    Log.w(TAG, "[SYSTEM ALERTS] No system alarm URI. Falling back to notification.")
                    resolvedUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                }
                Log.d(TAG, "[SYSTEM ALERTS] Using system fallback URI: $resolvedUri")
            }

            // PHASE 2: MEDIA PLAYER CONSTRUCTION
            // MediaPlayer is chosen over Ringtone for production reliability:
            // - isLooping works on ALL API levels (Ringtone only API 28+)
            // - AudioAttributes.USAGE_ALARM force-routes audio through the alarm
            //   stream, bypassing Do-Not-Disturb and silent mode restrictions.
            // - Seamlessly loops even sub-second audio files without gaps.
            val alarmAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            alertMediaPlayer = MediaPlayer().apply {
                setAudioAttributes(alarmAttributes)
                setDataSource(applicationContext, resolvedUri!!)
                isLooping = true   // CRITICAL: Loop until user dismisses
                prepare()          // Synchronous prepare (resource is local, never network)
            }

            Log.d(TAG, "[SYSTEM ALERTS] MediaPlayer prepared. Starting looped playback.")
            alertMediaPlayer?.start()

            // PHASE 3: HAPTIC VIBRATION
            // Parallel vibration pattern ensures the alarm is felt, not just heard.
            // Pattern: [delay=0ms, vibrate=500ms, pause=500ms] repeating from index 0.
            deviceVibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            val vibrationPattern = longArrayOf(0, 500, 500)

            Log.d(TAG, "[SYSTEM ALERTS] Starting vibration pattern.")
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
     * -----------------------------------------------------------------------
     * Cleanly releases all audio and haptic resources. Called on DISMISS click
     * and again in onDestroy() as a safety net to prevent orphaned playback.
     */
    private fun terminateHardwareAlerts() {
        Log.i(TAG, "[SYSTEM ALERTS] Terminating audio and vibration.")
        try {
            alertMediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()  // CRITICAL: Release native resources to prevent memory leaks
            }
        } catch (e: Exception) {
            Log.w(TAG, "[SYSTEM ALERTS] MediaPlayer release encountered error: ${e.message}")
        }
        alertMediaPlayer = null
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
