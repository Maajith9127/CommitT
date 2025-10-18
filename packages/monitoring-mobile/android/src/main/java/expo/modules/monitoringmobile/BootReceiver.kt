package expo.modules.monitoringmobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED -> {
                Log.d(TAG, "Device boot completed, checking if monitoring should start")

                // TODO: Check user preferences to see if monitoring should auto-start
                // For now, we'll start the service if it was previously active
                if (shouldStartMonitoring(context)) {
                    startMonitoringService(context)
                } else {
                    Log.d(TAG, "Monitoring not enabled, skipping service start")
                }
            }
            else -> {
                Log.w(TAG, "Received unexpected intent action: ${intent.action}")
            }
        }
    }

    private fun shouldStartMonitoring(context: Context): Boolean {
        // TODO: Implement proper preference checking
        // For now, return true to always start after boot
        // In production, check SharedPreferences for user setting
        return true
    }

    private fun startMonitoringService(context: Context) {
        try {
            val serviceIntent = Intent(context, MonitoringForegroundService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
            Log.d(TAG, "MonitoringForegroundService started from boot receiver")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start monitoring service from boot receiver", e)
        }
    }
}