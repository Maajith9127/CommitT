package expo.modules.scheduler

import android.app.Activity
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
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
        Log.v(TAG, "[OS MANIPULATION] Window Flags Applied. Power parameter: ALWAYS_ON.")
    }

    /**
     * constructVisualHierarchy()
     * 
     * Builds the alarm UI programmatically with the CommitT design system.
     * Uses dp-based measurements, consistent font weights, and the primary
     * blue pill button matching the blocker overlay's visual language.
     *
     * Layout structure (top-to-bottom, vertically centered):
     * ```
     * +----------------------------------+
     * |        (black background)         |
     * |                                   |
     * |       STATUS LABEL                |  <- light, 14sp, letter-spaced
     * |                                   |
     * |       Task Title                  |  <- medium, 28sp, white
     * |       Subtitle / Countdown        |  <- light, 16sp, grey
     * |                                   |
     * |       [ Dismiss ]                 |  <- semibold, primary blue pill
     * |                                   |
     * +----------------------------------+
     * ```
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

        val dp = { value: Float ->
            TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, value, resources.displayMetrics
            ).toInt()
        }

        // Base layout — pure black, centered content
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.BLACK)
            setPadding(dp(32f), dp(48f), dp(32f), dp(48f))
        }

        // ── Status label (alarm type context) ──
        val statusLabel: String
        val statusColor: Int

        when (alarmType) {
            "PRE_ALARM" -> {
                statusLabel = "UPCOMING"
                statusColor = Color.WHITE
            }
            "CHECKPOINT_ALARM" -> {
                statusLabel = "CHECK IN"
                statusColor = Color.WHITE
            }
            "END_ALARM" -> {
                statusLabel = "TIME'S UP"
                statusColor = Color.parseColor("#FF6B6B")
            }
            else -> {
                statusLabel = "TIME TO START"
                statusColor = Color.WHITE
            }
        }

        val headingText = TextView(this).apply {
            text = statusLabel
            typeface = Typeface.create("sans-serif-light", Typeface.NORMAL)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            setTextColor(statusColor)
            letterSpacing = 0.2f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(16f))
        }
        rootLayout.addView(headingText)

        // ── Task title (primary content) ──
        val titleText = TextView(this).apply {
            text = taskTitle
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 36f)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(8f))
        }
        rootLayout.addView(titleText)

        // ── Subtitle / countdown info ──
        val subtitleContent: String? = when (alarmType) {
            "PRE_ALARM" -> {
                val minutesRemaining = max(1, (mainTimeMs - System.currentTimeMillis()) / 60000)
                if (minutesRemaining == 1L) "Starting in 1 minute" else "Starting in $minutesRemaining minutes"
            }
            "CHECKPOINT_ALARM" -> "Confirm you are on track"
            "END_ALARM" -> "Your commitment window has ended"
            "MAIN_ALARM" -> "Your commitment starts now"
            else -> null
        }

        if (subtitleContent != null) {
            val subtitleText = TextView(this).apply {
                text = subtitleContent
                typeface = Typeface.create("sans-serif-light", Typeface.NORMAL)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
                setTextColor(Color.parseColor("#BBBBBB"))
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, dp(48f))
            }
            rootLayout.addView(subtitleText)
        } else {
            val spacer = android.view.View(this)
            rootLayout.addView(spacer, LinearLayout.LayoutParams(0, dp(40f)))
        }

        Log.d(TAG, "[UI CONSTRUCTION] Render -> $alarmType")

        // ── Primary action: Dismiss button (pill shape, primary blue) ──
        val dismissalButton = Button(this).apply {
            text = "Dismiss"
            typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setTextColor(Color.WHITE)

            val shape = android.graphics.drawable.GradientDrawable().apply {
                shape = android.graphics.drawable.GradientDrawable.RECTANGLE
                cornerRadius = dp(100f).toFloat()
                setColor(Color.parseColor("#4FA0FF"))
            }
            background = shape

            setPadding(dp(16f), 0, dp(16f), 0)
            isAllCaps = false
            
            setOnClickListener {
                Log.i(TAG, "==== [USER DISMISSAL DETECTED] ====")
                Log.d(TAG, "[WAKE API] Terminating audio and vibration oscillations.")
                
                terminateHardwareAlerts()

                if (alarmType == "MAIN_ALARM" && instanceId.isNotEmpty()) {
                    Log.i(TAG, "[MUTATION] Triggering 'proceeded' status update for ID: $instanceId")
                    if (!isStayThroughout) {
                         AlarmScheduler.markInstanceProceeded(applicationContext, instanceId)
                    } else {
                         Log.d(TAG, "[MUTATION] Skipping 'proceeded' status for 'stay_throughout' main alarm.")
                    }
                } else if (alarmType == "END_ALARM") {
                    Log.d(TAG, "[MUTATION] END_ALARM dismissed. Backend handles verification verdict.")
                } else if (alarmType == "CHECKPOINT_ALARM") {
                    Log.d(TAG, "[MUTATION] Checkpoint dismissed. No local DB mutation required.")
                } else if (alarmType == "PRE_ALARM") {
                    Log.d(TAG, "[MUTATION] Pre-alarm dismissed.")
                }

                Log.i(TAG, "[CHAIN PROPAGATION] Propagating schedule chain upon dismissal.")
                hasScheduledNext = true
                AlarmScheduler.scheduleNextAlarm(applicationContext)

                Log.d(TAG, "[WAKE API] Finishing activity.")
                finish()
            }
        }

        val btnParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(56f)
        ).apply {
            setMargins(dp(24f), 0, dp(24f), 0)
        }
        rootLayout.addView(dismissalButton, btnParams)

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
            val alarmAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            alertMediaPlayer = MediaPlayer().apply {
                setAudioAttributes(alarmAttributes)
                setDataSource(applicationContext, resolvedUri!!)
                isLooping = true
                prepare()
            }

            Log.d(TAG, "[SYSTEM ALERTS] MediaPlayer prepared. Starting looped playback.")
            alertMediaPlayer?.start()

            // PHASE 3: HAPTIC VIBRATION
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
                it.release()
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
