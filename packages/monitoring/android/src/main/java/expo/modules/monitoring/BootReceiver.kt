package expo.modules.monitoring

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

                // Check user preferences to see if monitoring should auto-start
                // Basic implementation checks SharedPreferences for auto_start setting
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
        // Basic preference checking implementation
        // Checks SharedPreferences for auto_start setting with default true
        // FUTURE: Could be enhanced with more sophisticated preference management
        val sharedPreferences = context.getSharedPreferences("monitoring_prefs", Context.MODE_PRIVATE)
        return sharedPreferences.getBoolean("auto_start", true)
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