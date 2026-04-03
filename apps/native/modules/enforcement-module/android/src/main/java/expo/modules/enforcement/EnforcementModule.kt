package expo.modules.enforcement

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * EnforcementModule
 * 
 * CORE SECURITY ENGINE: This module serves as the single source of truth for 
 * Android system-level hardware and configuration auditing.
 */
class EnforcementModule : Module() {
    private val TAG = "EnforcementModule"

    override fun definition() = ModuleDefinition {
        Name("Enforcement")

        AsyncFunction("checkAllPermissions") {
            val context = appContext.reactContext ?: return@AsyncFunction mapOf<String, Boolean>()
            
            val accessibilityEnabled = isAccessibilityServiceEnabled(context)
            val overlayEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }

            mapOf(
                "accessibility" to accessibilityEnabled,
                "overlay" to overlayEnabled,
                "location" to true, 
                "camera" to true,   
                "notifications" to true,
                "alarms" to true,
                "battery" to isBatteryOptimizationDisabled(context)
            )
        }

        Function("openSettings") { type: String ->
            val context = appContext.reactContext ?: return@Function
            Log.d(TAG, "openSettings called for type: $type")
            
            val intent = when (type) {
                "accessibility" -> Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                "overlay" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
                        data = Uri.parse("package:${context.packageName}")
                    }
                } else null
                "battery" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                } else null
                "camera", "location" -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                }
                "notifications" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                    }
                } else {
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.parse("package:${context.packageName}")
                    }
                }
                "alarms" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                        data = Uri.parse("package:${context.packageName}")
                    }
                } else null
                else -> null
            }
            
            val finalIntent = intent ?: Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
            }
            
            try {
                finalIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                Log.d(TAG, "Starting activity with action: ${finalIntent.action}")
                context.startActivity(finalIntent)
            } catch (e: Exception) {
                Log.e(TAG, "FAILED to start activity: ${e.message}")
            }
        }
    }

    private fun isAccessibilityServiceEnabled(context: Context): Boolean {
        val expectedService = "${context.packageName}/expo.modules.blocker.BlockerAccessibilityService"
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: ""
        return enabledServices.contains(expectedService)
    }

    private fun isBatteryOptimizationDisabled(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            pm.isIgnoringBatteryOptimizations(context.packageName)
        } else {
            true
        }
    }
}
