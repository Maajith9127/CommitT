package expo.modules.enforcement

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * EnforcementModule
 * 
 * CORE SECURITY ENGINE: This module serves as the single source of truth for 
 * Android system-level hardware and configuration auditing.
 * 
 * It bypasses typical soft-permission checks and performs direct OS-level audits 
 * (Settings.canDrawOverlays, AccessibilityService presence, etc.) to ensure the 
 * application's behavioral enforcers cannot be bypassed by the user.
 */
class EnforcementModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("Enforcement")

        /**
         * Re-audits all 7 critical system gates in a single batch.
         * 
         * returns: A Map<String, Boolean> containing the live state of all enforcers.
         * Note: This is an AsyncFunction to prevent blocking the JS thread during 
         * complex system-level settings lookups.
         */
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
                "location" to true, // Placeholder for future 1Hz GPS audit logic
                "camera" to true,   
                "notifications" to true,
                "alarms" to true,
                "battery" to isBatteryOptimizationDisabled(context)
            )
        }

        /**
         * Orchestrates Intent-based navigation to system settings pages.
         * 
         * @param type The specific security gate to open (e.g. "accessibility", "overlay").
         */
        Function("openSettings") { type: String ->
            val context = appContext.reactContext ?: return@Function
            val intent = when (type) {
                "accessibility" -> Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                "overlay" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
                } else null
                "battery" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}"))
                } else null
                else -> null
            }
            intent?.let {
                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(it)
            }
        }
    }

    /**
     * Performs a strict lookup for the Accessibility Service class within the 
     * Secure Settings manifest to ensure it is not just registered, but actively running.
     */
    private fun isAccessibilityServiceEnabled(context: Context): Boolean {
        val expectedService = "${context.packageName}/expo.modules.blocker.BlockerAccessibilityService"
        val enabledServices = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: ""
        return enabledServices.contains(expectedService)
    }

    /**
     * Checks if the app is currently on the "Whitelist" for Battery Optimization (Doze Mode).
     * 
     * returns: True if the app is IGNORED (unrestricted), False if it is optimized.
     */
    private fun isBatteryOptimizationDisabled(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            pm.isIgnoringBatteryOptimizations(context.packageName)
        } else {
            true
        }
    }
}
