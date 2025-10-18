package expo.modules.monitoringmobile

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import expo.modules.monitoringmobile.database.MonitoringRepository
import expo.modules.monitoringmobile.worker.DataSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MonitoringForegroundService : Service() {

    companion object {
        private const val TAG = "MonitoringForegroundService"
        private const val MONITORING_NOTIFICATION_ID = 1001
        private const val NOTIFICATION_CHANNEL_ID = "monitoring_service_channel"
        private const val NOTIFICATION_CHANNEL_NAME = "Monitoring Service"
        private const val USAGE_STATS_POLLING_INTERVAL_MS = 30_000L // 30 seconds
    }

    private lateinit var notificationManager: NotificationManager
    private lateinit var usageStatsManager: UsageStatsManager
    private lateinit var screenStateReceiver: ScreenStateReceiver
    private lateinit var networkStateReceiver: NetworkStateReceiver
    private lateinit var repository: MonitoringRepository
    private lateinit var mainHandler: Handler
    private val usagePollingRunnable = Runnable { pollUsageStats() }
    private val serviceScope = CoroutineScope(Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "MonitoringForegroundService created")

        initializeManagers()
        registerScreenReceiver()
        registerNetworkReceiver()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "MonitoringForegroundService started")

        createNotificationChannel()
        val notification = buildPersistentNotification()

        try {
            ServiceCompat.startForeground(
                this,
                MONITORING_NOTIFICATION_ID,
                notification,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
                } else {
                    0
                }
            )
            Log.d(TAG, "Successfully started foreground service")
        } catch (e: ForegroundServiceStartNotAllowedException) {
            Log.e(TAG, "Failed to start foreground service: ${e.message}", e)
            stopSelf()
            return START_NOT_STICKY
        } catch (e: SecurityException) {
            Log.e(TAG, "Security exception starting foreground service: ${e.message}", e)
            stopSelf()
            return START_NOT_STICKY
        }

        // TODO: Start monitoring background tasks
        startMonitoringTasks()

        return START_STICKY
    }

    override fun onDestroy() {
        Log.d(TAG, "MonitoringForegroundService destroyed")
        stopUsageStatsPolling()
        unregisterScreenReceiver()
        unregisterNetworkReceiver()
        // TODO: Implement scheduleRestartIfNeeded()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun initializeManagers() {
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        repository = MonitoringRepository(this)
        screenStateReceiver = ScreenStateReceiver(repository)
        networkStateReceiver = NetworkStateReceiver(repository)
        mainHandler = Handler(Looper.getMainLooper())

        // Schedule periodic data sync
        DataSyncWorker.schedulePeriodicSync(this)
    }

    private fun registerScreenReceiver() {
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        registerReceiver(screenStateReceiver, filter)
        Log.d(TAG, "Screen state receiver registered")
    }

    private fun registerNetworkReceiver() {
        val filter = IntentFilter().apply {
            addAction(android.net.ConnectivityManager.CONNECTIVITY_ACTION)
        }
        registerReceiver(networkStateReceiver, filter)
        Log.d(TAG, "Network state receiver registered")
    }

    private fun unregisterScreenReceiver() {
        try {
            unregisterReceiver(screenStateReceiver)
            Log.d(TAG, "Screen state receiver was not registered")
        } catch (e: IllegalArgumentException) {
            Log.w(TAG, "Screen state receiver was not registered")
        }
    }

    private fun unregisterNetworkReceiver() {
        try {
            unregisterReceiver(networkStateReceiver)
            Log.d(TAG, "Network state receiver unregistered")
        } catch (e: IllegalArgumentException) {
            Log.w(TAG, "Network state receiver was not registered")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                NOTIFICATION_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Persistent notification for usage monitoring service"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
            Log.d(TAG, "Notification channel created")
        }
    }

    private fun buildPersistentNotification(): Notification {
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Monitoring Active")
            .setContentText("Tracking usage and events in background")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun startMonitoringTasks() {
        Log.d(TAG, "Starting monitoring tasks")

        // Start usage stats polling if permission is granted
        if (hasUsageStatsPermission()) {
            startUsageStatsPolling()
            Log.d(TAG, "Usage stats monitoring started")
        } else {
            Log.w(TAG, "Usage stats permission not granted - monitoring disabled")
        }

        // Screen monitoring is already active via the receiver
        Log.d(TAG, "Screen state monitoring active")

        // Network monitoring is already active via the receiver
        Log.d(TAG, "Network state monitoring active")
    }

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                packageName
            )
        }
        return mode == android.app.AppOpsManager.MODE_ALLOWED
    }

    private fun startUsageStatsPolling() {
        // Poll immediately, then schedule recurring polls
        pollUsageStats()
        mainHandler.postDelayed(usagePollingRunnable, USAGE_STATS_POLLING_INTERVAL_MS)
    }

    private fun stopUsageStatsPolling() {
        mainHandler.removeCallbacks(usagePollingRunnable)
    }

    private fun pollUsageStats() {
        try {
            val currentTime = System.currentTimeMillis()
            val oneHourAgo = currentTime - (60 * 60 * 1000) // Last hour

            // Query usage events
            val usageEvents = usageStatsManager.queryEvents(oneHourAgo, currentTime)
            val event = UsageEvents.Event()

            var eventCount = 0
            while (usageEvents.hasNextEvent()) {
                usageEvents.getNextEvent(event)
                processUsageEvent(event)
                eventCount++
            }

            Log.d(TAG, "Polled $eventCount usage events")

            // Schedule next poll
            mainHandler.postDelayed(usagePollingRunnable, USAGE_STATS_POLLING_INTERVAL_MS)

        } catch (e: Exception) {
            Log.e(TAG, "Error polling usage stats", e)
            // Continue polling despite errors
            mainHandler.postDelayed(usagePollingRunnable, USAGE_STATS_POLLING_INTERVAL_MS)
        }
    }

    private fun processUsageEvent(event: UsageEvents.Event) {
        serviceScope.launch {
            try {
                when (event.eventType) {
                    UsageEvents.Event.ACTIVITY_RESUMED -> {
                        Log.d(TAG, "App resumed: ${event.packageName} at ${event.timeStamp}")
                        repository.startAppSession(event.packageName)
                    }
                    UsageEvents.Event.ACTIVITY_PAUSED -> {
                        Log.d(TAG, "App paused: ${event.packageName} at ${event.timeStamp}")
                        // Note: We don't end session on pause, only on stop
                    }
                    UsageEvents.Event.ACTIVITY_STOPPED -> {
                        Log.d(TAG, "App stopped: ${event.packageName} at ${event.timeStamp}")
                        repository.endAppSession(event.packageName)
                    }
                    else -> {
                        Log.v(TAG, "Other usage event: ${event.eventType} for ${event.packageName}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing usage event", e)
            }
        }
    }
}