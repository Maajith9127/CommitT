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

        val taskTypeText = if (isPreAlarm) "PRE-ALARM TICK" else "MAIN ALARM EXECUTION"
        Log.d(TAG, "[WAKE LOGIC] Component mapped globally -> Scope: [$taskTypeText], Title: [$taskTitle], TaskID: [$taskInstanceId]")

        // Phase 3: Unleash sounds and vibrations so the phone physically demands attention
        initiateHardwareAlerts()
        
        // Phase 4: Construct and bind the view structures
        constructVisualHierarchy(taskTitle, taskInstanceId, isPreAlarm, mainTimeMs)
        
        Log.i(TAG, "==== [WAKE DISPLAY RENDER COMPLETE] ====")
    }

    /**
     * elevateWindowPermissions()
     * 
     * Injects the critical WindowManager attributes required to instruct the OS to
     * bypass native Keyguards (password screens) and forcibly toggle the display panel to ON.
     */
    private fun elevateWindowPermissions() {
        Log.d(TAG, "[OS MANIPULATION] Modifying underlying OS Window structures attempting direct bypass of lock interfaces.")
        
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
        Log.d(TAG, "[OS MANIPULATION] Direct API manipulation finalized effectively. Screen Power parameter: ON.")
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
        mainTimeMs: Long
    ) {
        // Base layout spanning full dimensions of phone screen 
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0A0A0A")) // Sleek pure black styling background 
            setPadding(48, 48, 48, 48)
        }

        // Title text formatting dynamically changing output text mapping.
        val headerText = TextView(this).apply {
            if (isPreAlarm) {
                // Determine a countdown offset explicitly rounded cleanly mathematically 
                val minutesRemaining = max(1, (mainTimeMs - System.currentTimeMillis()) / 60000)
                val timeLabel = if (minutesRemaining == 1L) "in 1 minute" else "in $minutesRemaining minutes"
                text = "$taskTitle\n$timeLabel"
                Log.d(TAG, "[UI CONSTRUCTION] Rendering dynamic countdown pre-alarm typography UI. Minutes Delta: $minutesRemaining")
            } else {
                text = "Time for:\n$taskTitle"
                Log.d(TAG, "[UI CONSTRUCTION] Rendering definitive main-alarm terminology typography UI.")
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
                if (!isPreAlarm && instanceId.isNotEmpty()) {
                    Log.d(TAG, "[MUTATION DISPATCH] Informing parent framework that Task Main Scope evaluated strictly as finished.")
                    // Only Main Alarms execute database closures cleanly
                    AlarmScheduler.markInstanceProceeded(applicationContext, instanceId)
                } else if (isPreAlarm) {
                    Log.d(TAG, "[MUTATION DISPATCH] Pre-alarm dismissed intentionally. Original Task state remains perfectly suspended.")
                    // Doing nothing here natively leaves the DB untouched, ensuring the subsequent alarms continue tracking
                }

                // Explicitly demand the routing framework completely rewrite Android AlarmManager configuration to the *next* trigger.
                Log.d(TAG, "[CHAIN PROPAGATION] Demanding subsequent task scheduling dynamically upon task user dismissal.")
                hasScheduledNext = true
                AlarmScheduler.scheduleNextAlarm(applicationContext)

                Log.d(TAG, "[WAKE API] Discarding active component and destroying Window View execution entirely.")
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
    private fun initiateHardwareAlerts() {
        Log.d(TAG, "[SYSTEM ALERTS] Routing API layer to initialize device sensory peripherals...")
        try {
            // Grab standard Alarm target URI exclusively from Android framework mappings
            var defaultAlertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            if (defaultAlertUri == null) {
                // In massive edge conditions, ALARM is missing, so we use simpler NOTIFICATION output
                Log.w(TAG, "[SYSTEM ALERTS DEGRADATION] System standard audio target unaligned. Defaulting fallback channel.")
                defaultAlertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            }
            alertRingtone = RingtoneManager.getRingtone(applicationContext, defaultAlertUri)
            
            // 🚨 CRITICAL AUDIO FIX 🚨
            // By default, RingtoneManager uses the "Ringer" volume (which respects Silent Mode).
            // We MUST explicitly force it to use the "Alarm" volume stream so it breaks through Silent/DND!
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                alertRingtone?.audioAttributes = android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            } else {
                @Suppress("DEPRECATION")
                alertRingtone?.streamType = android.media.AudioManager.STREAM_ALARM
            }
            
            // Android 9+ allows us to officially declare this needs to infinitely loop
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                alertRingtone?.isLooping = true
            }
            
            alertRingtone?.play()

            // Initialize hardware vibration component strictly matching array parameters
            deviceVibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            // This reads: Wait 0ms, Vibrates for 500ms, Pauses for 500ms.
            val vibrationPattern = longArrayOf(0, 500, 500)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Modern Execution: '0' dictates infinitely looping the array until cancelled manually.
                
                // Newer APIs let us assign the ALARM trait to the Vibrator too so it bypasses DND!
                val vibrationAttributes = android.os.VibrationAttributes.Builder()
                    .setUsage(android.os.VibrationAttributes.USAGE_ALARM)
                    .build()
                    
                deviceVibrator?.vibrate(VibrationEffect.createWaveform(vibrationPattern, 0), vibrationAttributes)
            } else {
                @Suppress("DEPRECATION")
                deviceVibrator?.vibrate(vibrationPattern, 0)
            }
            Log.d(TAG, "[SYSTEM ALERTS] Sensory loop successfully enabled and polling continuously.")
        } catch (hardwareException: Exception) {
            Log.e(TAG, "[CRITICAL HARDWARE FAILURE] Catastrophic rejection while instantiating alerts logic structure API: ${hardwareException.message}", hardwareException)
        }
    }

    /**
     * terminateHardwareAlerts()
     */
    private fun terminateHardwareAlerts() {
        Log.d(TAG, "[SYSTEM ALERTS] Soft terminating loops forcibly.")
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
        // we MUST reconnect the scheduling chain so the next pre-alarm still happens!
        if (!hasScheduledNext) {
            Log.w(TAG, "[EDGE CASE RECOVERY] User swiped the Notification/Activity away! Re-linking the broken schedule chain.")
            AlarmScheduler.scheduleNextAlarm(applicationContext)
        }
    }
}
